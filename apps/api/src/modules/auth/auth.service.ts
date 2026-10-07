import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse, UserDto } from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { isoInstant } from '../../common/serialize';
import { AuditService } from '../audit/audit.service';
import { hashPassword, randomToken, sha256, verifyPassword } from './password';

interface Meta {
  ipAddress: string | null;
  userAgent: string | null;
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserDto['role'];
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export function toUserDto(user: UserRow): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt ? isoInstant(user.lastLoginAt) : null,
    createdAt: isoInstant(user.createdAt),
  };
}

export interface SessionResult extends AuthResponse {
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Autenticação: senha com bcrypt, access token JWT curto e refresh token
 * opaco (somente o hash SHA-256 é salvo), rotacionado a cada uso e com
 * detecção de reutilização (revoga todas as sessões do usuário).
 */
@Injectable()
export class AuthService {
  // Hash fixo usado para equalizar o tempo de resposta quando o e-mail não existe
  private readonly dummyHash = hashPassword(randomToken(16));

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string, meta: Meta): Promise<SessionResult> {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, await this.dummyHash);
    if (!user || !valid || !user.active) {
      void this.audit.log({
        userId: user?.id ?? null,
        entity: 'auth',
        action: 'auth.login_failed',
        metadata: { email },
        ...meta,
      });
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }
    const updated = await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    void this.audit.log({
      userId: user.id,
      entity: 'auth',
      entityId: user.id,
      action: 'auth.login',
      ...meta,
    });
    return this.issueSession(updated, meta);
  }

  private async issueSession(
    user: UserRow,
    meta: Meta,
    replacing?: string,
  ): Promise<SessionResult> {
    const refreshToken = randomToken();
    const refreshExpiresAt = new Date(Date.now() + this.config.auth.refreshTtlDays * 86_400_000);
    const created = await this.db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });
    if (replacing) {
      await this.db.refreshToken.update({
        where: { id: replacing },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      name: user.name,
    });
    return {
      accessToken,
      expiresIn: this.config.auth.accessTtlSeconds,
      user: toUserDto(user),
      refreshToken,
      refreshExpiresAt,
    };
  }

  async refresh(rawToken: string | undefined, meta: Meta): Promise<SessionResult> {
    if (!rawToken) throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    const stored = await this.db.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    if (stored.revokedAt) {
      // Reuso de token já rotacionado: possível vazamento -> encerra todas as sessões
      await this.db.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      void this.audit.log({
        userId: stored.userId,
        entity: 'auth',
        action: 'auth.refresh_reuse_detected',
        ...meta,
      });
      throw new UnauthorizedException('Sessão encerrada por segurança. Entre novamente.');
    }
    if (stored.expiresAt < new Date() || !stored.user.active)
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    return this.issueSession(stored.user, meta, stored.id);
  }

  async logout(rawToken: string | undefined, meta: Meta): Promise<void> {
    if (!rawToken) return;
    const stored = await this.db.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (!stored) return;
    await this.db.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: stored.revokedAt ?? new Date() },
    });
    void this.audit.log({ userId: stored.userId, entity: 'auth', action: 'auth.logout', ...meta });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    keepTokenHash?: string,
  ): Promise<void> {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await this.db.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepTokenHash ? { NOT: { tokenHash: keepTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }
}

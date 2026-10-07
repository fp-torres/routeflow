import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthResponse, UserDto } from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { isoInstant } from '../../common/serialize';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
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
  avatarKey: string | null;
};

/** Sessão temporária ("Lembrar acesso" desmarcado): o cookie some ao fechar o navegador e, no servidor, expira após 12 h sem uso. */
const TEMPORARY_SESSION_MS = 12 * 3600 * 1000;
/** Abas abertas juntas (ex.: navegador restaurando a sessão) renovam ao mesmo tempo: tolerância para não derrubar o acesso. */
const CONCURRENT_REFRESH_GRACE_MS = 20_000;

export function toUserDto(user: UserRow, signAvatar?: (key: string) => string): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt ? isoInstant(user.lastLoginAt) : null,
    createdAt: isoInstant(user.createdAt),
    avatarUrl: user.avatarKey && signAvatar ? signAvatar(user.avatarKey) : null,
  };
}

export interface SessionResult extends AuthResponse {
  refreshToken: string;
  refreshExpiresAt: Date;
  /** true = "Lembrar acesso" (cookie com validade); false = cookie de sessão do navegador */
  persistent: boolean;
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
    private readonly storage: StorageService,
  ) {}

  /** URL assinada da foto de perfil (a chave muda a cada nova foto, então o cache nunca fica velho). */
  readonly signAvatar = (key: string) => this.storage.signedUrl(key, { fileName: 'avatar.webp' });

  async login(
    email: string,
    password: string,
    meta: Meta,
    remember = false,
  ): Promise<SessionResult> {
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
      metadata: { remember },
      ...meta,
    });
    return this.issueSession(updated, meta, { persistent: remember });
  }

  private async issueSession(
    user: UserRow,
    meta: Meta,
    { persistent, replacing }: { persistent: boolean; replacing?: string },
  ): Promise<SessionResult> {
    const refreshToken = randomToken();
    const refreshExpiresAt = new Date(
      Date.now() +
        (persistent ? this.config.auth.refreshTtlDays * 86_400_000 : TEMPORARY_SESSION_MS),
    );
    const created = await this.db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        persistent,
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
      user: toUserDto(user, this.signAvatar),
      refreshToken,
      refreshExpiresAt,
      persistent,
    };
  }

  async refresh(rawToken: string | undefined, meta: Meta): Promise<SessionResult> {
    if (!rawToken) throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    const stored = await this.db.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    if (stored.revokedAt && stored.replacedById) {
      const concurrent = Date.now() - stored.revokedAt.getTime() < CONCURRENT_REFRESH_GRACE_MS;
      if (concurrent && stored.user.active && stored.expiresAt > new Date()) {
        // outra aba acabou de renovar com o mesmo token: nova sessão, sem derrubar as demais
        return this.issueSession(stored.user, meta, { persistent: stored.persistent });
      }
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
    // Encerrada por "Sair", troca de senha ou administrador: apenas pede login
    if (stored.revokedAt) throw new UnauthorizedException('Sessão encerrada. Entre novamente.');
    if (stored.expiresAt < new Date() || !stored.user.active)
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    return this.issueSession(stored.user, meta, {
      persistent: stored.persistent,
      replacing: stored.id,
    });
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

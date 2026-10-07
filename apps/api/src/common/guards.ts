import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@routeflow/types';
import { DB } from '../database/database.module';
import type { Db } from '../database/prisma.types';
import type { AppRequest } from './auth-user';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(DB) private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AppRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7));
    } catch {
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }
    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user || !user.active) throw new UnauthorizedException('Usuário inativo ou inexistente.');
    request.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (!request.user) throw new UnauthorizedException();
    if (request.user.role === 'ADMIN' || roles.includes(request.user.role)) return true;
    throw new ForbiddenException('Você não tem permissão para esta ação.');
  }
}

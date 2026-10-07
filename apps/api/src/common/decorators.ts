import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@routeflow/types';
import type { AppRequest, AuthUser } from './auth-user';

export const IS_PUBLIC_KEY = 'routeflow:isPublic';
export const ROLES_KEY = 'routeflow:roles';

/** Rota acessível sem login (login, refresh, health, arquivos assinados, painel público). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restringe a rota a determinados papéis (ADMIN sempre tem acesso). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest<AppRequest>().user as AuthUser;
  },
);

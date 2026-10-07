import type { Request } from 'express';
import type { UserRole } from '@routeflow/types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AppRequest extends Request {
  user?: AuthUser;
  requestId?: string;
}

/** ADMIN e MANAGER enxergam toda a operação; EMPLOYEE apenas os próprios dados. */
export function canSeeAll(user: AuthUser): boolean {
  return user.role === 'ADMIN' || user.role === 'MANAGER';
}

/** Funcionário dono dos dados de "Meu dia" (dashboard, agenda, rotas). */
export function resolveEmployeeId(user: AuthUser, requested?: string | null): string {
  return requested && canSeeAll(user) ? requested : user.id;
}

/** Filtro de funcionário para listagens/relatórios (undefined = todos). */
export function employeeFilter(user: AuthUser, requested?: string | null): string | undefined {
  if (!canSeeAll(user)) return user.id;
  return requested ?? undefined;
}

export function requestMeta(req: AppRequest): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress: (req.ip ?? '').toString().slice(0, 64) || null,
    userAgent: (req.headers['user-agent'] ?? '').toString().slice(0, 255) || null,
  };
}

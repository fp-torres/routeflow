/**
 * Enums de domínio do RouteFlow.
 * Os valores são idênticos aos enums dos schemas Prisma (PostgreSQL e MySQL),
 * permitindo que a aplicação não dependa do Prisma Client de um provider específico.
 */
function values<T extends Record<string, string>>(obj: T) {
  return Object.values(obj) as [T[keyof T], ...T[keyof T][]];
}

export const UserRole = { EMPLOYEE: 'EMPLOYEE', MANAGER: 'MANAGER', ADMIN: 'ADMIN' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const USER_ROLES = values(UserRole);

export const VisitStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  NOT_COMPLETED: 'NOT_COMPLETED',
  RESCHEDULED: 'RESCHEDULED',
  CANCELLED: 'CANCELLED',
  BLOCKED: 'BLOCKED',
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];
export const VISIT_STATUSES = values(VisitStatus);

export const RouteStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type RouteStatus = (typeof RouteStatus)[keyof typeof RouteStatus];
export const ROUTE_STATUSES = values(RouteStatus);

export const TransportMode = {
  WALKING: 'WALKING',
  BUS: 'BUS',
  METRO: 'METRO',
  TRAIN: 'TRAIN',
  TRANSIT: 'TRANSIT',
  DRIVING: 'DRIVING',
  TAXI: 'TAXI',
  RIDE_APP: 'RIDE_APP',
  BICYCLE: 'BICYCLE',
  OTHER: 'OTHER',
} as const;
export type TransportMode = (typeof TransportMode)[keyof typeof TransportMode];
export const TRANSPORT_MODES = values(TransportMode);

export const TransportType = {
  BUS: 'BUS',
  METRO: 'METRO',
  TRAIN: 'TRAIN',
  INTEGRATION: 'INTEGRATION',
  TAXI: 'TAXI',
  RIDE_APP: 'RIDE_APP',
  OTHER: 'OTHER',
} as const;
export type TransportType = (typeof TransportType)[keyof typeof TransportType];
export const TRANSPORT_TYPES = values(TransportType);

export const PhotoCategory = {
  FACADE: 'FACADE',
  DISPLAY: 'DISPLAY',
  PRODUCT: 'PRODUCT',
  MATERIAL: 'MATERIAL',
  RECEIPT: 'RECEIPT',
  OTHER: 'OTHER',
} as const;
export type PhotoCategory = (typeof PhotoCategory)[keyof typeof PhotoCategory];
export const PHOTO_CATEGORIES = values(PhotoCategory);

export const AuthorizationStatus = { ACTIVE: 'ACTIVE', REVOKED: 'REVOKED' } as const;
export type AuthorizationStatus = (typeof AuthorizationStatus)[keyof typeof AuthorizationStatus];
export const AUTHORIZATION_STATUSES = values(AuthorizationStatus);

/** Situação calculada de uma carta de autorização em relação à data de hoje. */
export const AuthorizationValidity = {
  /** A loja não exige carta (regra da rede ou da loja). */
  NOT_REQUIRED: 'NOT_REQUIRED',
  VALID: 'VALID',
  EXPIRING: 'EXPIRING',
  CRITICAL: 'CRITICAL',
  EXPIRED: 'EXPIRED',
  NOT_YET_VALID: 'NOT_YET_VALID',
  NO_EXPIRATION: 'NO_EXPIRATION',
  REVOKED: 'REVOKED',
} as const;
export type AuthorizationValidity =
  (typeof AuthorizationValidity)[keyof typeof AuthorizationValidity];
export const AUTHORIZATION_VALIDITIES = values(AuthorizationValidity);

export const NotificationType = {
  AUTHORIZATION_EXPIRING: 'AUTHORIZATION_EXPIRING',
  AUTHORIZATION_EXPIRED: 'AUTHORIZATION_EXPIRED',
  VISIT_UPCOMING: 'VISIT_UPCOMING',
  VISIT_PENDING: 'VISIT_PENDING',
  ROUTE_CHANGED: 'ROUTE_CHANGED',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NOTIFICATION_TYPES = values(NotificationType);

export const RouteTemplateKind = {
  STANDARD: 'STANDARD',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
} as const;
export type RouteTemplateKind = (typeof RouteTemplateKind)[keyof typeof RouteTemplateKind];
export const ROUTE_TEMPLATE_KINDS = values(RouteTemplateKind);

export const VisitActivityType = {
  NOTE: 'NOTE',
  ACTIVITY: 'ACTIVITY',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PHOTO: 'PHOTO',
  SYSTEM: 'SYSTEM',
} as const;
export type VisitActivityType = (typeof VisitActivityType)[keyof typeof VisitActivityType];
export const VISIT_ACTIVITY_TYPES = values(VisitActivityType);

/** Escopos que um link público de visualização pode liberar. */
export const SharedScope = {
  VISITS: 'visits',
  PHOTOS: 'photos',
  AUTHORIZATIONS: 'authorizations',
  EXPENSES: 'expenses',
  ROUTES: 'routes',
} as const;
export type SharedScope = (typeof SharedScope)[keyof typeof SharedScope];
export const SHARED_SCOPES = values(SharedScope);

export const ReportType = {
  VISITS: 'visits',
  ROUTES: 'routes',
  EXPENSES: 'expenses',
  AUTHORIZATIONS: 'authorizations',
  HISTORY: 'history',
  CONSOLIDATED: 'consolidated',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];
export const REPORT_TYPES = values(ReportType);

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'critical';

/** Etapas de um itinerário de transporte público. */
export const TransitStepMode = {
  WALK: 'WALK',
  BUS: 'BUS',
  METRO: 'METRO',
  TRAIN: 'TRAIN',
  TRAM: 'TRAM',
  FERRY: 'FERRY',
  OTHER: 'OTHER',
} as const;
export type TransitStepMode = (typeof TransitStepMode)[keyof typeof TransitStepMode];

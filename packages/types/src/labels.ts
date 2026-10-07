import type {
  AuthorizationValidity,
  NotificationType,
  PhotoCategory,
  ReportType,
  RouteStatus,
  RouteTemplateKind,
  SharedScope,
  Tone,
  TransportMode,
  TransportType,
  UserRole,
  VisitActivityType,
  VisitStatus,
} from './enums';

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  EMPLOYEE: 'Funcionário',
  MANAGER: 'Gestor',
  ADMIN: 'Administrador',
};

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  NOT_COMPLETED: 'Não realizada',
  RESCHEDULED: 'Reagendada',
  CANCELLED: 'Cancelada',
  BLOCKED: 'Bloqueada',
};

export const VISIT_STATUS_TONE: Record<VisitStatus, Tone> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  NOT_COMPLETED: 'danger',
  RESCHEDULED: 'warning',
  CANCELLED: 'neutral',
  BLOCKED: 'critical',
};

/** Status da planilha original (aba Config) -> enum do sistema. */
export const SPREADSHEET_STATUS_MAP: Record<string, VisitStatus> = {
  pendente: 'PENDING',
  'em andamento': 'IN_PROGRESS',
  concluido: 'COMPLETED',
  concluida: 'COMPLETED',
  'nao realizado': 'NOT_COMPLETED',
  'nao realizada': 'NOT_COMPLETED',
  reagendado: 'RESCHEDULED',
  reagendada: 'RESCHEDULED',
  cancelado: 'CANCELLED',
  cancelada: 'CANCELLED',
  bloqueado: 'BLOCKED',
  bloqueada: 'BLOCKED',
};

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  PLANNED: 'Planejada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const TRANSPORT_MODE_LABEL: Record<TransportMode, string> = {
  WALKING: 'Caminhada',
  BUS: 'Ônibus',
  METRO: 'Metrô',
  TRAIN: 'Trem',
  TRANSIT: 'Transporte público',
  DRIVING: 'Carro',
  TAXI: 'Táxi',
  RIDE_APP: 'Aplicativo',
  BICYCLE: 'Bicicleta',
  OTHER: 'Outro',
};

export const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  BUS: 'Ônibus',
  METRO: 'Metrô',
  TRAIN: 'Trem',
  INTEGRATION: 'Integração',
  TAXI: 'Táxi',
  RIDE_APP: 'Aplicativo',
  OTHER: 'Outros',
};

export const PHOTO_CATEGORY_LABEL: Record<PhotoCategory, string> = {
  FACADE: 'Fachada',
  DISPLAY: 'Exposição',
  PRODUCT: 'Produto',
  MATERIAL: 'Material',
  RECEIPT: 'Comprovante',
  OTHER: 'Outro',
};

export const AUTHORIZATION_VALIDITY_LABEL: Record<AuthorizationValidity, string> = {
  VALID: 'Válida',
  EXPIRING: 'Vence em breve',
  CRITICAL: 'Vencimento próximo',
  EXPIRED: 'Expirada',
  NOT_YET_VALID: 'Ainda não vigente',
  NO_EXPIRATION: 'Sem vencimento',
  REVOKED: 'Revogada',
};

export const AUTHORIZATION_VALIDITY_TONE: Record<AuthorizationValidity, Tone> = {
  VALID: 'success',
  EXPIRING: 'warning',
  CRITICAL: 'danger',
  EXPIRED: 'critical',
  NOT_YET_VALID: 'info',
  NO_EXPIRATION: 'success',
  REVOKED: 'neutral',
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  AUTHORIZATION_EXPIRING: 'Autorização vencendo',
  AUTHORIZATION_EXPIRED: 'Autorização vencida',
  VISIT_UPCOMING: 'Visita próxima',
  VISIT_PENDING: 'Visita pendente',
  ROUTE_CHANGED: 'Rota alterada',
  SYSTEM: 'Sistema',
};

export const ROUTE_TEMPLATE_KIND_LABEL: Record<RouteTemplateKind, string> = {
  STANDARD: 'Roteiro padrão (semanal fixo)',
  WEEKLY: 'Roteiro semanal (ciclo de semanas)',
  MONTHLY: 'Roteiro mensal (semana do mês)',
};

export const VISIT_ACTIVITY_TYPE_LABEL: Record<VisitActivityType, string> = {
  NOTE: 'Observação',
  ACTIVITY: 'Atividade',
  STATUS_CHANGE: 'Status',
  PHOTO: 'Foto',
  SYSTEM: 'Sistema',
};

export const SHARED_SCOPE_LABEL: Record<SharedScope, string> = {
  visits: 'Visitas e indicadores',
  photos: 'Fotos das visitas',
  authorizations: 'Autorizações',
  expenses: 'Despesas',
  routes: 'Rotas',
};

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  visits: 'Visitas',
  routes: 'Rotas',
  expenses: 'Despesas',
  authorizations: 'Autorizações',
  history: 'Histórico',
  consolidated: 'Consolidado',
};

export const WEEKDAY_LABEL: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo',
};

export const WEEKDAY_SHORT_LABEL: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  7: 'Dom',
};

export const MONTH_LABEL = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

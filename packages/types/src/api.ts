/**
 * Formatos de resposta da API REST (contrato entre apps/api e apps/web).
 * Datas de negócio: "YYYY-MM-DD". Instantes: ISO 8601 (UTC). Valores: número em reais.
 */
import type {
  AuthorizationStatus,
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
  TransitStepMode,
} from './enums';
import type { IsoDate } from './domain/dates';
import type { Holiday } from './domain/holidays';
import type { FullRouteLink, LegLink } from './domain/maps';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  errors?: Array<{ path: string; message: string }>;
  requestId?: string;
}

export interface UserRef {
  id: string;
  name: string;
}

export interface UserDto extends UserRef {
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  /** Foto de perfil (URL assinada, muda a cada nova foto); null = usar as iniciais */
  avatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface StoreAuthorizationInfo {
  /** A loja exige carta (regra da rede ou da loja)? */
  required: boolean;
  validity: AuthorizationValidity | null;
  daysLeft: number | null;
  hasValid: boolean;
  letterCount: number;
}

export interface StoreRef {
  id: string;
  code: string;
  name: string;
  network: string;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  fullAddress: string;
  mapsUrl: string;
}

export interface StoreDto extends StoreRef {
  zipCode: string | null;
  observations: string | null;
  active: boolean;
  geocodeSource: string | null;
  geocodeStatus: string | null;
  /** null = segue a regra da rede */
  authorizationRequired: boolean | null;
  createdAt: string;
  updatedAt: string;
  authorization: StoreAuthorizationInfo | null;
}

export interface StoreDetailDto extends StoreDto {
  stats: { totalVisits: number; completedVisits: number; lastVisitDate: IsoDate | null };
  recentVisits: VisitSummaryDto[];
  recentPhotos: Array<PhotoDto & { visitId: string; scheduledDate: IsoDate }>;
  letters: AuthorizationLetterDto[];
}

export interface PhotoDto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  category: PhotoCategory;
  caption: string | null;
  createdAt: string;
}

export interface VisitSummaryDto {
  id: string;
  scheduledDate: IsoDate;
  order: number;
  status: VisitStatus;
  startedAt: string | null;
  finishedAt: string | null;
  notes: string | null;
  routeId: string | null;
  photoCount: number;
  store: StoreRef;
  employee: UserRef;
  authorization: StoreAuthorizationInfo | null;
}

export interface VisitActivityDto {
  id: string;
  type: VisitActivityType;
  description: string;
  createdAt: string;
  user: UserRef | null;
}

export interface VisitDetailDto extends VisitSummaryDto {
  statusReason: string | null;
  latitudeAtStart: number | null;
  longitudeAtStart: number | null;
  latitudeAtFinish: number | null;
  longitudeAtFinish: number | null;
  photos: PhotoDto[];
  activities: VisitActivityDto[];
  letters: AuthorizationLetterDto[];
  expenses: ExpenseDto[];
  rescheduledFrom: { id: string; scheduledDate: IsoDate } | null;
  rescheduledTo: { id: string; scheduledDate: IsoDate } | null;
  nextVisitId: string | null;
  blockWithoutAuthorization: boolean;
  activityPresets: string[];
}

export interface VisitActionResult {
  visit: VisitDetailDto;
  warning: string | null;
}

export interface LetterStoreDto {
  id: string;
  code: string;
  name: string;
  network: string;
  neighborhood: string | null;
  /** Datas da ação para a loja (lidas da carta); vazio = todo o período de vigência */
  dates: IsoDate[];
}

export interface AuthorizationLetterDto {
  id: string;
  network: string | null;
  stores: LetterStoreDto[];
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  issueDate: IsoDate | null;
  validFrom: IsoDate | null;
  expirationDate: IsoDate | null;
  status: AuthorizationStatus;
  notes: string | null;
  validity: AuthorizationValidity;
  daysLeft: number | null;
  url: string;
  downloadUrl: string;
  uploadedBy: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface LetterHistoryDto {
  id: string;
  action: string;
  fileName: string | null;
  url: string | null;
  details: Record<string, unknown> | null;
  user: UserRef | null;
  createdAt: string;
}

export interface RouteVisitRef {
  id: string;
  status: VisitStatus;
  startedAt: string | null;
  finishedAt: string | null;
  photoCount: number;
}

export interface RouteStopDto {
  id: string;
  order: number;
  store: StoreRef;
  visit: RouteVisitRef | null;
  authorization: StoreAuthorizationInfo | null;
  travelDistance: number | null;
  travelDuration: number | null;
  transportMode: TransportMode | null;
  travelCost: number | null;
  travelSummary: string | null;
}

export interface RouteSummaryDto {
  id: string;
  date: IsoDate;
  status: RouteStatus;
  region: string | null;
  stopCount: number;
  completedCount: number;
  pendingCount: number;
  estimatedDistance: number | null;
  estimatedDuration: number | null;
  estimatedTransportCost: number | null;
  actualTransportCost: number | null;
  employee: UserRef;
  holiday: Holiday | null;
}

export interface TransitStepDto {
  mode: TransitStepMode;
  /** Linha (ex.: 422, Linha 1, BRT TransOeste) */
  line: string | null;
  headsign: string | null;
  from: string | null;
  to: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  stopCount: number | null;
}

export interface RouteLegDto {
  index: number;
  fromLabel: string;
  toLabel: string;
  mode: TransportMode | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  cost: number | null;
  summary: string | null;
  /** Etapas do itinerário (caminhada, ônibus, metrô, trem...), quando calculado por um provedor de transporte */
  steps: TransitStepDto[] | null;
  source: 'google' | 'estimate' | null;
  transitUrl: string;
}

export interface RouteDetailDto extends RouteSummaryDto {
  startAddress: string;
  startLatitude: number | null;
  startLongitude: number | null;
  notes: string | null;
  stops: RouteStopDto[];
  legs: RouteLegDto[];
  fullRouteLinks: FullRouteLink[];
  legLinks: LegLink[];
  legsProvider: string | null;
  legsComputedAt: string | null;
  canOptimize: boolean;
  optimizeHint: string | null;
  fullRouteTravelMode: 'driving' | 'walking';
  optimizedAt: string | null;
  /** Próxima loja pendente: abre o transporte público a partir da localização atual */
  nextStop: { stopId: string; visitId: string; storeName: string; transitUrl: string } | null;
}

export interface OptimizationPreviewDto {
  applied: boolean;
  canOptimize: boolean;
  reason: string | null;
  currentOrder: string[];
  proposedOrder: string[];
  currentDistanceKm: number | null;
  proposedDistanceKm: number | null;
  improvementKm: number | null;
  currentDurationSeconds: number | null;
  proposedDurationSeconds: number | null;
  improvementSeconds: number | null;
  /** Paradas já iniciadas/finalizadas que mantêm a posição */
  fixedStops: number;
  method: 'exact' | 'heuristic' | null;
  source: 'google' | 'estimate' | null;
  missingCoordinates: string[];
}

export interface RouteTemplateStopDto {
  id: string;
  order: number;
  weekday: number;
  weekIndex: number;
  store: StoreRef;
}

export interface RouteTemplateDto {
  id: string;
  name: string;
  kind: RouteTemplateKind;
  cycleWeeks: number;
  anchorDate: IsoDate | null;
  validFrom: IsoDate | null;
  validUntil: IsoDate | null;
  active: boolean;
  notes: string | null;
  stops: RouteTemplateStopDto[];
}

export interface AgendaVisitDto {
  id: string;
  status: VisitStatus;
  order: number;
  store: {
    id: string;
    code: string;
    name: string;
    network: string;
    neighborhood: string | null;
    region: string | null;
  };
}

export interface AgendaDayDto {
  date: IsoDate;
  weekday: number;
  holiday: Holiday | null;
  routeId: string | null;
  regions: string[];
  visits: AgendaVisitDto[];
  /** Visitas previstas pelo roteiro (ainda não geradas) */
  planned: Array<{
    storeId: string;
    code: string;
    name: string;
    neighborhood: string | null;
    region: string | null;
  }>;
  total: number;
  completed: number;
  progress: number;
}

export interface AgendaResponse {
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
  days: AgendaDayDto[];
}

export interface ExpenseDto {
  id: string;
  date: IsoDate;
  type: TransportType;
  description: string | null;
  value: number;
  estimatedValue: number | null;
  actualValue: number | null;
  routeId: string | null;
  visitId: string | null;
  visitStoreName: string | null;
  employee: UserRef;
  createdAt: string;
}

export interface ExpenseSummaryDto {
  referenceDate: IsoDate;
  day: number;
  week: number;
  month: number;
  monthCompletedVisits: number;
  averagePerVisit: number | null;
  byType: Array<{ type: TransportType; total: number }>;
  byDay: Array<{ date: IsoDate; total: number }>;
}

export interface TimelineItem {
  id: string;
  kind: VisitActivityType;
  title: string;
  description: string;
  createdAt: string;
  link: string | null;
}

export interface DashboardAlert {
  id: string;
  tone: Tone;
  title: string;
  description: string;
  link: string | null;
}

export interface AuthorizationCounters {
  valid: number;
  expiring: number;
  critical: number;
  expired: number;
  withoutLetter: number;
  notRequired: number;
}

export interface ExpiringLetterItem {
  letterId: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  expirationDate: IsoDate | null;
  daysLeft: number | null;
  validity: AuthorizationValidity;
}

export interface ChartPoint {
  key: string;
  label: string;
  total: number;
  completed?: number;
}

export interface DashboardDto {
  user: UserRef;
  today: IsoDate;
  holiday: Holiday | null;
  todayRoute: {
    id: string;
    region: string | null;
    estimatedDistance: number | null;
    estimatedDuration: number | null;
    estimatedTransportCost: number | null;
    stops: Array<{
      order: number;
      visitId: string | null;
      storeId: string;
      code: string;
      name: string;
      neighborhood: string | null;
      status: VisitStatus | null;
    }>;
  } | null;
  counts: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    notCompleted: number;
    rescheduled: number;
  };
  progress: number;
  nextVisit: VisitSummaryDto | null;
  expenses: { today: number; month: number; estimatedToday: number | null };
  distance: { todayMeters: number | null; monthMeters: number | null };
  authorizations: AuthorizationCounters & {
    expiringSoon: ExpiringLetterItem[];
    expiringIn7Days: number;
  };
  todayStoresWithoutValidAuthorization: Array<{ storeId: string; code: string; name: string }>;
  alerts: DashboardAlert[];
  charts: {
    visitsByDay: ChartPoint[];
    visitsByRegion: ChartPoint[];
    expensesByWeek: ChartPoint[];
    statusDistribution: Array<{ status: VisitStatus; label: string; total: number }>;
  };
  timeline: TimelineItem[];
  faresNeedReview: boolean;
}

export interface ManagerMetricsDto {
  from: IsoDate;
  to: IsoDate;
  totals: Record<
    | 'scheduled'
    | 'completed'
    | 'pending'
    | 'inProgress'
    | 'notCompleted'
    | 'rescheduled'
    | 'cancelled'
    | 'blocked',
    number
  >;
  completionRate: number;
  averageVisitsPerDay: number;
  workingDays: number;
  byNetwork: ChartPoint[];
  byRegion: ChartPoint[];
  byDay: ChartPoint[];
  byStatus: Array<{ status: VisitStatus; label: string; total: number }>;
  expenses: {
    total: number;
    perVisit: number | null;
    byType: Array<{ type: TransportType; total: number }>;
  };
  distance: { totalMeters: number | null; routesWithEstimate: number; routes: number };
  authorizations: AuthorizationCounters & { expiringSoon: ExpiringLetterItem[] };
}

export interface PublicPanelDto {
  label: string;
  scope: SharedScope[];
  expiresAt: string | null;
  generatedAt: string;
  companyName: string;
  metrics: ManagerMetricsDto;
  recentVisits: VisitSummaryDto[];
}

export interface PublicVisitDetailDto extends VisitSummaryDto {
  photos: PhotoDto[];
  activities: VisitActivityDto[];
  statusReason: string | null;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface SharedAccessDto {
  id: string;
  label: string;
  tokenPreview: string;
  /** Link completo (disponível para links criados a partir desta versão) */
  url: string | null;
  scope: SharedScope[];
  expiresAt: string | null;
  active: boolean;
  revokedAt: string | null;
  lastAccessAt: string | null;
  accessCount: number;
  createdAt: string;
}

export interface SharedAccessCreatedDto extends SharedAccessDto {
  token: string;
  url: string;
}

export interface FareDto {
  id: string;
  type: TransportType;
  operator: string;
  description: string | null;
  value: number;
  effectiveFrom: IsoDate;
  effectiveUntil: IsoDate | null;
  active: boolean;
  verified: boolean;
}

export interface HomeAddressDto {
  id: string;
  address: string;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

export interface AuditLogDto {
  id: string;
  entity: string;
  entityId: string | null;
  action: string;
  metadata: unknown;
  user: UserRef | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ImportIssue {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  sheet?: string;
  row?: number;
}

export interface ImportEntityCount {
  created: number;
  updated: number;
  unchanged: number;
}

export interface ImportResultDto {
  dryRun: boolean;
  fileName: string;
  fileHash: string;
  status: 'SUCCESS' | 'SUCCESS_WITH_WARNINGS' | 'FAILED';
  summary: Record<string, ImportEntityCount>;
  issues: ImportIssue[];
  importRunId: string | null;
}

export interface ProvidersInfoDto {
  route: { provider: string; configured: boolean; description: string };
  geocoding: { provider: string; configured: boolean; description: string };
  storage: { driver: string };
  storesWithoutCoordinates: number;
  homeHasCoordinates: boolean;
}

export interface ReportPreviewDto {
  type: ReportType;
  title: string;
  from: IsoDate;
  to: IsoDate;
  kpis: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; rows: number }>;
}

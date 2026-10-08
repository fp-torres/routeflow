import { z } from 'zod';

declare const UserRole: {
    readonly EMPLOYEE: "EMPLOYEE";
    readonly MANAGER: "MANAGER";
    readonly ADMIN: "ADMIN";
};
type UserRole = (typeof UserRole)[keyof typeof UserRole];
declare const USER_ROLES: ["EMPLOYEE" | "MANAGER" | "ADMIN", ...("EMPLOYEE" | "MANAGER" | "ADMIN")[]];
declare const VisitStatus: {
    readonly PENDING: "PENDING";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
    readonly NOT_COMPLETED: "NOT_COMPLETED";
    readonly RESCHEDULED: "RESCHEDULED";
    readonly CANCELLED: "CANCELLED";
    readonly BLOCKED: "BLOCKED";
};
type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];
declare const VISIT_STATUSES: ["PENDING" | "IN_PROGRESS" | "COMPLETED" | "NOT_COMPLETED" | "RESCHEDULED" | "CANCELLED" | "BLOCKED", ...("PENDING" | "IN_PROGRESS" | "COMPLETED" | "NOT_COMPLETED" | "RESCHEDULED" | "CANCELLED" | "BLOCKED")[]];
declare const RouteStatus: {
    readonly PLANNED: "PLANNED";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
};
type RouteStatus = (typeof RouteStatus)[keyof typeof RouteStatus];
declare const ROUTE_STATUSES: ["IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "PLANNED", ...("IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "PLANNED")[]];
declare const TransportMode: {
    readonly WALKING: "WALKING";
    readonly BUS: "BUS";
    readonly METRO: "METRO";
    readonly TRAIN: "TRAIN";
    readonly TRANSIT: "TRANSIT";
    readonly DRIVING: "DRIVING";
    readonly TAXI: "TAXI";
    readonly RIDE_APP: "RIDE_APP";
    readonly BICYCLE: "BICYCLE";
    readonly OTHER: "OTHER";
};
type TransportMode = (typeof TransportMode)[keyof typeof TransportMode];
declare const TRANSPORT_MODES: ["WALKING" | "BUS" | "METRO" | "TRAIN" | "TRANSIT" | "DRIVING" | "TAXI" | "RIDE_APP" | "BICYCLE" | "OTHER", ...("WALKING" | "BUS" | "METRO" | "TRAIN" | "TRANSIT" | "DRIVING" | "TAXI" | "RIDE_APP" | "BICYCLE" | "OTHER")[]];
declare const TransportType: {
    readonly BUS: "BUS";
    readonly METRO: "METRO";
    readonly TRAIN: "TRAIN";
    readonly INTEGRATION: "INTEGRATION";
    readonly TAXI: "TAXI";
    readonly RIDE_APP: "RIDE_APP";
    readonly OTHER: "OTHER";
};
type TransportType = (typeof TransportType)[keyof typeof TransportType];
declare const TRANSPORT_TYPES: ["BUS" | "METRO" | "TRAIN" | "TAXI" | "RIDE_APP" | "OTHER" | "INTEGRATION", ...("BUS" | "METRO" | "TRAIN" | "TAXI" | "RIDE_APP" | "OTHER" | "INTEGRATION")[]];
declare const PhotoCategory: {
    readonly FACADE: "FACADE";
    readonly DISPLAY: "DISPLAY";
    readonly PRODUCT: "PRODUCT";
    readonly MATERIAL: "MATERIAL";
    readonly RECEIPT: "RECEIPT";
    readonly OTHER: "OTHER";
};
type PhotoCategory = (typeof PhotoCategory)[keyof typeof PhotoCategory];
declare const PHOTO_CATEGORIES: ["OTHER" | "FACADE" | "DISPLAY" | "PRODUCT" | "MATERIAL" | "RECEIPT", ...("OTHER" | "FACADE" | "DISPLAY" | "PRODUCT" | "MATERIAL" | "RECEIPT")[]];
declare const AuthorizationStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly REVOKED: "REVOKED";
};
type AuthorizationStatus = (typeof AuthorizationStatus)[keyof typeof AuthorizationStatus];
declare const AUTHORIZATION_STATUSES: ["ACTIVE" | "REVOKED", ...("ACTIVE" | "REVOKED")[]];
/** Situação calculada de uma carta de autorização em relação à data de hoje. */
declare const AuthorizationValidity: {
    /** A loja não exige carta (regra da rede ou da loja). */
    readonly NOT_REQUIRED: "NOT_REQUIRED";
    readonly VALID: "VALID";
    readonly EXPIRING: "EXPIRING";
    readonly CRITICAL: "CRITICAL";
    readonly EXPIRED: "EXPIRED";
    readonly NOT_YET_VALID: "NOT_YET_VALID";
    readonly NO_EXPIRATION: "NO_EXPIRATION";
    readonly REVOKED: "REVOKED";
};
type AuthorizationValidity = (typeof AuthorizationValidity)[keyof typeof AuthorizationValidity];
declare const AUTHORIZATION_VALIDITIES: ["REVOKED" | "NOT_REQUIRED" | "VALID" | "EXPIRING" | "CRITICAL" | "EXPIRED" | "NOT_YET_VALID" | "NO_EXPIRATION", ...("REVOKED" | "NOT_REQUIRED" | "VALID" | "EXPIRING" | "CRITICAL" | "EXPIRED" | "NOT_YET_VALID" | "NO_EXPIRATION")[]];
declare const NotificationType: {
    readonly AUTHORIZATION_EXPIRING: "AUTHORIZATION_EXPIRING";
    readonly AUTHORIZATION_EXPIRED: "AUTHORIZATION_EXPIRED";
    readonly VISIT_UPCOMING: "VISIT_UPCOMING";
    readonly VISIT_PENDING: "VISIT_PENDING";
    readonly ROUTE_CHANGED: "ROUTE_CHANGED";
    readonly SYSTEM: "SYSTEM";
};
type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
declare const NOTIFICATION_TYPES: ["AUTHORIZATION_EXPIRING" | "AUTHORIZATION_EXPIRED" | "VISIT_UPCOMING" | "VISIT_PENDING" | "ROUTE_CHANGED" | "SYSTEM", ...("AUTHORIZATION_EXPIRING" | "AUTHORIZATION_EXPIRED" | "VISIT_UPCOMING" | "VISIT_PENDING" | "ROUTE_CHANGED" | "SYSTEM")[]];
declare const RouteTemplateKind: {
    readonly STANDARD: "STANDARD";
    readonly WEEKLY: "WEEKLY";
    readonly MONTHLY: "MONTHLY";
};
type RouteTemplateKind = (typeof RouteTemplateKind)[keyof typeof RouteTemplateKind];
declare const ROUTE_TEMPLATE_KINDS: ["STANDARD" | "WEEKLY" | "MONTHLY", ...("STANDARD" | "WEEKLY" | "MONTHLY")[]];
declare const VisitActivityType: {
    readonly NOTE: "NOTE";
    readonly ACTIVITY: "ACTIVITY";
    readonly STATUS_CHANGE: "STATUS_CHANGE";
    readonly PHOTO: "PHOTO";
    readonly SYSTEM: "SYSTEM";
};
type VisitActivityType = (typeof VisitActivityType)[keyof typeof VisitActivityType];
declare const VISIT_ACTIVITY_TYPES: ["SYSTEM" | "NOTE" | "ACTIVITY" | "STATUS_CHANGE" | "PHOTO", ...("SYSTEM" | "NOTE" | "ACTIVITY" | "STATUS_CHANGE" | "PHOTO")[]];
/** Escopos que um link público de visualização pode liberar. */
declare const SharedScope: {
    readonly VISITS: "visits";
    readonly PHOTOS: "photos";
    readonly AUTHORIZATIONS: "authorizations";
    readonly EXPENSES: "expenses";
    readonly ROUTES: "routes";
};
type SharedScope = (typeof SharedScope)[keyof typeof SharedScope];
declare const SHARED_SCOPES: ["visits" | "photos" | "authorizations" | "expenses" | "routes", ...("visits" | "photos" | "authorizations" | "expenses" | "routes")[]];
declare const ReportType: {
    readonly VISITS: "visits";
    readonly ROUTES: "routes";
    readonly EXPENSES: "expenses";
    readonly AUTHORIZATIONS: "authorizations";
    readonly HISTORY: "history";
    readonly CONSOLIDATED: "consolidated";
};
type ReportType = (typeof ReportType)[keyof typeof ReportType];
declare const REPORT_TYPES: ["visits" | "authorizations" | "expenses" | "routes" | "history" | "consolidated", ...("visits" | "authorizations" | "expenses" | "routes" | "history" | "consolidated")[]];
type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'critical';
/** Etapas de um itinerário de transporte público. */
declare const TransitStepMode: {
    readonly WALK: "WALK";
    readonly BUS: "BUS";
    readonly METRO: "METRO";
    readonly TRAIN: "TRAIN";
    readonly TRAM: "TRAM";
    readonly FERRY: "FERRY";
    readonly OTHER: "OTHER";
};
type TransitStepMode = (typeof TransitStepMode)[keyof typeof TransitStepMode];

declare const USER_ROLE_LABEL: Record<UserRole, string>;
declare const VISIT_STATUS_LABEL: Record<VisitStatus, string>;
declare const VISIT_STATUS_TONE: Record<VisitStatus, Tone>;
/** Status da planilha original (aba Config) -> enum do sistema. */
declare const SPREADSHEET_STATUS_MAP: Record<string, VisitStatus>;
declare const ROUTE_STATUS_LABEL: Record<RouteStatus, string>;
declare const TRANSPORT_MODE_LABEL: Record<TransportMode, string>;
declare const TRANSPORT_TYPE_LABEL: Record<TransportType, string>;
declare const PHOTO_CATEGORY_LABEL: Record<PhotoCategory, string>;
declare const AUTHORIZATION_VALIDITY_LABEL: Record<AuthorizationValidity, string>;
declare const AUTHORIZATION_VALIDITY_TONE: Record<AuthorizationValidity, Tone>;
declare const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string>;
declare const ROUTE_TEMPLATE_KIND_LABEL: Record<RouteTemplateKind, string>;
declare const VISIT_ACTIVITY_TYPE_LABEL: Record<VisitActivityType, string>;
declare const SHARED_SCOPE_LABEL: Record<SharedScope, string>;
declare const REPORT_TYPE_LABEL: Record<ReportType, string>;
declare const WEEKDAY_LABEL: Record<number, string>;
declare const WEEKDAY_SHORT_LABEL: Record<number, string>;
declare const MONTH_LABEL: readonly ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
declare const TRANSIT_STEP_LABEL: Record<string, string>;

/** Data de negócio sem horário, no formato YYYY-MM-DD. */
type IsoDate = string;
declare const ISO_DATE_REGEX: RegExp;
declare const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
declare function isIsoDate(value: unknown): value is IsoDate;
/** Converte YYYY-MM-DD em Date à meia-noite UTC (formato usado em colunas DATE). */
declare function isoToUtcDate(iso: IsoDate): Date;
/** Converte Date (meia-noite UTC de coluna DATE) em YYYY-MM-DD. */
declare function utcDateToIso(date: Date): IsoDate;
/** Data de hoje no fuso horário de negócio. */
declare function todayIso(timeZone?: string, now?: Date): IsoDate;
/** Data (YYYY-MM-DD) de um instante em determinado fuso horário. */
declare function toIsoInTimeZone(instant: Date, timeZone?: string): IsoDate;
declare function addDaysIso(iso: IsoDate, days: number): IsoDate;
/** Diferença em dias (to - from). */
declare function diffDaysIso(from: IsoDate, to: IsoDate): number;
/** Dia da semana ISO: 1 = segunda ... 7 = domingo. */
declare function isoWeekday(iso: IsoDate): number;
declare function startOfWeekIso(iso: IsoDate): IsoDate;
declare function endOfWeekIso(iso: IsoDate): IsoDate;
declare function startOfMonthIso(iso: IsoDate): IsoDate;
declare function endOfMonthIso(iso: IsoDate): IsoDate;
declare function addMonthsIso(iso: IsoDate, months: number): IsoDate;
declare function eachDayIso(from: IsoDate, to: IsoDate): IsoDate[];
/** Semana do mês (1..5) baseada no dia: 1-7 => 1, 8-14 => 2 ... */
declare function weekOfMonth(iso: IsoDate): number;
/** "07/10/2026" -> "2026-10-07" (ou null se inválida). */
declare function parseBrDate(value: string): IsoDate | null;
declare function formatDateBR(iso: IsoDate | null | undefined): string;
declare function formatShortDateBR(iso: IsoDate): string;
/** "quarta-feira, 7 de outubro de 2026" */
declare function formatLongDateBR(iso: IsoDate, withYear?: boolean): string;
declare function monthLabel(iso: IsoDate): string;
/** Horário HH:mm de um instante no fuso de negócio. */
declare function formatTimeBR(instant: string | Date | null | undefined, timeZone?: string): string;
declare function formatDateTimeBR(instant: string | Date | null | undefined, timeZone?: string): string;
/** Duração em minutos legível: 75 -> "1h15". */
declare function formatDuration(seconds: number | null | undefined): string;
declare function formatDistance(meters: number | null | undefined): string;

interface Holiday {
    date: IsoDate;
    name: string;
    /** national = feriado nacional; optional = ponto facultativo nacional */
    kind: 'national' | 'optional';
}
/** Domingo de Páscoa (algoritmo gregoriano anônimo / Meeus). */
declare function easterSunday(year: number): IsoDate;
/**
 * Feriados nacionais (Lei 662/1949, Lei 6.802/1980 e Lei 14.759/2023) e
 * pontos facultativos nacionais. Feriados estaduais/municipais podem ser
 * tratados futuramente via configurações.
 */
declare function getNationalHolidays(year: number): Holiday[];
declare function holidayOn(date: IsoDate): Holiday | undefined;

/**
 * Links do Google Maps (Maps URLs API — não exige chave de API).
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * Limitações oficiais respeitadas aqui:
 *  - no máximo 9 waypoints por link (3 em navegadores móveis sem o app);
 *  - waypoints NÃO são suportados no modo transporte público (transit).
 *    Por isso a rota completa usa "driving"/"walking" e cada trecho tem
 *    o seu próprio link em transporte público.
 */
type MapsTravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';
declare const MAX_WAYPOINTS_PER_LINK = 9;
declare function googleMapsSearchUrl(query: string): string;
declare function googleMapsCoordinatesUrl(latitude: number, longitude: number): string;
interface DirectionsParams {
    origin: string;
    destination: string;
    waypoints?: string[];
    travelMode?: MapsTravelMode;
}
declare function googleMapsDirectionsUrl({ origin, destination, waypoints, travelMode, }: DirectionsParams): string;
interface RoutePoint {
    label: string;
    address: string;
}
interface FullRouteLink {
    part: number;
    totalParts: number;
    url: string;
    from: string;
    to: string;
    stops: number;
}
/**
 * Rota completa Casa -> lojas -> Casa, dividida em partes quando houver mais
 * de 9 paradas intermediárias.
 */
declare function buildFullRouteLinks(home: RoutePoint, stops: RoutePoint[], travelMode?: Exclude<MapsTravelMode, 'transit'>): FullRouteLink[];
interface LegLink {
    index: number;
    from: RoutePoint;
    to: RoutePoint;
    url: string;
}
/** Um link por trecho (Casa -> Loja 1, Loja 1 -> Loja 2, ..., Última -> Casa). */
declare function buildLegLinks(home: RoutePoint, stops: RoutePoint[], travelMode?: MapsTravelMode): LegLink[];

/**
 * Formatos de resposta da API REST (contrato entre apps/api e apps/web).
 * Datas de negócio: "YYYY-MM-DD". Instantes: ISO 8601 (UTC). Valores: número em reais.
 */

interface Paginated<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
interface ApiErrorBody {
    statusCode: number;
    message: string;
    errors?: Array<{
        path: string;
        message: string;
    }>;
    requestId?: string;
}
interface UserRef {
    id: string;
    name: string;
}
interface UserDto extends UserRef {
    email: string;
    role: UserRole;
    active: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    /** Foto de perfil (URL assinada, muda a cada nova foto); null = usar as iniciais */
    avatarUrl: string | null;
}
interface AuthResponse {
    accessToken: string;
    expiresIn: number;
    user: UserDto;
}
interface StoreAuthorizationInfo {
    /** A loja exige carta (regra da rede ou da loja)? */
    required: boolean;
    validity: AuthorizationValidity | null;
    daysLeft: number | null;
    hasValid: boolean;
    letterCount: number;
}
interface StoreRef {
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
interface StoreDto extends StoreRef {
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
interface StoreDetailDto extends StoreDto {
    stats: {
        totalVisits: number;
        completedVisits: number;
        lastVisitDate: IsoDate | null;
    };
    recentVisits: VisitSummaryDto[];
    recentPhotos: Array<PhotoDto & {
        visitId: string;
        scheduledDate: IsoDate;
    }>;
    letters: AuthorizationLetterDto[];
}
interface PhotoDto {
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
interface VisitSummaryDto {
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
interface VisitActivityDto {
    id: string;
    type: VisitActivityType;
    description: string;
    createdAt: string;
    user: UserRef | null;
}
interface VisitDetailDto extends VisitSummaryDto {
    statusReason: string | null;
    latitudeAtStart: number | null;
    longitudeAtStart: number | null;
    latitudeAtFinish: number | null;
    longitudeAtFinish: number | null;
    photos: PhotoDto[];
    activities: VisitActivityDto[];
    letters: AuthorizationLetterDto[];
    expenses: ExpenseDto[];
    rescheduledFrom: {
        id: string;
        scheduledDate: IsoDate;
    } | null;
    rescheduledTo: {
        id: string;
        scheduledDate: IsoDate;
    } | null;
    nextVisitId: string | null;
    blockWithoutAuthorization: boolean;
    activityPresets: string[];
}
interface VisitActionResult {
    visit: VisitDetailDto;
    warning: string | null;
}
interface LetterStoreDto {
    id: string;
    code: string;
    name: string;
    network: string;
    neighborhood: string | null;
    /** Datas da ação para a loja (lidas da carta); vazio = todo o período de vigência */
    dates: IsoDate[];
}
interface AuthorizationLetterDto {
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
interface LetterHistoryDto {
    id: string;
    action: string;
    fileName: string | null;
    url: string | null;
    details: Record<string, unknown> | null;
    user: UserRef | null;
    createdAt: string;
}
interface RouteVisitRef {
    id: string;
    status: VisitStatus;
    startedAt: string | null;
    finishedAt: string | null;
    photoCount: number;
}
interface RouteStopDto {
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
interface RouteSummaryDto {
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
interface TransitStepDto {
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
interface RouteLegDto {
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
interface RouteDetailDto extends RouteSummaryDto {
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
    nextStop: {
        stopId: string;
        visitId: string;
        storeName: string;
        transitUrl: string;
    } | null;
}
interface OptimizationPreviewDto {
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
interface RouteTemplateStopDto {
    id: string;
    order: number;
    weekday: number;
    weekIndex: number;
    store: StoreRef;
}
interface RouteTemplateDto {
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
interface AgendaVisitDto {
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
interface AgendaDayDto {
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
interface AgendaResponse {
    from: IsoDate;
    to: IsoDate;
    today: IsoDate;
    days: AgendaDayDto[];
}
interface ExpenseDto {
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
interface ExpenseSummaryDto {
    referenceDate: IsoDate;
    day: number;
    week: number;
    month: number;
    monthCompletedVisits: number;
    averagePerVisit: number | null;
    byType: Array<{
        type: TransportType;
        total: number;
    }>;
    byDay: Array<{
        date: IsoDate;
        total: number;
    }>;
}
interface TimelineItem {
    id: string;
    kind: VisitActivityType;
    title: string;
    description: string;
    createdAt: string;
    link: string | null;
}
interface DashboardAlert {
    id: string;
    tone: Tone;
    title: string;
    description: string;
    link: string | null;
}
interface AuthorizationCounters {
    valid: number;
    expiring: number;
    critical: number;
    expired: number;
    withoutLetter: number;
    notRequired: number;
}
interface ExpiringLetterItem {
    letterId: string;
    storeId: string;
    storeName: string;
    storeCode: string;
    expirationDate: IsoDate | null;
    daysLeft: number | null;
    validity: AuthorizationValidity;
}
interface ChartPoint {
    key: string;
    label: string;
    total: number;
    completed?: number;
}
interface DashboardDto {
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
    expenses: {
        today: number;
        month: number;
        estimatedToday: number | null;
    };
    distance: {
        todayMeters: number | null;
        monthMeters: number | null;
    };
    authorizations: AuthorizationCounters & {
        expiringSoon: ExpiringLetterItem[];
        expiringIn7Days: number;
    };
    todayStoresWithoutValidAuthorization: Array<{
        storeId: string;
        code: string;
        name: string;
    }>;
    alerts: DashboardAlert[];
    charts: {
        visitsByDay: ChartPoint[];
        visitsByRegion: ChartPoint[];
        expensesByWeek: ChartPoint[];
        statusDistribution: Array<{
            status: VisitStatus;
            label: string;
            total: number;
        }>;
    };
    timeline: TimelineItem[];
    faresNeedReview: boolean;
}
interface ManagerMetricsDto {
    from: IsoDate;
    to: IsoDate;
    totals: Record<'scheduled' | 'completed' | 'pending' | 'inProgress' | 'notCompleted' | 'rescheduled' | 'cancelled' | 'blocked', number>;
    completionRate: number;
    averageVisitsPerDay: number;
    workingDays: number;
    byNetwork: ChartPoint[];
    byRegion: ChartPoint[];
    byDay: ChartPoint[];
    byStatus: Array<{
        status: VisitStatus;
        label: string;
        total: number;
    }>;
    expenses: {
        total: number;
        perVisit: number | null;
        byType: Array<{
            type: TransportType;
            total: number;
        }>;
    };
    distance: {
        totalMeters: number | null;
        routesWithEstimate: number;
        routes: number;
    };
    authorizations: AuthorizationCounters & {
        expiringSoon: ExpiringLetterItem[];
    };
}
interface PublicPanelDto {
    label: string;
    scope: SharedScope[];
    expiresAt: string | null;
    generatedAt: string;
    companyName: string;
    metrics: ManagerMetricsDto;
    recentVisits: VisitSummaryDto[];
}
interface PublicVisitDetailDto extends VisitSummaryDto {
    photos: PhotoDto[];
    activities: VisitActivityDto[];
    statusReason: string | null;
}
interface NotificationDto {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: string;
}
interface SharedAccessDto {
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
interface SharedAccessCreatedDto extends SharedAccessDto {
    token: string;
    url: string;
}
interface FareDto {
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
interface HomeAddressDto {
    id: string;
    address: string;
    label: string | null;
    latitude: number | null;
    longitude: number | null;
    active: boolean;
}
interface AuditLogDto {
    id: string;
    entity: string;
    entityId: string | null;
    action: string;
    metadata: unknown;
    user: UserRef | null;
    ipAddress: string | null;
    createdAt: string;
}
interface ImportIssue {
    severity: 'info' | 'warning' | 'error';
    code: string;
    message: string;
    sheet?: string;
    row?: number;
}
interface ImportEntityCount {
    created: number;
    updated: number;
    unchanged: number;
}
interface ImportResultDto {
    dryRun: boolean;
    fileName: string;
    fileHash: string;
    status: 'SUCCESS' | 'SUCCESS_WITH_WARNINGS' | 'FAILED';
    summary: Record<string, ImportEntityCount>;
    issues: ImportIssue[];
    importRunId: string | null;
}
interface ProvidersInfoDto {
    route: {
        provider: string;
        configured: boolean;
        description: string;
    };
    geocoding: {
        provider: string;
        configured: boolean;
        description: string;
    };
    storage: {
        driver: string;
    };
    storesWithoutCoordinates: number;
    homeHasCoordinates: boolean;
}
interface ReportPreviewDto {
    type: ReportType;
    title: string;
    from: IsoDate;
    to: IsoDate;
    kpis: Array<{
        label: string;
        value: string;
    }>;
    sections: Array<{
        title: string;
        rows: number;
    }>;
}

interface ValidityThresholds {
    /** Até quantos dias antes do vencimento a carta fica AMARELA (padrão 30). */
    warningDays: number;
    /** Até quantos dias antes do vencimento a carta fica VERMELHA (padrão 7). */
    criticalDays: number;
}
declare const DEFAULT_VALIDITY_THRESHOLDS: ValidityThresholds;
interface LetterDates {
    status: AuthorizationStatus;
    validFrom?: IsoDate | null;
    expirationDate?: IsoDate | null;
    deletedAt?: string | Date | null;
}
interface LetterValidity {
    validity: AuthorizationValidity;
    /** Dias até o vencimento (negativo = expirada há N dias; null = sem vencimento). */
    daysLeft: number | null;
}
/**
 * Regra de vencimento:
 *  - mais de 30 dias ............ VERDE (VALID)
 *  - de 30 a 8 dias ............. AMARELO (EXPIRING)
 *  - de 7 dias até o dia do vencimento ... VERMELHO (CRITICAL)
 *  - após o vencimento .......... VERMELHO CRÍTICO (EXPIRED)
 */
declare function computeLetterValidity(letter: LetterDates, today: IsoDate, thresholds?: ValidityThresholds): LetterValidity;
/** A carta autoriza a visita hoje? */
declare function isUsableValidity(validity: AuthorizationValidity): boolean;
interface StoreAuthorizationSummary extends LetterValidity {
    hasValid: boolean;
    letterCount: number;
}
/**
 * Situação de autorização de uma loja considerando todas as suas cartas:
 * usa a melhor carta vigente (a que vence por último); se nenhuma estiver
 * vigente, retorna a situação menos grave entre elas (ou null se não há cartas).
 */
declare function summarizeStoreAuthorization(letters: LetterDates[], today: IsoDate, thresholds?: ValidityThresholds): StoreAuthorizationSummary | null;
declare function describeDaysLeft(daysLeft: number | null): string;
/**
 * A loja exige carta de autorização? A regra da loja (true/false) tem precedência;
 * sem regra própria, vale a lista de redes que exigem carta (Configurações).
 */
declare function isAuthorizationRequired(store: {
    network: string;
    authorizationRequired?: boolean | null;
}, requiredNetworks: readonly string[]): boolean;

/** Remove acentos, normaliza espaços e travessões. */
declare function normalizeText(value: string | null | undefined): string;
declare function stripAccents(value: string): string;
/** Chave de comparação: minúsculas, sem acentos e sem pontuação redundante. */
declare function comparableKey(value: string | null | undefined): string;
declare function slugify(value: string): string;

declare const DEFAULT_CITY = "Rio de Janeiro";
declare const DEFAULT_STATE = "RJ";
/**
 * Regra para inferir a rede a partir do código da loja.
 * Replica (de forma mais estrita) a regra da aba "Cadastro Rápido":
 * "Linhas iniciadas por V são classificadas como Drogaria Venancio".
 */
interface NetworkCodeRule {
    /** Expressão regular (sem barras) aplicada ao código em maiúsculas. Ex.: "^V\\d+$" */
    pattern: string;
    network: string;
}
interface NetworkRules {
    codeRules: NetworkCodeRule[];
    /** Rede atribuída a lojas identificadas apenas pelo nome (planilha: "Cristal"). */
    defaultNetworkForNamedStores: string;
}
declare const DEFAULT_NETWORK_RULES: NetworkRules;
declare function normalizeStoreCode(code: string | null | undefined): string;
/** Retorna a rede de um código conforme as regras, ou null. */
declare function networkForCode(code: string, rules?: NetworkRules): string | null;
/** Código provisório e estável para lojas sem código na origem (ex.: lojas da rede Cristal). */
declare function generateStoreCode(network: string, name: string): string;
/** Chave estável usada na importação idempotente. */
declare function buildStoreImportKey(network: string, codeOrName: string): string;
interface AddressLike {
    address: string;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
}
/** "Rua X, 123 — Bairro, Rio de Janeiro - RJ" */
declare function formatStoreAddress(store: AddressLike): string;
/** Endereço completo para Google Maps/geocodificação: "Rua X, 123, Bairro, Rio de Janeiro, RJ, Brasil" */
declare function fullAddressForMaps(store: AddressLike, includeCountry?: boolean): string;
/** Expande abreviações comuns e remove complementos (loja, sala) para melhorar a geocodificação. */
declare function normalizeAddressForGeocoding(address: string): string;
/** O endereço tem número? (usado para detectar endereços incompletos) */
declare function addressHasNumber(address: string): boolean;

/**
 * Cadastro rápido — transforma a lógica da aba "Cadastro Rápido" da planilha
 * em uma função reutilizável. Formato de cada linha:
 *
 *   Código/Loja — Endereço — Bairro
 *
 * Exemplos:
 *   V47 — Av. Nossa Sra. de Copacabana, 872 — Copacabana
 *   Drogaria Malibu (Cristal) — Rua Barata Ribeiro, 450, loja D — Copacabana
 *
 * Separadores aceitos: "—" (travessão), "–", " - ", "|" e TAB.
 */
interface QuickAddRow {
    line: number;
    raw: string;
    code: string | null;
    name: string;
    network: string;
    address: string;
    neighborhood: string | null;
    region: string | null;
    ok: boolean;
    error?: string;
}
interface QuickAddOptions {
    rules?: NetworkRules;
    region?: string | null;
}
declare function parseQuickAddLine(raw: string, line: number, options?: QuickAddOptions): QuickAddRow;
declare function parseQuickAddText(text: string, options?: QuickAddOptions): QuickAddRow[];

interface GeoPoint {
    latitude: number;
    longitude: number;
}
declare function haversineKm(a: GeoPoint, b: GeoPoint): number;
declare function hasCoordinates<T extends {
    latitude?: number | null;
    longitude?: number | null;
}>(value: T | null | undefined): value is T & GeoPoint;
/** Parâmetros da estimativa local de deslocamento (sem API externa). */
interface EstimateParams {
    /** Fator de desvio urbano aplicado à distância em linha reta. */
    detourFactor: number;
    /** Até esta distância (km, em linha reta) o trecho é feito a pé. */
    walkingThresholdKm: number;
    walkingSpeedKmh: number;
    transitSpeedKmh: number;
    /** Minutos de espera/acesso ao transporte público. */
    transitOverheadMinutes: number;
}
declare const DEFAULT_ESTIMATE_PARAMS: EstimateParams;
interface EstimatedLeg {
    mode: 'WALKING' | 'BUS';
    distanceMeters: number;
    durationSeconds: number;
}
declare function estimateLeg(from: GeoPoint, to: GeoPoint, params?: EstimateParams): EstimatedLeg;

interface OptimizablePoint extends GeoPoint {
    id: string;
}
interface OptimizationResult {
    order: string[];
    distanceKm: number;
    originalDistanceKm: number;
    improvementKm: number;
}
/** Distância total do circuito fechado origem -> pontos (na ordem) -> origem. */
declare function closedTourDistanceKm(origin: GeoPoint, points: GeoPoint[]): number;
/**
 * Otimização opcional da ordem das visitas (problema do caixeiro-viajante
 * com retorno à casa): vizinho mais próximo + melhoria 2-opt.
 * Determinística e rápida para o tamanho de uma rota diária.
 */
declare function optimizeClosedTour(origin: GeoPoint, points: OptimizablePoint[]): OptimizationResult;
interface PathOptimization {
    /** Índices (da matriz) na ordem proposta */
    order: number[];
    cost: number;
    method: 'exact' | 'heuristic';
}
/** Custo de start → order... → end numa matriz (assimétrica) de custos. */
declare function pathCost(cost: number[][], start: number, end: number, order: readonly number[]): number;
/**
 * Melhor ordem para visitar `nodes` saindo de `start` e terminando em `end`, minimizando
 * o custo (ex.: tempo de transporte público, que é assimétrico).
 * Exato (programação dinâmica de Held-Karp) até 13 paradas; acima disso,
 * vizinho mais próximo + 2-opt.
 */
declare function optimizePath(cost: number[][], start: number, end: number, nodes: readonly number[]): PathOptimization;

interface ParsedLetterStore {
    code: string;
    /** Datas da ação listadas para a loja (uma por coluna de mês) */
    dates: IsoDate[];
}
interface ParsedLetter {
    stores: ParsedLetterStore[];
    /** Meses das colunas, na ordem da carta (1–12) */
    months: number[];
    validFrom: IsoDate | null;
    expirationDate: IsoDate | null;
    network: string | null;
    /** "validade de 3 (três) meses" */
    validityMonths: number | null;
}
/**
 * Lê o texto de uma carta de autorização (ex.: "AUTORIZAÇÃO DE PROMOTOR" da Drogaria Venancio)
 * e extrai as filiais (V78, V126...), as datas da ação por mês e a vigência.
 *
 * Cada linha da tabela traz pares "filial dia" por coluna de mês ("V78 1 V126 2 V78 1"),
 * e o cabeçalho traz os meses ("OUTUBRO NOVEMBRO DEZEMBRO"). A carta não informa o ano:
 * escolhe-se o ano que deixa o período mais próximo de `today` (com virada de ano).
 */
declare function parseAuthorizationLetterText(input: string | string[], today: IsoDate): ParsedLetter;

type Greeting = 'Bom dia' | 'Boa tarde' | 'Boa noite';
/**
 * Saudação pelo horário (padrão: America/Sao_Paulo):
 * 06:00–11:59 "Bom dia" · 12:00–17:59 "Boa tarde" · 18:00–05:59 "Boa noite".
 * Data no formato "Quarta-feira, 07 de outubro".
 */
declare function greetingFor(date: Date, timeZone?: string): {
    greeting: Greeting;
    dateLabel: string;
};
/** Primeiro nome para saudações ("Maria Eduarda de Souza" → "Maria"). */
declare const firstName: (name: string) => string;

/** Converte Decimal do Prisma, string ou número em número com 2 casas. */
declare function toMoneyNumber(value: unknown): number;
declare function toNullableMoney(value: unknown): number | null;
declare function formatBRL(value: number | null | undefined): string;
/** "R$ 4,70" | "4,70" | "4.70" -> 4.7 */
declare function parseMoney(input: string): number | null;
declare function sumMoney(values: Array<number | null | undefined>): number;

declare const isoDateSchema: z.ZodString;
declare const optionalIsoDateSchema: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
declare const nullableIsoDateSchema: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
/** Aceita "a,b" ou ["a","b"] (query string) e retorna array. */
declare function csvArray<T extends z.ZodTypeAny>(item: T): z.ZodPreprocess<z.ZodOptional<z.ZodArray<T>>, unknown>;
declare const booleanQuery: z.ZodPreprocess<z.ZodOptional<z.ZodBoolean>, unknown>;
declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type PaginationQuery = z.infer<typeof paginationQuerySchema>;
declare const dateRangeQuerySchema: z.ZodObject<{
    from: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    to: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
}, z.core.$strip>;
declare const optionalText: (max: number) => z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
declare const latitudeSchema: z.ZodCoercedNumber<unknown>;
declare const longitudeSchema: z.ZodCoercedNumber<unknown>;
declare const geoCaptureSchema: z.ZodObject<{
    latitude: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    longitude: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    accuracy: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;

declare const loginSchema: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
    remember: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
type LoginInput = z.infer<typeof loginSchema>;
declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
declare const profileUpdateSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
/** Criação de usuário (somente administrador). */
declare const userCreateSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodEmail;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<{
        EMPLOYEE: "EMPLOYEE";
        MANAGER: "MANAGER";
        ADMIN: "ADMIN";
    }>>;
}, z.core.$strip>;
type UserCreateInput = z.infer<typeof userCreateSchema>;
declare const userUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodEmail>;
    role: z.ZodOptional<z.ZodEnum<{
        EMPLOYEE: "EMPLOYEE";
        MANAGER: "MANAGER";
        ADMIN: "ADMIN";
    }>>;
    active: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
type UserUpdateInput = z.infer<typeof userUpdateSchema>;
declare const userPasswordResetSchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
type UserPasswordResetInput = z.infer<typeof userPasswordResetSchema>;
/** Transfere a programação (roteiros, rotas e visitas, endereço de casa) de um usuário para outro. */
declare const transferOperationSchema: z.ZodObject<{
    fromUserId: z.ZodString;
    includePast: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
type TransferOperationInput = z.infer<typeof transferOperationSchema>;

declare const storeBaseSchema: z.ZodObject<{
    code: z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>;
    name: z.ZodString;
    network: z.ZodString;
    address: z.ZodString;
    neighborhood: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    city: z.ZodDefault<z.ZodString>;
    state: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    zipCode: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    region: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    observations: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    authorizationRequired: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
declare const storeCreateSchema: z.ZodObject<{
    code: z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>;
    name: z.ZodString;
    network: z.ZodString;
    address: z.ZodString;
    neighborhood: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    city: z.ZodDefault<z.ZodString>;
    state: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    zipCode: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    region: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    observations: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    authorizationRequired: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    active: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
type StoreCreateInput = z.input<typeof storeCreateSchema>;
declare const storeUpdateSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>>;
    name: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
    city: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    state: z.ZodOptional<z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>>;
    zipCode: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
    region: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
    latitude: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>>;
    longitude: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>>;
    observations: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
    authorizationRequired: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    active: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
type StoreUpdateInput = z.input<typeof storeUpdateSchema>;
declare const storeQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    search: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodOptional<z.ZodString>;
    active: z.ZodPreprocess<z.ZodOptional<z.ZodBoolean>, unknown>;
    withoutCoordinates: z.ZodPreprocess<z.ZodOptional<z.ZodBoolean>, unknown>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type StoreQuery = z.infer<typeof storeQuerySchema>;
declare const quickAddCommitSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodObject<{
        code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        name: z.ZodString;
        network: z.ZodString;
        address: z.ZodString;
        neighborhood: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
        region: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type QuickAddCommitInput = z.infer<typeof quickAddCommitSchema>;

declare const visitQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    date: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    from: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    to: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    status: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        PENDING: "PENDING";
        IN_PROGRESS: "IN_PROGRESS";
        COMPLETED: "COMPLETED";
        NOT_COMPLETED: "NOT_COMPLETED";
        RESCHEDULED: "RESCHEDULED";
        CANCELLED: "CANCELLED";
        BLOCKED: "BLOCKED";
    }>>>, unknown>;
    storeId: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    employeeId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type VisitQuery = z.infer<typeof visitQuerySchema>;
declare const visitCreateSchema: z.ZodObject<{
    storeId: z.ZodString;
    scheduledDate: z.ZodString;
    notes: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
}, z.core.$strip>;
type VisitCreateInput = z.infer<typeof visitCreateSchema>;
/** Edição da visita (inclusive depois de finalizada); cada alteração fica no histórico. */
declare const visitUpdateSchema: z.ZodObject<{
    notes: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        IN_PROGRESS: "IN_PROGRESS";
        COMPLETED: "COMPLETED";
        NOT_COMPLETED: "NOT_COMPLETED";
        RESCHEDULED: "RESCHEDULED";
        CANCELLED: "CANCELLED";
        BLOCKED: "BLOCKED";
    }>>;
    statusReason: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    startedAt: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
    finishedAt: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
}, z.core.$strip>;
type VisitUpdateInput = z.infer<typeof visitUpdateSchema>;
declare const visitStartSchema: z.ZodObject<{
    latitude: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    longitude: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    accuracy: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type VisitStartInput = z.infer<typeof visitStartSchema>;
declare const visitFinishSchema: z.ZodObject<{
    latitude: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    longitude: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    accuracy: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    status: z.ZodDefault<z.ZodEnum<{
        COMPLETED: "COMPLETED";
        NOT_COMPLETED: "NOT_COMPLETED";
    }>>;
    notes: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    reason: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
}, z.core.$strip>;
type VisitFinishInput = z.infer<typeof visitFinishSchema>;
declare const visitActivitySchema: z.ZodObject<{
    type: z.ZodEnum<{
        NOTE: "NOTE";
        ACTIVITY: "ACTIVITY";
    }>;
    description: z.ZodString;
}, z.core.$strip>;
type VisitActivityInput = z.infer<typeof visitActivitySchema>;
declare const visitRescheduleSchema: z.ZodObject<{
    date: z.ZodString;
    reason: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
}, z.core.$strip>;
type VisitRescheduleInput = z.infer<typeof visitRescheduleSchema>;
declare const photoUploadMetaSchema: z.ZodObject<{
    category: z.ZodDefault<z.ZodEnum<{
        OTHER: "OTHER";
        FACADE: "FACADE";
        DISPLAY: "DISPLAY";
        PRODUCT: "PRODUCT";
        MATERIAL: "MATERIAL";
        RECEIPT: "RECEIPT";
    }>>;
    caption: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    originalSizes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type PhotoUploadMeta = z.infer<typeof photoUploadMetaSchema>;

declare const routeQuerySchema: z.ZodObject<{
    from: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    to: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    employeeId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type RouteQuery = z.infer<typeof routeQuerySchema>;
declare const routeCreateSchema: z.ZodObject<{
    employeeId: z.ZodOptional<z.ZodString>;
    date: z.ZodString;
    storeIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    fromTemplate: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
type RouteCreateInput = z.infer<typeof routeCreateSchema>;
declare const routeUpdateSchema: z.ZodObject<{
    startAddress: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        IN_PROGRESS: "IN_PROGRESS";
        COMPLETED: "COMPLETED";
        CANCELLED: "CANCELLED";
        PLANNED: "PLANNED";
    }>>;
    notes: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    actualTransportCost: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
type RouteUpdateInput = z.infer<typeof routeUpdateSchema>;
declare const routeAddStopSchema: z.ZodObject<{
    storeId: z.ZodString;
    position: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type RouteAddStopInput = z.infer<typeof routeAddStopSchema>;
declare const routeReorderSchema: z.ZodObject<{
    stopIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
type RouteReorderInput = z.infer<typeof routeReorderSchema>;
declare const routeOptimizeSchema: z.ZodObject<{
    apply: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
type RouteOptimizeInput = z.infer<typeof routeOptimizeSchema>;
declare const routeGenerateSchema: z.ZodObject<{
    employeeId: z.ZodOptional<z.ZodString>;
    from: z.ZodString;
    to: z.ZodString;
    overwrite: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
type RouteGenerateInput = z.infer<typeof routeGenerateSchema>;
declare const templateCreateSchema: z.ZodObject<{
    name: z.ZodString;
    kind: z.ZodDefault<z.ZodEnum<{
        STANDARD: "STANDARD";
        WEEKLY: "WEEKLY";
        MONTHLY: "MONTHLY";
    }>>;
    cycleWeeks: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    anchorDate: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    validFrom: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    validUntil: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    active: z.ZodDefault<z.ZodBoolean>;
    notes: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
}, z.core.$strip>;
type TemplateCreateInput = z.input<typeof templateCreateSchema>;
declare const templateUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        STANDARD: "STANDARD";
        WEEKLY: "WEEKLY";
        MONTHLY: "MONTHLY";
    }>>>;
    cycleWeeks: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    anchorDate: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
    validFrom: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
    validUntil: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
    active: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    notes: z.ZodOptional<z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>>;
}, z.core.$strip>;
type TemplateUpdateInput = z.input<typeof templateUpdateSchema>;
declare const templateDaySchema: z.ZodObject<{
    weekday: z.ZodCoercedNumber<unknown>;
    weekIndex: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    storeIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
type TemplateDayInput = z.infer<typeof templateDaySchema>;

/** Datas da ação por loja: { [storeId]: ["2026-10-08", ...] } */
declare const letterStoreDatesSchema: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString>>;
type LetterStoreDates = z.infer<typeof letterStoreDatesSchema>;
declare const letterMetaSchema: z.ZodObject<{
    title: z.ZodString;
    issueDate: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    validFrom: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    expirationDate: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    notes: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    network: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    storeIds: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodString>>, unknown>;
    storeDates: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type LetterMetaInput = z.infer<typeof letterMetaSchema>;
declare const letterUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    issueDate: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    validFrom: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    expirationDate: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    notes: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    network: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    storeIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    storeDates: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
type LetterUpdateInput = z.infer<typeof letterUpdateSchema>;
declare const letterQuerySchema: z.ZodObject<{
    storeId: z.ZodOptional<z.ZodString>;
    validity: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        REVOKED: "REVOKED";
        NOT_REQUIRED: "NOT_REQUIRED";
        VALID: "VALID";
        EXPIRING: "EXPIRING";
        CRITICAL: "CRITICAL";
        EXPIRED: "EXPIRED";
        NOT_YET_VALID: "NOT_YET_VALID";
        NO_EXPIRATION: "NO_EXPIRATION";
    }>>>, unknown>;
    search: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
    expiringWithinDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type LetterQuery = z.infer<typeof letterQuerySchema>;

declare const expenseCreateSchema: z.ZodObject<{
    date: z.ZodString;
    type: z.ZodEnum<{
        BUS: "BUS";
        METRO: "METRO";
        TRAIN: "TRAIN";
        TAXI: "TAXI";
        RIDE_APP: "RIDE_APP";
        OTHER: "OTHER";
        INTEGRATION: "INTEGRATION";
    }>;
    description: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    estimatedValue: z.ZodOptional<z.ZodPreprocess<z.ZodNullable<z.ZodNumber>, unknown>>;
    actualValue: z.ZodOptional<z.ZodPreprocess<z.ZodNullable<z.ZodNumber>, unknown>>;
    routeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    visitId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
type ExpenseCreateInput = z.input<typeof expenseCreateSchema>;
declare const expenseUpdateSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        BUS: "BUS";
        METRO: "METRO";
        TRAIN: "TRAIN";
        TAXI: "TAXI";
        RIDE_APP: "RIDE_APP";
        OTHER: "OTHER";
        INTEGRATION: "INTEGRATION";
    }>>;
    description: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    estimatedValue: z.ZodOptional<z.ZodPreprocess<z.ZodNullable<z.ZodNumber>, unknown>>;
    actualValue: z.ZodOptional<z.ZodPreprocess<z.ZodNullable<z.ZodNumber>, unknown>>;
}, z.core.$strip>;
type ExpenseUpdateInput = z.input<typeof expenseUpdateSchema>;
declare const expenseQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    from: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    to: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    type: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        BUS: "BUS";
        METRO: "METRO";
        TRAIN: "TRAIN";
        TAXI: "TAXI";
        RIDE_APP: "RIDE_APP";
        OTHER: "OTHER";
        INTEGRATION: "INTEGRATION";
    }>>>, unknown>;
    routeId: z.ZodOptional<z.ZodString>;
    employeeId: z.ZodOptional<z.ZodString>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
declare const fareSchema: z.ZodObject<{
    type: z.ZodEnum<{
        BUS: "BUS";
        METRO: "METRO";
        TRAIN: "TRAIN";
        TAXI: "TAXI";
        RIDE_APP: "RIDE_APP";
        OTHER: "OTHER";
        INTEGRATION: "INTEGRATION";
    }>;
    operator: z.ZodString;
    description: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    value: z.ZodCoercedNumber<unknown>;
    effectiveFrom: z.ZodString;
    effectiveUntil: z.ZodNullable<z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>>;
    active: z.ZodDefault<z.ZodBoolean>;
    verified: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
type FareInput = z.input<typeof fareSchema>;

declare const homeAddressSchema: z.ZodObject<{
    address: z.ZodString;
    label: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>, unknown>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
type HomeAddressInput = z.infer<typeof homeAddressSchema>;
/** Configurações da operação editáveis pela interface. */
declare const companySettingsSchema: z.ZodObject<{
    companyName: z.ZodString;
    authorizationWarningDays: z.ZodCoercedNumber<unknown>;
    authorizationCriticalDays: z.ZodCoercedNumber<unknown>;
    blockVisitWithoutAuthorization: z.ZodBoolean;
    authorizationRequiredNetworks: z.ZodArray<z.ZodString>;
    autoGenerateRoutes: z.ZodBoolean;
    routeGenerationHorizonDays: z.ZodCoercedNumber<unknown>;
    fullRouteTravelMode: z.ZodEnum<{
        driving: "driving";
        walking: "walking";
    }>;
    networks: z.ZodArray<z.ZodString>;
    regions: z.ZodArray<z.ZodString>;
    activityPresets: z.ZodArray<z.ZodString>;
    networkCodeRules: z.ZodArray<z.ZodObject<{
        pattern: z.ZodString;
        network: z.ZodString;
    }, z.core.$strip>>;
    defaultNetworkForNamedStores: z.ZodString;
}, z.core.$strip>;
type CompanySettings = z.infer<typeof companySettingsSchema>;
declare const companySettingsUpdateSchema: z.ZodObject<{
    companyName: z.ZodOptional<z.ZodString>;
    authorizationWarningDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    authorizationCriticalDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    blockVisitWithoutAuthorization: z.ZodOptional<z.ZodBoolean>;
    authorizationRequiredNetworks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    autoGenerateRoutes: z.ZodOptional<z.ZodBoolean>;
    routeGenerationHorizonDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    fullRouteTravelMode: z.ZodOptional<z.ZodEnum<{
        driving: "driving";
        walking: "walking";
    }>>;
    networks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    regions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    activityPresets: z.ZodOptional<z.ZodArray<z.ZodString>>;
    networkCodeRules: z.ZodOptional<z.ZodArray<z.ZodObject<{
        pattern: z.ZodString;
        network: z.ZodString;
    }, z.core.$strip>>>;
    defaultNetworkForNamedStores: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type CompanySettingsUpdate = z.infer<typeof companySettingsUpdateSchema>;
declare const sharedAccessCreateSchema: z.ZodObject<{
    label: z.ZodString;
    scope: z.ZodArray<z.ZodEnum<{
        visits: "visits";
        photos: "photos";
        authorizations: "authorizations";
        expenses: "expenses";
        routes: "routes";
    }>>;
}, z.core.$strip>;
type SharedAccessCreateInput = z.infer<typeof sharedAccessCreateSchema>;
/** Links públicos não expiram: só são desativados/reativados ou revogados manualmente. */
declare const sharedAccessUpdateSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    active: z.ZodOptional<z.ZodBoolean>;
    scope: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        visits: "visits";
        photos: "photos";
        authorizations: "authorizations";
        expenses: "expenses";
        routes: "routes";
    }>>>;
}, z.core.$strip>;
type SharedAccessUpdateInput = z.infer<typeof sharedAccessUpdateSchema>;
declare const reportQuerySchema: z.ZodObject<{
    from: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    to: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    employeeId: z.ZodOptional<z.ZodString>;
    network: z.ZodOptional<z.ZodString>;
    storeId: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    status: z.ZodPreprocess<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        PENDING: "PENDING";
        IN_PROGRESS: "IN_PROGRESS";
        COMPLETED: "COMPLETED";
        NOT_COMPLETED: "NOT_COMPLETED";
        RESCHEDULED: "RESCHEDULED";
        CANCELLED: "CANCELLED";
        BLOCKED: "BLOCKED";
    }>>>, unknown>;
}, z.core.$strip>;
type ReportQuery = z.infer<typeof reportQuerySchema>;
declare const auditQuerySchema: z.ZodObject<{
    entity: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    from: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    to: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
type AuditQuery = z.infer<typeof auditQuerySchema>;

export { AUTHORIZATION_STATUSES, AUTHORIZATION_VALIDITIES, AUTHORIZATION_VALIDITY_LABEL, AUTHORIZATION_VALIDITY_TONE, type AddressLike, type AgendaDayDto, type AgendaResponse, type AgendaVisitDto, type ApiErrorBody, type AuditLogDto, type AuditQuery, type AuthResponse, type AuthorizationCounters, type AuthorizationLetterDto, AuthorizationStatus, AuthorizationValidity, type ChangePasswordInput, type ChartPoint, type CompanySettings, type CompanySettingsUpdate, DEFAULT_CITY, DEFAULT_ESTIMATE_PARAMS, DEFAULT_NETWORK_RULES, DEFAULT_STATE, DEFAULT_TIME_ZONE, DEFAULT_VALIDITY_THRESHOLDS, type DashboardAlert, type DashboardDto, type DirectionsParams, type EstimateParams, type EstimatedLeg, type ExpenseCreateInput, type ExpenseDto, type ExpenseQuery, type ExpenseSummaryDto, type ExpenseUpdateInput, type ExpiringLetterItem, type FareDto, type FareInput, type FullRouteLink, type GeoPoint, type Greeting, type Holiday, type HomeAddressDto, type HomeAddressInput, ISO_DATE_REGEX, type ImportEntityCount, type ImportIssue, type ImportResultDto, type IsoDate, type LegLink, type LetterDates, type LetterHistoryDto, type LetterMetaInput, type LetterQuery, type LetterStoreDates, type LetterStoreDto, type LetterUpdateInput, type LetterValidity, type LoginInput, MAX_WAYPOINTS_PER_LINK, MONTH_LABEL, type ManagerMetricsDto, type MapsTravelMode, NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABEL, type NetworkCodeRule, type NetworkRules, type NotificationDto, NotificationType, type OptimizablePoint, type OptimizationPreviewDto, type OptimizationResult, PHOTO_CATEGORIES, PHOTO_CATEGORY_LABEL, type Paginated, type PaginationQuery, type ParsedLetter, type ParsedLetterStore, type PathOptimization, PhotoCategory, type PhotoDto, type PhotoUploadMeta, type ProfileUpdateInput, type ProvidersInfoDto, type PublicPanelDto, type PublicVisitDetailDto, type QuickAddCommitInput, type QuickAddOptions, type QuickAddRow, REPORT_TYPES, REPORT_TYPE_LABEL, ROUTE_STATUSES, ROUTE_STATUS_LABEL, ROUTE_TEMPLATE_KINDS, ROUTE_TEMPLATE_KIND_LABEL, type ReportPreviewDto, type ReportQuery, ReportType, type RouteAddStopInput, type RouteCreateInput, type RouteDetailDto, type RouteGenerateInput, type RouteLegDto, type RouteOptimizeInput, type RoutePoint, type RouteQuery, type RouteReorderInput, RouteStatus, type RouteStopDto, type RouteSummaryDto, type RouteTemplateDto, RouteTemplateKind, type RouteTemplateStopDto, type RouteUpdateInput, type RouteVisitRef, SHARED_SCOPES, SHARED_SCOPE_LABEL, SPREADSHEET_STATUS_MAP, type SharedAccessCreateInput, type SharedAccessCreatedDto, type SharedAccessDto, type SharedAccessUpdateInput, SharedScope, type StoreAuthorizationInfo, type StoreAuthorizationSummary, type StoreCreateInput, type StoreDetailDto, type StoreDto, type StoreQuery, type StoreRef, type StoreUpdateInput, TRANSIT_STEP_LABEL, TRANSPORT_MODES, TRANSPORT_MODE_LABEL, TRANSPORT_TYPES, TRANSPORT_TYPE_LABEL, type TemplateCreateInput, type TemplateDayInput, type TemplateUpdateInput, type TimelineItem, type Tone, type TransferOperationInput, type TransitStepDto, TransitStepMode, TransportMode, TransportType, USER_ROLES, USER_ROLE_LABEL, type UserCreateInput, type UserDto, type UserPasswordResetInput, type UserRef, UserRole, type UserUpdateInput, VISIT_ACTIVITY_TYPES, VISIT_ACTIVITY_TYPE_LABEL, VISIT_STATUSES, VISIT_STATUS_LABEL, VISIT_STATUS_TONE, type ValidityThresholds, type VisitActionResult, type VisitActivityDto, type VisitActivityInput, VisitActivityType, type VisitCreateInput, type VisitDetailDto, type VisitFinishInput, type VisitQuery, type VisitRescheduleInput, type VisitStartInput, VisitStatus, type VisitSummaryDto, type VisitUpdateInput, WEEKDAY_LABEL, WEEKDAY_SHORT_LABEL, addDaysIso, addMonthsIso, addressHasNumber, auditQuerySchema, booleanQuery, buildFullRouteLinks, buildLegLinks, buildStoreImportKey, changePasswordSchema, closedTourDistanceKm, companySettingsSchema, companySettingsUpdateSchema, comparableKey, computeLetterValidity, csvArray, dateRangeQuerySchema, describeDaysLeft, diffDaysIso, eachDayIso, easterSunday, endOfMonthIso, endOfWeekIso, estimateLeg, expenseCreateSchema, expenseQuerySchema, expenseUpdateSchema, fareSchema, firstName, formatBRL, formatDateBR, formatDateTimeBR, formatDistance, formatDuration, formatLongDateBR, formatShortDateBR, formatStoreAddress, formatTimeBR, fullAddressForMaps, generateStoreCode, geoCaptureSchema, getNationalHolidays, googleMapsCoordinatesUrl, googleMapsDirectionsUrl, googleMapsSearchUrl, greetingFor, hasCoordinates, haversineKm, holidayOn, homeAddressSchema, isAuthorizationRequired, isIsoDate, isUsableValidity, isoDateSchema, isoToUtcDate, isoWeekday, latitudeSchema, letterMetaSchema, letterQuerySchema, letterStoreDatesSchema, letterUpdateSchema, loginSchema, longitudeSchema, monthLabel, networkForCode, normalizeAddressForGeocoding, normalizeStoreCode, normalizeText, nullableIsoDateSchema, optimizeClosedTour, optimizePath, optionalIsoDateSchema, optionalText, paginationQuerySchema, parseAuthorizationLetterText, parseBrDate, parseMoney, parseQuickAddLine, parseQuickAddText, pathCost, photoUploadMetaSchema, profileUpdateSchema, quickAddCommitSchema, reportQuerySchema, routeAddStopSchema, routeCreateSchema, routeGenerateSchema, routeOptimizeSchema, routeQuerySchema, routeReorderSchema, routeUpdateSchema, sharedAccessCreateSchema, sharedAccessUpdateSchema, slugify, startOfMonthIso, startOfWeekIso, storeBaseSchema, storeCreateSchema, storeQuerySchema, storeUpdateSchema, stripAccents, sumMoney, summarizeStoreAuthorization, templateCreateSchema, templateDaySchema, templateUpdateSchema, toIsoInTimeZone, toMoneyNumber, toNullableMoney, todayIso, transferOperationSchema, userCreateSchema, userPasswordResetSchema, userUpdateSchema, utcDateToIso, visitActivitySchema, visitCreateSchema, visitFinishSchema, visitQuerySchema, visitRescheduleSchema, visitStartSchema, visitUpdateSchema, weekOfMonth };

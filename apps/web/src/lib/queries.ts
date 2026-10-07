import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AgendaResponse,
  AuditLogDto,
  AuthorizationLetterDto,
  CompanySettings,
  DashboardDto,
  ExpenseDto,
  ExpenseSummaryDto,
  FareDto,
  HomeAddressDto,
  ImportIssue,
  ImportEntityCount,
  LetterHistoryDto,
  ManagerMetricsDto,
  NotificationDto,
  Paginated,
  ProvidersInfoDto,
  RouteDetailDto,
  RouteSummaryDto,
  RouteTemplateDto,
  SharedAccessDto,
  StoreDetailDto,
  StoreDto,
  UserDto,
  VisitDetailDto,
  VisitSummaryDto,
} from '@routeflow/types';
import { api, type Query } from './api';

export const keys = {
  dashboard: ['dashboard'] as const,
  manager: (from: string, to: string) => ['manager', from, to] as const,
  agenda: (from: string, to: string) => ['agenda', from, to] as const,
  routes: (from: string, to: string) => ['routes', from, to] as const,
  route: (id: string) => ['route', id] as const,
  templates: ['templates'] as const,
  visits: (q: Query) => ['visits', q] as const,
  visit: (id: string) => ['visit', id] as const,
  stores: (q: Query) => ['stores', q] as const,
  store: (id: string) => ['store', id] as const,
  catalog: ['catalog'] as const,
  letters: (q: Query) => ['letters', q] as const,
  letterHistory: (id: string) => ['letter-history', id] as const,
  expenses: (q: Query) => ['expenses', q] as const,
  expenseSummary: ['expense-summary'] as const,
  notifications: ['notifications'] as const,
  unread: ['notifications-unread'] as const,
  settings: ['settings'] as const,
  home: ['home-address'] as const,
  fares: ['fares'] as const,
  shared: ['shared-access'] as const,
  providers: ['providers'] as const,
  audit: (page: number) => ['audit', page] as const,
  importRuns: ['import-runs'] as const,
  users: ['users'] as const,
};

export const useDashboard = () =>
  useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<DashboardDto>('/dashboard') });
export const useManagerMetrics = (from: string, to: string) =>
  useQuery({
    queryKey: keys.manager(from, to),
    queryFn: () => api.get<ManagerMetricsDto>('/dashboard/manager', { from, to }),
  });
export const useAgenda = (from: string, to: string) =>
  useQuery({
    queryKey: keys.agenda(from, to),
    queryFn: () => api.get<AgendaResponse>('/agenda', { from, to }),
  });
export const useRoutes = (from: string, to: string) =>
  useQuery({
    queryKey: keys.routes(from, to),
    queryFn: () => api.get<RouteSummaryDto[]>('/routes', { from, to }),
  });
export const useRoute = (id: string) =>
  useQuery({ queryKey: keys.route(id), queryFn: () => api.get<RouteDetailDto>(`/routes/${id}`) });
export const useTemplates = () =>
  useQuery({
    queryKey: keys.templates,
    queryFn: () => api.get<RouteTemplateDto[]>('/route-templates'),
  });
export const useVisits = (q: Query) =>
  useQuery({
    queryKey: keys.visits(q),
    queryFn: () => api.get<Paginated<VisitSummaryDto>>('/visits', q),
  });
export const useVisit = (id: string) =>
  useQuery({ queryKey: keys.visit(id), queryFn: () => api.get<VisitDetailDto>(`/visits/${id}`) });
export const useStores = (q: Query) =>
  useQuery({ queryKey: keys.stores(q), queryFn: () => api.get<Paginated<StoreDto>>('/stores', q) });
export const useStore = (id: string) =>
  useQuery({ queryKey: keys.store(id), queryFn: () => api.get<StoreDetailDto>(`/stores/${id}`) });
export const useCatalog = () =>
  useQuery({
    queryKey: keys.catalog,
    queryFn: () =>
      api.get<{ networks: string[]; regions: string[]; neighborhoods: string[] }>(
        '/stores/catalog',
      ),
    staleTime: 300_000,
  });
export const useLetters = (q: Query) =>
  useQuery({
    queryKey: keys.letters(q),
    queryFn: () => api.get<AuthorizationLetterDto[]>('/authorizations', q),
  });
export const useLetterHistory = (id: string | null) =>
  useQuery({
    queryKey: keys.letterHistory(id ?? ''),
    queryFn: () => api.get<LetterHistoryDto[]>(`/authorizations/${id}/history`),
    enabled: !!id,
  });
export const useExpenses = (q: Query) =>
  useQuery({
    queryKey: keys.expenses(q),
    queryFn: () => api.get<Paginated<ExpenseDto> & { totalValue: number }>('/expenses', q),
  });
export const useExpenseSummary = () =>
  useQuery({
    queryKey: keys.expenseSummary,
    queryFn: () => api.get<ExpenseSummaryDto>('/expenses/summary'),
  });
export const useNotifications = () =>
  useQuery({
    queryKey: keys.notifications,
    queryFn: () => api.get<NotificationDto[]>('/notifications'),
  });
export const useUnreadCount = () =>
  useQuery({
    queryKey: keys.unread,
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 120_000,
  });
export const useSettings = () =>
  useQuery({
    queryKey: keys.settings,
    queryFn: () => api.get<CompanySettings>('/settings'),
    staleTime: 300_000,
  });
export const useHomeAddress = () =>
  useQuery({
    queryKey: keys.home,
    queryFn: () => api.get<HomeAddressDto | null>('/me/home-address'),
  });
export const useFares = () =>
  useQuery({ queryKey: keys.fares, queryFn: () => api.get<FareDto[]>('/transport/fares') });
export const useSharedAccess = (enabled = true) =>
  useQuery({
    queryKey: keys.shared,
    queryFn: () => api.get<SharedAccessDto[]>('/shared-access'),
    enabled,
  });
export const useProviders = () =>
  useQuery({
    queryKey: keys.providers,
    queryFn: () => api.get<ProvidersInfoDto>('/transport/providers'),
  });
export const useAudit = (page: number, enabled = true) =>
  useQuery({
    queryKey: keys.audit(page),
    queryFn: () => api.get<Paginated<AuditLogDto>>('/audit', { page, pageSize: 20 }),
    enabled,
  });
export interface ImportRunDto {
  id: string;
  fileName: string;
  dryRun: boolean;
  status: string;
  summary: Record<string, ImportEntityCount>;
  issues: ImportIssue[];
  user: { id: string; name: string } | null;
  createdAt: string;
}
export const useImportRuns = (enabled = true) =>
  useQuery({
    queryKey: keys.importRuns,
    queryFn: () => api.get<ImportRunDto[]>('/import/runs'),
    enabled,
  });
export const useUsers = (enabled = true) =>
  useQuery({ queryKey: keys.users, queryFn: () => api.get<UserDto[]>('/users'), enabled });

/** Invalida dados afetados por mudanças em visitas/rotas. */
export function useInvalidateOperation() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [
        'dashboard',
        'manager',
        'agenda',
        'routes',
        'route',
        'visits',
        'visit',
        'store',
        'expenses',
        'expense-summary',
        'notifications-unread',
      ].map((k) => client.invalidateQueries({ queryKey: [k] })),
    );
}

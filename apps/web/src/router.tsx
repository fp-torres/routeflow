import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell, RequireAuth } from '@/components/layout';

const page = <T extends Record<string, React.ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T,
) => lazy(async () => ({ default: (await loader())[name] as React.ComponentType }));

const LoginPage = page(() => import('@/features/auth/login-page'), 'LoginPage');
const DashboardPage = page(() => import('@/features/dashboard/dashboard-page'), 'DashboardPage');
const AgendaPage = page(() => import('@/features/agenda/agenda-page'), 'AgendaPage');
const RoutesPage = page(() => import('@/features/routes/routes-page'), 'RoutesPage');
const RouteDetailPage = page(
  () => import('@/features/routes/route-detail-page'),
  'RouteDetailPage',
);
const VisitsPage = page(() => import('@/features/visits/visits-page'), 'VisitsPage');
const VisitDetailPage = page(
  () => import('@/features/visits/visit-detail-page'),
  'VisitDetailPage',
);
const StoresPage = page(() => import('@/features/stores/stores-page'), 'StoresPage');
const StoreDetailPage = page(
  () => import('@/features/stores/store-detail-page'),
  'StoreDetailPage',
);
const StoreAuthorizationsPage = page(
  () => import('@/features/authorizations/store-authorizations-page'),
  'StoreAuthorizationsPage',
);
const AuthorizationsPage = page(
  () => import('@/features/authorizations/authorizations-page'),
  'AuthorizationsPage',
);
const ExpensesPage = page(() => import('@/features/expenses/expenses-page'), 'ExpensesPage');
const HistoryPage = page(() => import('@/features/history/history-page'), 'HistoryPage');
const ReportsPage = page(() => import('@/features/reports/reports-page'), 'ReportsPage');
const SettingsPage = page(() => import('@/features/settings/settings-page'), 'SettingsPage');
const NotificationsPage = page(
  () => import('@/features/notifications/notifications-page'),
  'NotificationsPage',
);
const PublicDashboardPage = page(
  () => import('@/features/public/public-dashboard-page'),
  'PublicDashboardPage',
);
const NotFoundPage = page(() => import('@/features/notifications/not-found-page'), 'NotFoundPage');

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/public/dashboard/:token', element: <PublicDashboardPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'agenda', element: <AgendaPage /> },
          { path: 'rotas', element: <RoutesPage /> },
          { path: 'rotas/:id', element: <RouteDetailPage /> },
          { path: 'visitas', element: <VisitsPage /> },
          { path: 'visitas/:id', element: <VisitDetailPage /> },
          { path: 'lojas', element: <StoresPage /> },
          { path: 'lojas/:id', element: <StoreDetailPage /> },
          { path: 'lojas/:id/autorizacoes', element: <StoreAuthorizationsPage /> },
          { path: 'autorizacoes', element: <AuthorizationsPage /> },
          { path: 'despesas', element: <ExpensesPage /> },
          { path: 'historico', element: <HistoryPage /> },
          { path: 'relatorios', element: <ReportsPage /> },
          { path: 'configuracoes', element: <SettingsPage /> },
          { path: 'notificacoes', element: <NotificationsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

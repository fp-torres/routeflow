import {
  Bell,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Ellipsis,
  House,
  LogOut,
  Monitor,
  Moon,
  Route,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  Wallet,
} from 'lucide-react';
import * as React from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { USER_ROLE_LABEL } from '@routeflow/types';
import {
  Avatar,
  Button,
  cn,
  Drawer,
  DrawerContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@routeflow/ui';
import { useAuth } from '@/lib/auth';
import { useUnreadCount } from '@/lib/queries';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { BrandMark, Wordmark } from './brand';
import { PageSkeleton } from './states';

export const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Início', icon: House },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/rotas', label: 'Rotas', icon: Route },
  { to: '/visitas', label: 'Visitas', icon: ClipboardList },
  { to: '/despesas', label: 'Despesas', icon: Wallet },
];

export const SECONDARY_NAV = [
  { to: '/lojas', label: 'Lojas', icon: Store },
  { to: '/autorizacoes', label: 'Autorizações', icon: ShieldCheck },
  { to: '/relatorios', label: 'Relatórios', icon: ChartColumn },
  { to: '/historico', label: 'Histórico', icon: ScrollText },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <Wordmark className="animate-pulse" />
      </div>
    );
  }
  if (status === 'anonymous')
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  return <Outlet />;
}

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: React.ComponentType }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

function ThemeMenuItems() {
  const { preference, setPreference } = useTheme();
  return (
    <>
      <DropdownMenuLabel>Tema</DropdownMenuLabel>
      {THEME_OPTIONS.map((o) => (
        <DropdownMenuItem
          key={o.value}
          onSelect={() => setPreference(o.value)}
          aria-checked={preference === o.value}
          className={cn(preference === o.value && 'font-bold text-primary')}
        >
          <o.icon /> {o.label}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function NotificationBell() {
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={count ? `Notificações: ${count} não lidas` : 'Notificações'}
    >
      <Link to="/notificacoes" className="relative">
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute top-1.5 right-1.5 min-w-5 rounded-full bg-line px-1 text-center text-[0.7rem] leading-5 font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Menu do usuário">
        <Avatar name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block text-sm font-bold text-foreground">{user.name}</span>
          <span className="block font-normal">{USER_ROLE_LABEL[user.role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SideNavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground',
          isActive && 'bg-primary-soft text-primary',
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}

export function AppShell() {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const location = useLocation();
  React.useEffect(() => setMoreOpen(false), [location.pathname]);
  const secondaryActive = SECONDARY_NAV.some((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:p-3"
      >
        Pular para o conteúdo
      </a>
      <aside
        className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-card px-3 py-5 lg:flex"
        aria-label="Menu lateral"
      >
        <Link to="/dashboard" className="px-2">
          <Wordmark />
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {PRIMARY_NAV.map((item) => (
            <SideNavLink key={item.to} {...item} />
          ))}
        </nav>
        <nav className="flex flex-col gap-1 border-t pt-4" aria-label="Gestão">
          {SECONDARY_NAV.map((item) => (
            <SideNavLink key={item.to} {...item} />
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs text-muted-foreground">
          Gestão inteligente de operações em campo.
        </p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1 px-3 sm:px-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 lg:hidden"
              aria-label="RouteFlow — início"
            >
              <BrandMark className="size-7" />
              <span className="font-bold tracking-tight">RouteFlow</span>
            </Link>
            <div className="flex-1" />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main
          id="conteudo"
          className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:pb-12"
        >
          <React.Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </React.Suspense>
        </main>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-6">
          {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-muted-foreground',
                    isActive && 'text-primary',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-[1.35rem]', isActive && 'text-line')} />
                    <span className="max-w-full truncate px-0.5">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-muted-foreground',
                secondaryActive && 'text-primary',
              )}
              aria-haspopup="dialog"
            >
              <Ellipsis className="size-[1.35rem]" />
              Mais
            </button>
          </li>
        </ul>
      </nav>
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent title="Mais opções" side="bottom">
          <nav aria-label="Gestão" className="grid grid-cols-2 gap-2 pb-2">
            {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-14 items-center gap-3 rounded-lg border bg-card px-3 font-semibold hover:bg-muted"
              >
                <Icon className="size-5 text-primary" /> {label}
              </Link>
            ))}
          </nav>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

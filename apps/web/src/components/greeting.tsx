import * as React from 'react';
import { Link } from 'react-router';
import { firstName, greetingFor } from '@routeflow/types';
import { Avatar } from '@routeflow/ui';
import { useAuth } from '@/lib/auth';

/** Hora atual, atualizada periodicamente (a saudação muda sozinha às 12h e às 18h). */
function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** "[foto] Bom dia, Maria — Quarta-feira, 07 de outubro" (America/Sao_Paulo). */
export function DashboardGreeting() {
  const { user } = useAuth();
  const now = useNow();
  if (!user) return null;
  const { greeting, dateLabel } = greetingFor(now);
  return (
    <div className="mb-5 flex items-center gap-3 sm:mb-6 sm:gap-4">
      <Link
        to="/configuracoes?tab=perfil"
        aria-label="Abrir meu perfil"
        className="shrink-0 rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <Avatar
          name={user.name}
          src={user.avatarUrl}
          className="size-12 text-base sm:size-16 sm:text-xl"
        />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}, {firstName(user.name)}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{dateLabel}</p>
      </div>
    </div>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellOff, CheckCheck } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import { formatDateTimeBR, NOTIFICATION_TYPE_LABEL } from '@routeflow/types';
import { Badge, Button, cn, EmptyState, PageHeader } from '@routeflow/ui';
import { ErrorState, ListSkeleton, toastError } from '@/components/states';
import { api } from '@/lib/api';
import { keys, useNotifications } from '@/lib/queries';

export function NotificationsPage() {
  const client = useQueryClient();
  const { data, error, isLoading, refetch } = useNotifications();
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: keys.notifications }),
      client.invalidateQueries({ queryKey: keys.unread }),
    ]);
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: refresh,
    onError: toastError,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: refresh,
    onError: toastError,
  });
  React.useEffect(() => {
    document.title = 'Notificações — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader
        title="Notificações"
        description="Autorizações vencendo, visitas do dia e alterações de rota."
        actions={
          <Button
            variant="outline"
            onClick={() => readAll.mutate()}
            loading={readAll.isPending}
            disabled={!data?.some((n) => !n.read)}
          >
            <CheckCheck /> Marcar todas como lidas
          </Button>
        }
      />
      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon={BellOff}
          title="Nenhuma notificação por enquanto."
          description="Avisaremos aqui sobre vencimentos de autorização e visitas pendentes."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((n) => (
            <li
              key={n.id}
              className={cn('rounded-lg border bg-card p-4', !n.read && 'border-l-4 border-l-line')}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge tone={n.type.startsWith('AUTHORIZATION') ? 'warning' : 'info'}>
                    {NOTIFICATION_TYPE_LABEL[n.type]}
                  </Badge>
                  <p className="mt-1.5 font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTimeBR(n.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {n.link ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={n.link} onClick={() => !n.read && markRead.mutate(n.id)}>
                        Abrir
                      </Link>
                    </Button>
                  ) : null}
                  {!n.read ? (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                      Marcar como lida
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

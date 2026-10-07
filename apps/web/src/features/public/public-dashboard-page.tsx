import { useQuery } from '@tanstack/react-query';
import { Camera, Eye, Link2Off } from 'lucide-react';
import * as React from 'react';
import { useParams } from 'react-router';
import {
  endOfMonthIso,
  formatDateBR,
  formatDateTimeBR,
  formatTimeBR,
  PHOTO_CATEGORY_LABEL,
  startOfMonthIso,
  todayIso,
  VISIT_ACTIVITY_TYPE_LABEL,
  type PublicPanelDto,
  type PublicVisitDetailDto,
} from '@routeflow/types';
import { Badge, Drawer, DrawerContent, EmptyState, Spinner } from '@routeflow/ui';
import { Wordmark } from '@/components/brand';
import { ManagerPanel } from '@/components/manager-panel';
import { PeriodPicker, type PeriodPreset } from '@/components/period';
import { PageSkeleton } from '@/components/states';
import { VisitStatusBadge } from '@/components/status';
import { ApiError, request } from '@/lib/api';

/** Painel do empregador/gestor: somente leitura, acessado por token. */
export function PublicDashboardPage() {
  const { token = '' } = useParams();
  const [period, setPeriod] = React.useState<{ preset: PeriodPreset; from: string; to: string }>({
    preset: 'month',
    from: startOfMonthIso(todayIso()),
    to: endOfMonthIso(todayIso()),
  });
  const [visitId, setVisitId] = React.useState<string | null>(null);
  const panel = useQuery({
    queryKey: ['public', token, period.from, period.to],
    queryFn: () =>
      request<PublicPanelDto>('GET', `/public/${token}`, {
        query: { from: period.from, to: period.to },
        auth: false,
      }),
    retry: false,
  });
  const visit = useQuery({
    queryKey: ['public-visit', token, visitId],
    queryFn: () =>
      request<PublicVisitDetailDto>('GET', `/public/${token}/visits/${visitId}`, { auth: false }),
    enabled: !!visitId,
  });
  React.useEffect(() => {
    document.title = 'Painel da operação — RouteFlow';
  }, []);

  if (panel.isLoading)
    return (
      <div className="mx-auto max-w-6xl p-4">
        <PageSkeleton />
      </div>
    );
  if (panel.error || !panel.data) {
    const expired = panel.error instanceof ApiError && panel.error.status === 404;
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
        <Wordmark className="mb-6" />
        <EmptyState
          icon={Link2Off}
          title={expired ? 'Link inválido ou expirado.' : 'Não foi possível carregar o painel.'}
          description="Peça um novo link a quem compartilhou este painel."
        />
      </div>
    );
  }
  const p = panel.data;
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Wordmark />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="info">
              <Eye /> Somente leitura
            </Badge>
            <span className="text-muted-foreground">
              {p.label}
              {p.expiresAt ? ` — válido até ${formatDateTimeBR(p.expiresAt)}` : ''}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{p.companyName}: painel da operação</h1>
          <p className="text-sm text-muted-foreground">
            Atualizado em {formatDateTimeBR(p.generatedAt)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <PeriodPicker {...period} onChange={setPeriod} />
        </div>
        <ManagerPanel metrics={p.metrics} showExpenses={p.scope.includes('expenses')} />
        {p.scope.includes('visits') ? (
          <section className="rounded-lg border bg-card p-4 sm:p-5" aria-label="Visitas recentes">
            <h2 className="mb-3 font-bold">Visitas recentes</h2>
            {p.recentVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma visita registrada no período.</p>
            ) : (
              <ul className="divide-y">
                {p.recentVisits.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setVisitId(v.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{v.store.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateBR(v.scheduledDate)} — {v.store.code} — {v.store.neighborhood}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {v.photoCount ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Camera className="size-3.5" />
                            {v.photoCount}
                          </span>
                        ) : null}
                        <VisitStatusBadge status={v.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
      <Drawer open={!!visitId} onOpenChange={(o) => !o && setVisitId(null)}>
        <DrawerContent
          title={visit.data?.store.name ?? 'Visita'}
          description={
            visit.data
              ? `${formatDateBR(visit.data.scheduledDate)} — ${visit.data.store.code}`
              : undefined
          }
        >
          {visit.isLoading || !visit.data ? (
            <Spinner />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <VisitStatusBadge status={visit.data.status} />
                {visit.data.startedAt ? (
                  <span className="text-sm text-muted-foreground">
                    {formatTimeBR(visit.data.startedAt)} – {formatTimeBR(visit.data.finishedAt)}
                  </span>
                ) : null}
              </div>
              {visit.data.statusReason ? (
                <p className="text-sm">Motivo: {visit.data.statusReason}</p>
              ) : null}
              {visit.data.notes ? (
                <p className="text-sm whitespace-pre-line">{visit.data.notes}</p>
              ) : null}
              {visit.data.photos.length ? (
                <ul className="grid grid-cols-2 gap-2">
                  {visit.data.photos.map((ph) => (
                    <li key={ph.id}>
                      <a
                        href={ph.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square overflow-hidden rounded-md border bg-muted"
                      >
                        <img
                          src={ph.thumbnailUrl ?? ph.url}
                          alt={PHOTO_CATEGORY_LABEL[ph.category]}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ol className="flex flex-col gap-2 border-l-2 border-line/50 pl-4">
                {visit.data.activities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-semibold">{a.description}</span>
                    <span className="block text-xs text-muted-foreground">
                      {VISIT_ACTIVITY_TYPE_LABEL[a.type]} — {formatDateTimeBR(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

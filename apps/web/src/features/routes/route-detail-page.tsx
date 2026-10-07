import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Bus,
  ExternalLink,
  Footprints,
  House,
  MapPin,
  Plus,
  RefreshCw,
  TrainFront,
  Trash,
  Waypoints,
} from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router';
import {
  formatBRL,
  formatDistance,
  formatDuration,
  formatLongDateBR,
  TRANSPORT_MODE_LABEL,
  type OptimizationPreviewDto,
  type RouteDetailDto,
  type RouteLegDto,
} from '@routeflow/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Dialog,
  DialogContent,
  DialogFooter,
  PageHeader,
  StatCard,
  toast,
} from '@routeflow/ui';
import { ErrorState, PageSkeleton, toastError } from '@/components/states';
import {
  RouteStatusBadge,
  StoreAuthBadge,
  VisitStatusBadge,
  visitState,
} from '@/components/status';
import { StorePicker } from '@/components/store-picker';
import { api } from '@/lib/api';
import { keys, useInvalidateOperation, useRoute } from '@/lib/queries';
import { SortableList } from './sortable';

function LegInfo({ leg }: { leg: RouteLegDto | undefined }) {
  if (!leg) return null;
  if (leg.mode === null && leg.distanceMeters == null) {
    return (
      <div className="ml-[3.25rem] py-1 text-xs">
        <a
          href={leg.transitUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
        >
          Trajeto em transporte público <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    );
  }
  const Icon =
    leg.mode === 'WALKING'
      ? Footprints
      : leg.mode === 'METRO' || leg.mode === 'TRAIN'
        ? TrainFront
        : Bus;
  return (
    <div className="ml-[3.25rem] flex flex-wrap items-center gap-x-3 gap-y-1 py-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Icon className="size-3.5" />
        {leg.summary ?? (leg.mode ? TRANSPORT_MODE_LABEL[leg.mode] : 'Trecho')}
      </span>
      {leg.durationSeconds != null ? <span>{formatDuration(leg.durationSeconds)}</span> : null}
      {leg.distanceMeters != null ? <span>{formatDistance(leg.distanceMeters)}</span> : null}
      {leg.cost != null ? <span>{formatBRL(leg.cost)}</span> : null}
      <a
        href={leg.transitUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
      >
        Trajeto em transporte público <ArrowUpRight className="size-3.5" />
      </a>
    </div>
  );
}

export function RouteDetailPage() {
  const { id = '' } = useParams();
  const route = useRoute(id);
  const client = useQueryClient();
  const invalidate = useInvalidateOperation();
  const [order, setOrder] = React.useState<RouteDetailDto['stops']>([]);
  const [adding, setAdding] = React.useState('');
  const [preview, setPreview] = React.useState<OptimizationPreviewDto | null>(null);
  React.useEffect(() => {
    if (route.data) setOrder(route.data.stops);
  }, [route.data]);
  React.useEffect(() => {
    document.title = 'Rota do dia — RouteFlow';
  }, []);

  const onSaved = (data: RouteDetailDto) => {
    client.setQueryData(keys.route(id), data);
    void invalidate();
  };
  const reorder = useMutation({
    mutationFn: (stopIds: string[]) =>
      api.put<RouteDetailDto>(`/routes/${id}/stops/order`, { stopIds }),
    onSuccess: onSaved,
    onError: (e) => {
      toastError(e);
      if (route.data) setOrder(route.data.stops);
    },
  });
  const addStop = useMutation({
    mutationFn: (storeId: string) => api.post<RouteDetailDto>(`/routes/${id}/stops`, { storeId }),
    onSuccess: (d) => {
      setAdding('');
      onSaved(d);
      toast.success('Loja adicionada à rota.');
    },
    onError: toastError,
  });
  const removeStop = useMutation({
    mutationFn: (stopId: string) => api.delete<RouteDetailDto>(`/routes/${id}/stops/${stopId}`),
    onSuccess: (d) => {
      onSaved(d);
      toast.success('Loja removida da rota.');
    },
    onError: toastError,
  });
  const recalc = useMutation({
    mutationFn: () => api.post<RouteDetailDto>(`/routes/${id}/recalculate`),
    onSuccess: (d) => {
      onSaved(d);
      toast.success('Trajetos recalculados.');
    },
    onError: toastError,
  });
  const optimize = useMutation({
    mutationFn: (apply: boolean) =>
      api.post<OptimizationPreviewDto>(`/routes/${id}/optimize`, { apply }),
    onSuccess: (result, apply) => {
      if (apply) {
        setPreview(null);
        toast.success(
          result.applied ? 'Nova ordem aplicada.' : 'A ordem atual já é a melhor encontrada.',
        );
        void client.invalidateQueries({ queryKey: keys.route(id) });
        void invalidate();
      } else setPreview(result);
    },
    onError: toastError,
  });

  if (route.isLoading) return <PageSkeleton />;
  if (route.error || !route.data)
    return <ErrorState error={route.error} onRetry={() => void route.refetch()} />;
  const r = route.data;
  const legs = r.legs;
  const names = new Map(r.stops.map((s) => [s.id, s.store.name]));

  return (
    <>
      <PageHeader
        title={`Rota de ${formatLongDateBR(r.date, false)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RouteStatusBadge status={r.status} />
            {r.region ? <Badge tone="outline">{r.region}</Badge> : null}
            <span>{r.stopCount} lojas</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => recalc.mutate()} loading={recalc.isPending}>
              <RefreshCw /> Recalcular
            </Button>
            <Button
              variant="outline"
              onClick={() => optimize.mutate(false)}
              loading={optimize.isPending && !preview}
            >
              <Waypoints /> Otimizar
            </Button>
          </>
        }
      />
      {r.holiday ? (
        <Alert
          tone="info"
          title={`${r.holiday.kind === 'national' ? 'Feriado' : 'Ponto facultativo'}: ${r.holiday.name}`}
          className="mb-4"
        >
          Confirme o funcionamento das lojas.
        </Alert>
      ) : null}
      {r.legs.length > 0 && r.legs.every((l) => l.mode === null && l.distanceMeters == null) ? (
        <Alert
          tone="neutral"
          title="Distância, tempo e custo dos trechos ainda não calculados."
          className="mb-4"
        >
          {r.optimizeHint ?? 'Os trajetos serão calculados quando houver coordenadas.'} Os links de
          transporte público funcionam normalmente.
        </Alert>
      ) : null}
      {!r.startAddress ? (
        <Alert
          tone="warning"
          title="Cadastre seu endereço de casa"
          className="mb-4"
          action={
            <Button asChild size="sm" variant="ghost">
              <Link to="/configuracoes">Configurar</Link>
            </Button>
          }
        >
          Ele é a origem e o destino da rota.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-label="Paradas da rota"
          className="min-w-0 rounded-lg border bg-card p-3 sm:p-5"
        >
          <div className="relative">
            <span
              aria-hidden
              className="absolute top-5 bottom-5 left-[3.15rem] w-1 rounded-full bg-line/80"
            />
            <div className="flex items-center gap-3 py-2 pl-10">
              <span className="z-10 inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background">
                <House className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold">Saída: Casa</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {r.startAddress}
                </span>
              </span>
            </div>
            <SortableList
              items={order}
              onReorder={(items) => {
                setOrder(items);
                reorder.mutate(items.map((s) => s.id));
              }}
              disabled={reorder.isPending}
              renderItem={(stop, handle, index) => {
                const leg = legs[r.stops.findIndex((s) => s.id === stop.id) === index ? index : -1];
                return (
                  <div>
                    {reorder.isPending ? null : <LegInfo leg={leg} />}
                    <div className="flex items-center gap-1">
                      {handle ?? <span className="w-10" />}
                      <span
                        className={cn(
                          'z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                          visitState(stop.visit?.status) === 'done'
                            ? 'bg-success text-white'
                            : visitState(stop.visit?.status) === 'active'
                              ? 'bg-primary text-primary-foreground'
                              : 'border-2 border-line bg-card',
                        )}
                      >
                        {index + 1}
                      </span>
                      <Link
                        to={stop.visit ? `/visitas/${stop.visit.id}` : `/lojas/${stop.store.id}`}
                        className="ml-2 flex min-h-14 min-w-0 flex-1 flex-col justify-center rounded-md px-1 hover:bg-muted/50"
                      >
                        <span className="truncate font-semibold">{stop.store.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {stop.store.code} — {stop.store.neighborhood}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {stop.visit ? <VisitStatusBadge status={stop.visit.status} /> : null}
                          <StoreAuthBadge info={stop.authorization} />
                        </span>
                      </Link>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Abrir ${stop.store.name} no Google Maps`}
                      >
                        <a href={stop.store.mapsUrl} target="_blank" rel="noreferrer">
                          <MapPin />
                        </a>
                      </Button>
                      {stop.visit?.status === 'PENDING' && stop.visit.photoCount === 0 ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remover ${stop.store.name} da rota`}
                          onClick={() =>
                            window.confirm(`Remover ${stop.store.name} desta rota?`) &&
                            removeStop.mutate(stop.id)
                          }
                        >
                          <Trash />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
            <LegInfo leg={legs[legs.length - 1]} />
            <div className="flex items-center gap-3 py-2 pl-10">
              <span className="z-10 inline-flex size-9 items-center justify-center rounded-full bg-foreground text-background">
                <House className="size-4" />
              </span>
              <span className="font-bold">Retorno: Casa</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row">
            <div className="min-w-0 flex-1">
              <StorePicker
                id="route-add-store"
                value={adding}
                onChange={setAdding}
                exclude={r.stops.map((s) => s.store.id)}
              />
            </div>
            <Button
              variant="outline"
              disabled={!adding}
              loading={addStop.isPending}
              onClick={() => addStop.mutate(adding)}
            >
              <Plus /> Adicionar loja
            </Button>
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Abrir no Google Maps</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {r.fullRouteLinks.map((link) => (
                <Button
                  key={link.part}
                  asChild
                  variant={link.part === 1 ? 'line' : 'outline'}
                  block
                >
                  <a href={link.url} target="_blank" rel="noreferrer">
                    <ExternalLink /> Rota completa
                    {link.totalParts > 1 ? ` (parte ${link.part}/${link.totalParts})` : ''}
                  </a>
                </Button>
              ))}
              <p className="text-xs text-muted-foreground">
                Visão geral {r.fullRouteTravelMode === 'driving' ? 'de carro' : 'a pé'} com até 9
                paradas por link. O Google Maps não aceita paradas múltiplas em transporte público:
                use “Trajeto em transporte público” em cada trecho.
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Distância"
              value={r.estimatedDistance != null ? formatDistance(r.estimatedDistance) : '—'}
            />
            <StatCard
              label="Deslocamento"
              value={r.estimatedDuration != null ? formatDuration(r.estimatedDuration) : '—'}
            />
            <StatCard
              label="Custo estimado"
              value={r.estimatedTransportCost != null ? formatBRL(r.estimatedTransportCost) : '—'}
            />
            <StatCard
              label="Custo real"
              value={r.actualTransportCost != null ? formatBRL(r.actualTransportCost) : '—'}
              hint="soma das despesas"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Trajetos:{' '}
            {r.legsProvider === 'google'
              ? 'Google Routes (transporte público)'
              : 'estimativa local (distância × fator urbano + tarifas cadastradas)'}
            .{r.optimizeHint ? ` ${r.optimizeHint}` : ''}
          </p>
        </aside>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        {preview ? (
          <DialogContent
            title="Otimizar rota"
            description="A otimização é opcional: a ordem atual só muda se você aplicar."
          >
            {!preview.canOptimize ? (
              <Alert tone="warning" title={preview.reason ?? 'Não é possível otimizar.'}>
                {preview.missingCoordinates.length
                  ? `Sem coordenadas: ${preview.missingCoordinates.slice(0, 5).join(', ')}${preview.missingCoordinates.length > 5 ? '…' : ''}`
                  : r.optimizeHint}
              </Alert>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Atual" value={`${preview.currentDistanceKm} km`} />
                  <StatCard
                    label="Proposta"
                    value={`${preview.proposedDistanceKm} km`}
                    tone="success"
                  />
                  <StatCard label="Economia" value={`${preview.improvementKm} km`} tone="line" />
                </div>
                <ol className="flex flex-col gap-1 text-sm">
                  {preview.proposedOrder.map((sid, i) => (
                    <li key={sid} className="flex gap-2">
                      <span className="w-6 text-right font-bold tabular-nums">{i + 1}.</span>{' '}
                      {names.get(sid)}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Manter ordem atual
              </Button>
              {preview.canOptimize ? (
                <Button
                  onClick={() => optimize.mutate(true)}
                  loading={optimize.isPending}
                  disabled={(preview.improvementKm ?? 0) <= 0.01}
                >
                  Aplicar nova ordem
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

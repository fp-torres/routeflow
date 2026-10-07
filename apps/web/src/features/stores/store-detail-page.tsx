import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FileText, LocateFixed, Pencil, Play } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  formatDateBR,
  todayIso,
  type Paginated,
  type StoreCreateInput,
  type StoreDetailDto,
  type VisitDetailDto,
  type VisitSummaryDto,
} from '@routeflow/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  EmptyState,
  PageHeader,
  StatCard,
  toast,
} from '@routeflow/ui';
import { ErrorState, PageSkeleton, toastError } from '@/components/states';
import { StoreAuthBadge, ValidityBadge, VisitStatusBadge } from '@/components/status';
import { api } from '@/lib/api';
import { keys, useInvalidateOperation, useStore } from '@/lib/queries';
import { StoreForm } from './store-form';

export function StoreDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const invalidate = useInvalidateOperation();
  const store = useStore(id);
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => {
    if (store.data) document.title = `${store.data.name} — RouteFlow`;
  }, [store.data]);
  const update = useMutation({
    mutationFn: (data: StoreCreateInput) => api.patch(`/stores/${id}`, data),
    onSuccess: () => {
      setEditing(false);
      toast.success('Loja atualizada.');
      void client.invalidateQueries({ queryKey: keys.store(id) });
      void client.invalidateQueries({ queryKey: ['stores'] });
    },
    onError: toastError,
  });
  const geocode = useMutation({
    mutationFn: () =>
      api.post<{ updated: boolean; store: StoreDetailDto }>(`/stores/${id}/geocode`),
    onSuccess: (r) => {
      client.setQueryData(keys.store(id), r.store);
      if (r.updated) toast.success('Coordenadas atualizadas.');
      else
        toast.warning(
          'Não foi possível encontrar as coordenadas. Confira o endereço ou informe manualmente.',
        );
    },
    onError: toastError,
  });
  const startVisit = useMutation({
    mutationFn: async () => {
      const today = todayIso();
      const existing = await api.get<Paginated<VisitSummaryDto>>('/visits', {
        date: today,
        storeId: id,
      });
      const open = existing.items.find(
        (v) => v.status !== 'RESCHEDULED' && v.status !== 'CANCELLED',
      );
      if (open) return open.id;
      return (await api.post<VisitDetailDto>('/visits', { storeId: id, scheduledDate: today })).id;
    },
    onSuccess: (visitId) => {
      void invalidate();
      navigate(`/visitas/${visitId}`);
    },
    onError: toastError,
  });

  if (store.isLoading) return <PageSkeleton />;
  if (store.error || !store.data)
    return <ErrorState error={store.error} onRetry={() => void store.refetch()} />;
  const s = store.data;
  const hasCoords = s.latitude != null && s.longitude != null;
  const bbox = hasCoords
    ? `${s.longitude! - 0.004},${s.latitude! - 0.0028},${s.longitude! + 0.004},${s.latitude! + 0.0028}`
    : '';

  return (
    <>
      <PageHeader
        title={s.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="outline">{s.code}</Badge>
            <span>{s.network}</span>
            {s.region ? <span>— {s.region}</span> : null}
            {!s.active ? <Badge>Inativa</Badge> : null}
          </span>
        }
        actions={
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil /> Editar
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4 sm:pt-5">
              <p className="text-[1.05rem]">{s.fullAddress}</p>
              <div className="flex flex-wrap items-center gap-2">
                <StoreAuthBadge info={s.authorization} />
                {s.geocodeSource ? (
                  <Badge tone="outline">coordenadas: {s.geocodeSource}</Badge>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button asChild variant="outline">
                  <a href={s.mapsUrl} target="_blank" rel="noreferrer">
                    <ExternalLink /> Abrir mapa
                  </a>
                </Button>
                <Button
                  variant="line"
                  onClick={() => startVisit.mutate()}
                  loading={startVisit.isPending}
                  disabled={!s.active}
                >
                  <Play /> Iniciar visita
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/lojas/${s.id}/autorizacoes`}>
                    <FileText /> Autorizações ({s.letters.length})
                  </Link>
                </Button>
              </div>
              {s.observations ? (
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {s.observations}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mapa</CardTitle>
            </CardHeader>
            <CardContent>
              {hasCoords ? (
                <iframe
                  title={`Mapa de ${s.name}`}
                  className="h-64 w-full rounded-md border"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${s.latitude},${s.longitude}`}
                />
              ) : (
                <Alert
                  tone="neutral"
                  title="Loja sem coordenadas."
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => geocode.mutate()}
                      loading={geocode.isPending}
                    >
                      <LocateFixed /> Buscar
                    </Button>
                  }
                >
                  Coordenadas permitem calcular distâncias e otimizar a rota.
                </Alert>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Últimas visitas</CardTitle>
            </CardHeader>
            <CardContent>
              {s.recentVisits.length === 0 ? (
                <EmptyState title="Nenhuma visita registrada." className="py-6" />
              ) : (
                <ul className="divide-y">
                  {s.recentVisits.map((v) => (
                    <li key={v.id}>
                      <Link
                        to={`/visitas/${v.id}`}
                        className="flex items-center justify-between gap-2 py-2.5 hover:underline"
                      >
                        <span>{formatDateBR(v.scheduledDate)}</span>
                        <VisitStatusBadge status={v.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Visitas" value={s.stats.totalVisits} />
            <StatCard
              label="Concluídas"
              value={s.stats.completedVisits}
              hint={
                s.stats.lastVisitDate
                  ? `última em ${formatDateBR(s.stats.lastVisitDate)}`
                  : undefined
              }
              tone="success"
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Autorizações</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {s.letters.slice(0, 3).map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 hover:bg-muted/50"
                >
                  <span className="min-w-0 truncate text-sm font-semibold">{l.title}</span>
                  <ValidityBadge validity={l.validity} daysLeft={l.daysLeft} />
                </a>
              ))}
              {s.letters.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma carta cadastrada.</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fotos recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {s.recentPhotos.length === 0 ? (
                <p className="text-sm text-muted-foreground">As fotos das visitas aparecem aqui.</p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {s.recentPhotos.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/visitas/${p.visitId}`}
                        className="block aspect-square overflow-hidden rounded-md border bg-muted"
                      >
                        <img
                          src={p.thumbnailUrl ?? p.url}
                          alt={`Foto de ${formatDateBR(p.scheduledDate)}`}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent title="Editar loja" size="lg">
          <StoreForm
            store={s}
            submitting={update.isPending}
            onSubmit={(d) => update.mutate(d)}
            onCancel={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

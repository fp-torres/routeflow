import { useMutation } from '@tanstack/react-query';
import { Camera, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  addDaysIso,
  formatLongDateBR,
  formatTimeBR,
  isIsoDate,
  todayIso,
  type VisitDetailDto,
  type VisitStatus,
} from '@routeflow/types';
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SegmentedControl,
} from '@routeflow/ui';
import { ExportButtons } from '@/components/export-buttons';
import { ErrorState, ListSkeleton, toastError } from '@/components/states';
import { StoreAuthBadge, VisitStatusBadge } from '@/components/status';
import { StorePicker } from '@/components/store-picker';
import { api } from '@/lib/api';
import { useInvalidateOperation, useVisits } from '@/lib/queries';

const FILTERS: Array<{ value: string; label: string; status?: VisitStatus[] }> = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Pendentes', status: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
  { value: 'done', label: 'Concluídas', status: ['COMPLETED'] },
  {
    value: 'failed',
    label: 'Não realizadas',
    status: ['NOT_COMPLETED', 'RESCHEDULED', 'CANCELLED'],
  },
];

export function VisitsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const invalidate = useInvalidateOperation();
  const date = isIsoDate(params.get('date')) ? params.get('date')! : todayIso();
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [newVisit, setNewVisit] = React.useState({ storeId: '', scheduledDate: date });
  const status = FILTERS.find((f) => f.value === filter)?.status;
  const visits = useVisits({ date, status, search: search.trim() || undefined, pageSize: 100 });
  const create = useMutation({
    mutationFn: () => api.post<VisitDetailDto>('/visits', newVisit),
    onSuccess: (v) => {
      void invalidate();
      navigate(`/visitas/${v.id}`);
    },
    onError: toastError,
  });
  React.useEffect(() => {
    document.title = 'Visitas — RouteFlow';
  }, []);
  const setDate = (d: string) => setParams({ date: d }, { replace: true });

  return (
    <>
      <PageHeader
        title="Visitas"
        description={formatLongDateBR(date)}
        actions={
          <Button
            onClick={() => {
              setNewVisit({ storeId: '', scheduledDate: date });
              setCreating(true);
            }}
          >
            <Plus /> Nova visita
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(addDaysIso(date, -1))}
            aria-label="Dia anterior"
          >
            <ChevronLeft />
          </Button>
          <DatePicker
            aria-label="Data das visitas"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="flex-1 sm:max-w-56"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(addDaysIso(date, 1))}
            aria-label="Próximo dia"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <SegmentedControl
            label="Filtrar por status"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Buscar loja"
              placeholder="Buscar por loja, código ou bairro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>
      {visits.isLoading ? (
        <ListSkeleton />
      ) : visits.error ? (
        <ErrorState error={visits.error} onRetry={() => void visits.refetch()} />
      ) : !visits.data?.items.length ? (
        <EmptyState
          title="Você ainda não possui visitas para este dia."
          description="Escolha outra data ou crie uma visita."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visits.data.items.map((v) => (
            <li key={v.id}>
              <Link
                to={`/visitas/${v.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/40 sm:p-4"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-line font-bold tabular-nums">
                  {v.order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{v.store.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {v.store.code} — {v.store.neighborhood}{' '}
                    {v.store.region ? `(${v.store.region})` : ''}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <VisitStatusBadge status={v.status} />
                    <StoreAuthBadge info={v.authorization} />
                    {v.photoCount ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Camera className="size-3.5" /> {v.photoCount}
                      </span>
                    ) : null}
                    {v.startedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {formatTimeBR(v.startedAt)}
                        {v.finishedAt ? `–${formatTimeBR(v.finishedAt)}` : ''}
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <ExportButtons type="visits" query={{ from: date, to: date }} />
      </div>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent
          title="Nova visita"
          description="A loja entra no fim da rota do dia (a rota é criada se ainda não existir)."
        >
          <div className="flex flex-col gap-3">
            <Field label="Loja" htmlFor="new-visit-store">
              <StorePicker
                id="new-visit-store"
                value={newVisit.storeId}
                onChange={(storeId) => setNewVisit((v) => ({ ...v, storeId }))}
              />
            </Field>
            <Field label="Data" htmlFor="new-visit-date">
              <DatePicker
                id="new-visit-date"
                value={newVisit.scheduledDate}
                onChange={(e) => setNewVisit((v) => ({ ...v, scheduledDate: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!newVisit.storeId || !newVisit.scheduledDate}
            >
              Criar visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

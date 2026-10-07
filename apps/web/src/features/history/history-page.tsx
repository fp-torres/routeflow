import { Camera, Search } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import {
  endOfMonthIso,
  formatDateBR,
  formatTimeBR,
  startOfMonthIso,
  todayIso,
  VISIT_STATUS_LABEL,
  VISIT_STATUSES,
  type VisitStatus,
} from '@routeflow/types';
import { Button, EmptyState, Input, PageHeader, Select } from '@routeflow/ui';
import { ExportButtons } from '@/components/export-buttons';
import { PeriodPicker, type PeriodPreset } from '@/components/period';
import { ErrorState, ListSkeleton } from '@/components/states';
import { StoreAuthBadge, VisitStatusBadge } from '@/components/status';
import { useAuth } from '@/lib/auth';
import { useCatalog, useUsers, useVisits } from '@/lib/queries';

export function HistoryPage() {
  const { user } = useAuth();
  const catalog = useCatalog();
  const users = useUsers(user?.role !== 'EMPLOYEE');
  const [period, setPeriod] = React.useState<{ preset: PeriodPreset; from: string; to: string }>({
    preset: 'month',
    from: startOfMonthIso(todayIso()),
    to: endOfMonthIso(todayIso()),
  });
  const [filters, setFilters] = React.useState({
    status: '',
    network: '',
    region: '',
    search: '',
    employeeId: '',
  });
  const [page, setPage] = React.useState(1);
  const query = {
    from: period.from,
    to: period.to,
    status: filters.status ? [filters.status] : undefined,
    network: filters.network || undefined,
    region: filters.region || undefined,
    search: filters.search.trim() || undefined,
    employeeId: filters.employeeId || undefined,
    page,
    pageSize: 30,
  };
  const visits = useVisits(query);
  const set =
    (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((f) => ({ ...f, [key]: e.target.value }));
      setPage(1);
    };
  React.useEffect(() => {
    document.title = 'Histórico — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader
        title="Histórico"
        description="Todas as visitas registradas, com filtros por período, loja, rede, região e status."
      />
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-4">
        <PeriodPicker
          {...period}
          onChange={(p) => {
            setPeriod(p);
            setPage(1);
          }}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label="Status" value={filters.status} onChange={set('status')}>
            <option value="">Todos os status</option>
            {VISIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VISIT_STATUS_LABEL[s as VisitStatus]}
              </option>
            ))}
          </Select>
          <Select aria-label="Rede" value={filters.network} onChange={set('network')}>
            <option value="">Todas as redes</option>
            {catalog.data?.networks.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Select aria-label="Região" value={filters.region} onChange={set('region')}>
            <option value="">Todas as regiões</option>
            {catalog.data?.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {users.data && users.data.length > 1 ? (
            <Select
              aria-label="Funcionário"
              value={filters.employeeId}
              onChange={set('employeeId')}
            >
              <option value="">Todos os funcionários</option>
              {users.data.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar loja"
                placeholder="Loja, código ou bairro"
                value={filters.search}
                onChange={set('search')}
                className="pl-9"
              />
            </div>
          )}
        </div>
        <ExportButtons
          type="history"
          query={{
            from: period.from,
            to: period.to,
            network: query.network,
            region: query.region,
            status: query.status,
            employeeId: query.employeeId,
          }}
        />
      </div>
      {visits.isLoading ? (
        <ListSkeleton />
      ) : visits.error ? (
        <ErrorState error={visits.error} onRetry={() => void visits.refetch()} />
      ) : !visits.data?.items.length ? (
        <EmptyState title="Nenhuma visita encontrada no período." />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">{visits.data.total} visita(s)</p>
          <ul className="flex flex-col gap-2">
            {visits.data.items.map((v) => (
              <li key={v.id}>
                <Link
                  to={`/visitas/${v.id}`}
                  className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                >
                  <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
                    {formatDateBR(v.scheduledDate)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{v.store.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {v.store.code} — {v.store.network} — {v.store.neighborhood}
                      {v.employee ? ` — ${v.employee.name}` : ''}
                    </span>
                    {v.notes ? (
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        “{v.notes}”
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <VisitStatusBadge status={v.status} />
                    <StoreAuthBadge info={v.authorization} />
                    {v.photoCount ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Camera className="size-3.5" />
                        {v.photoCount}
                      </span>
                    ) : null}
                    {v.startedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {formatTimeBR(v.startedAt)}–{formatTimeBR(v.finishedAt)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {visits.data.totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm tabular-nums">
                {page} de {visits.data.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= visits.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

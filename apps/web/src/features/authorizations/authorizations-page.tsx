import { FileText, Search } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';
import { describeDaysLeft, formatDateBR, type AuthorizationValidity } from '@routeflow/types';
import { EmptyState, Input, PageHeader, SegmentedControl } from '@routeflow/ui';
import { ExportButtons } from '@/components/export-buttons';
import { ErrorState, ListSkeleton } from '@/components/states';
import { ValidityBadge } from '@/components/status';
import { useLetters } from '@/lib/queries';

const FILTERS: Record<string, AuthorizationValidity[] | undefined> = {
  all: undefined,
  CRITICAL: ['CRITICAL'],
  EXPIRING: ['EXPIRING'],
  EXPIRED: ['EXPIRED'],
  VALID: ['VALID', 'NO_EXPIRATION'],
};

export function AuthorizationsPage() {
  const [params, setParams] = useSearchParams();
  const filter =
    params.get('validity') && FILTERS[params.get('validity')!] ? params.get('validity')! : 'all';
  const [search, setSearch] = React.useState('');
  const letters = useLetters({ validity: FILTERS[filter], search: search.trim() || undefined });
  React.useEffect(() => {
    document.title = 'Autorizações — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader
        title="Autorizações"
        description="Cartas de autorização de todas as lojas e seus vencimentos."
        actions={<ExportButtons type="authorizations" query={{}} />}
      />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SegmentedControl
          label="Filtrar por situação"
          value={filter}
          onChange={(v) => setParams(v === 'all' ? {} : { validity: v }, { replace: true })}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'CRITICAL', label: 'Vencem em 7 dias' },
            { value: 'EXPIRING', label: 'Até 30 dias' },
            { value: 'EXPIRED', label: 'Expiradas' },
            { value: 'VALID', label: 'Válidas' },
          ]}
        />
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar autorizações"
            placeholder="Buscar por loja, código ou título"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {letters.isLoading ? (
        <ListSkeleton />
      ) : letters.error ? (
        <ErrorState error={letters.error} onRetry={() => void letters.refetch()} />
      ) : !letters.data?.length ? (
        <EmptyState
          icon={FileText}
          title={
            filter === 'CRITICAL'
              ? 'Não há autorizações próximas do vencimento.'
              : 'Nenhuma carta encontrada.'
          }
          description="Envie cartas pela página de cada loja."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {letters.data.map((l) => (
            <li key={l.id}>
              <Link
                to={`/lojas/${l.storeId}/autorizacoes`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:bg-muted/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{l.store?.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.store?.code} — {l.title} — vence {formatDateBR(l.expirationDate)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {describeDaysLeft(l.daysLeft)}
                  </span>
                </span>
                <ValidityBadge validity={l.validity} daysLeft={l.daysLeft} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

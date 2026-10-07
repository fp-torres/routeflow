import { FileText, Plus, Search } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AuthorizationValidity } from '@routeflow/types';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
} from '@routeflow/ui';
import { ExportButtons } from '@/components/export-buttons';
import { ErrorState, ListSkeleton } from '@/components/states';
import { useAuth } from '@/lib/auth';
import { useAllStores, useLetters } from '@/lib/queries';
import { byStoreCode, LetterDialog, LetterList } from './letter-dialogs';

const FILTERS: Record<string, AuthorizationValidity[] | undefined> = {
  all: undefined,
  CRITICAL: ['CRITICAL'],
  EXPIRING: ['EXPIRING'],
  EXPIRED: ['EXPIRED'],
  VALID: ['VALID', 'NO_EXPIRATION'],
};

export function AuthorizationsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter =
    params.get('validity') && FILTERS[params.get('validity')!] ? params.get('validity')! : 'all';
  const [search, setSearch] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const letters = useLetters({ validity: FILTERS[filter], search: search.trim() || undefined });
  const stores = useAllStores();
  const active = (stores.data ?? []).filter((s) => s.active);
  const uncovered = active
    .filter((s) => s.authorization?.required && !s.authorization.hasValid)
    .sort(byStoreCode);
  const notRequired = active.filter((s) => s.authorization?.required === false).length;
  React.useEffect(() => {
    document.title = 'Autorizações — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader
        title="Autorizações"
        description="Cartas de autorização, lojas cobertas e vencimentos."
        actions={
          <>
            <Button onClick={() => setCreating(true)}>
              <Plus /> Enviar carta
            </Button>
            <ExportButtons type="authorizations" query={{}} />
          </>
        }
      />
      {stores.data ? (
        <div className="mb-4">
          {uncovered.length ? (
            <Alert
              tone="warning"
              title={`${uncovered.length} loja(s) que exigem carta estão sem carta válida`}
            >
              <div className="mt-1 flex flex-wrap gap-1">
                {uncovered.map((s) => (
                  <Link key={s.id} to={`/lojas/${s.id}/autorizacoes`} title={s.name}>
                    <Badge tone="warning">{s.code}</Badge>
                  </Link>
                ))}
              </div>
              {notRequired ? (
                <p className="mt-2 text-xs">
                  {notRequired} loja(s) de redes que não exigem carta (ex.: Cristal).
                </p>
              ) : null}
            </Alert>
          ) : (
            <Alert
              tone="success"
              title="Todas as lojas que exigem carta estão cobertas por uma carta válida."
            >
              {notRequired
                ? `${notRequired} loja(s) de redes que não exigem carta (ex.: Cristal).`
                : null}
            </Alert>
          )}
        </div>
      ) : null}
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
            placeholder="Buscar por loja, código, rede ou título"
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
          description="Envie a carta da rede: as filiais são lidas do PDF e já ficam marcadas."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Enviar carta
            </Button>
          }
        />
      ) : (
        <LetterList
          letters={letters.data}
          canDelete={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
        />
      )}
      <LetterDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, LocateFixed, MapPin, Plus, Search } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { QuickAddRow, StoreCreateInput, StoreDto } from '@routeflow/types';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  toast,
} from '@routeflow/ui';
import { ErrorState, ListSkeleton, toastError } from '@/components/states';
import { StoreAuthBadge } from '@/components/status';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCatalog, useStores } from '@/lib/queries';
import { StoreForm } from './store-form';

type PreviewRow = QuickAddRow & { existingStoreId: string | null };

function QuickAdd({ onDone }: { onDone: () => void }) {
  const catalog = useCatalog();
  const [text, setText] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [rows, setRows] = React.useState<PreviewRow[] | null>(null);
  const preview = useMutation({
    mutationFn: () =>
      api.post<PreviewRow[]>('/stores/quick-add/preview', { text, region: region || null }),
    onSuccess: setRows,
    onError: toastError,
  });
  const valid = (rows ?? []).filter((r) => r.ok && !r.existingStoreId);
  const commit = useMutation({
    mutationFn: () =>
      api.post<{ created: StoreDto[]; skipped: unknown[] }>('/stores/quick-add', {
        rows: valid.map((r) => ({
          code: r.code,
          name: r.name,
          network: r.network,
          address: r.address,
          neighborhood: r.neighborhood,
          region: r.region,
        })),
      }),
    onSuccess: (r) => {
      toast.success(`${r.created.length} loja(s) cadastrada(s).`);
      onDone();
    },
    onError: toastError,
  });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Uma loja por linha, no formato da planilha: <strong>Código/Loja — Endereço — Bairro</strong>
        . Códigos iniciados por V viram Drogaria Venancio; lojas identificadas pelo nome, Cristal
        (regra configurável).
      </p>
      <Field label="Lojas" htmlFor="quick-text">
        <Textarea
          id="quick-text"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            'V47 — Av. Nossa Sra. de Copacabana, 872 — Copacabana\nDrogaria Malibu — Rua Barata Ribeiro, 450, loja D — Copacabana'
          }
        />
      </Field>
      <Field label="Região (opcional)" htmlFor="quick-region">
        <Select id="quick-region" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Sem região</option>
          {catalog.data?.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        variant="outline"
        onClick={() => preview.mutate()}
        loading={preview.isPending}
        disabled={!text.trim()}
      >
        Pré-visualizar
      </Button>
      {rows ? (
        <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.line} className="rounded-md border p-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.code ?? r.name ?? `Linha ${r.line}`}</span>
                {!r.ok ? (
                  <Badge tone="danger">Erro</Badge>
                ) : r.existingStoreId ? (
                  <Badge tone="neutral">Já cadastrada</Badge>
                ) : (
                  <Badge tone="success">{r.network}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {r.ok ? `${r.address} — ${r.neighborhood}` : r.error}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Fechar
        </Button>
        <Button onClick={() => commit.mutate()} loading={commit.isPending} disabled={!valid.length}>
          Cadastrar {valid.length || ''} loja{valid.length === 1 ? '' : 's'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function StoresPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const catalog = useCatalog();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [dialog, setDialog] = React.useState<'create' | 'quick' | null>(null);
  const filters = {
    network: params.get('network') ?? '',
    region: params.get('region') ?? '',
    withoutCoordinates: params.get('withoutCoordinates') === '1',
    inactive: params.get('inactive') === '1',
  };
  const stores = useStores({
    search: search.trim() || undefined,
    network: filters.network || undefined,
    region: filters.region || undefined,
    withoutCoordinates: filters.withoutCoordinates || undefined,
    active: filters.inactive ? undefined : true,
    page,
    pageSize: 50,
  });
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };
  const create = useMutation({
    mutationFn: (data: StoreCreateInput) => api.post<StoreDto>('/stores', data),
    onSuccess: (s) => {
      toast.success('Loja cadastrada.');
      void client.invalidateQueries({ queryKey: ['stores'] });
      navigate(`/lojas/${s.id}`);
    },
    onError: toastError,
  });
  const geocode = useMutation({
    mutationFn: () =>
      api.post<{ started: boolean; provider: { configured: boolean; description: string } }>(
        '/stores/geocode',
      ),
    onSuccess: (r) =>
      r.started
        ? toast.success('Atualizando coordenadas em segundo plano (cerca de 1 loja por segundo).')
        : toast.warning(
            r.provider.configured
              ? 'Já existe uma atualização em andamento.'
              : r.provider.description,
          ),
    onError: toastError,
  });
  React.useEffect(() => {
    document.title = 'Lojas — RouteFlow';
  }, []);

  return (
    <>
      <PageHeader
        title="Lojas"
        description={
          stores.data
            ? `${stores.data.total} loja(s) encontrada(s)`
            : 'Cadastro de lojas visitadas.'
        }
        actions={
          <>
            {user?.role === 'ADMIN' ? (
              <Button
                variant="outline"
                onClick={() => geocode.mutate()}
                loading={geocode.isPending}
              >
                <LocateFixed /> Atualizar coordenadas
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialog('quick')}>
              <ClipboardList /> Cadastro rápido
            </Button>
            <Button onClick={() => setDialog('create')}>
              <Plus /> Nova loja
            </Button>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar lojas"
            placeholder="Buscar por nome, código, endereço ou bairro"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filtrar por rede"
          value={filters.network}
          onChange={(e) => setFilter('network', e.target.value)}
        >
          <option value="">Todas as redes</option>
          {catalog.data?.networks.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por região"
          value={filters.region}
          onChange={(e) => setFilter('region', e.target.value)}
        >
          <option value="">Todas as regiões</option>
          {catalog.data?.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap gap-x-5 sm:col-span-2 lg:col-span-3">
          <Checkbox
            id="f-coords"
            label="Somente sem coordenadas"
            checked={filters.withoutCoordinates}
            onChange={(e) => setFilter('withoutCoordinates', e.target.checked ? '1' : '')}
          />
          <Checkbox
            id="f-inactive"
            label="Incluir inativas"
            checked={filters.inactive}
            onChange={(e) => setFilter('inactive', e.target.checked ? '1' : '')}
          />
        </div>
      </div>
      {stores.isLoading ? (
        <ListSkeleton />
      ) : stores.error ? (
        <ErrorState error={stores.error} onRetry={() => void stores.refetch()} />
      ) : (
        <DataTable
          rows={stores.data?.items ?? []}
          rowKey={(s) => s.id}
          caption="Lojas"
          columns={[
            {
              key: 'code',
              header: 'Código',
              cell: (s) => (
                <Link className="font-semibold text-primary hover:underline" to={`/lojas/${s.id}`}>
                  {s.code}
                </Link>
              ),
            },
            {
              key: 'name',
              header: 'Loja',
              cell: (s) => <span className="font-semibold">{s.name}</span>,
            },
            { key: 'network', header: 'Rede', cell: (s) => s.network },
            {
              key: 'place',
              header: 'Bairro / região',
              cell: (s) => `${s.neighborhood ?? '—'} / ${s.region ?? '—'}`,
            },
            {
              key: 'auth',
              header: 'Autorização',
              cell: (s) => <StoreAuthBadge info={s.authorization} />,
            },
            {
              key: 'coords',
              header: 'Mapa',
              cell: (s) =>
                s.latitude != null ? (
                  <MapPin className="size-4 text-success" aria-label="Com coordenadas" />
                ) : (
                  <span className="text-xs text-muted-foreground">sem coord.</span>
                ),
            },
          ]}
          mobileCard={(s) => (
            <Link
              to={`/lojas/${s.id}`}
              className="flex flex-col gap-1.5 rounded-lg border bg-card p-3"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.code} — {s.neighborhood} {s.region ? `(${s.region})` : ''}
                  </span>
                </span>
                {!s.active ? <Badge>Inativa</Badge> : null}
              </span>
              <span className="flex flex-wrap gap-1.5">
                <StoreAuthBadge info={s.authorization} />
                {s.latitude == null ? <Badge tone="outline">sem coordenadas</Badge> : null}
              </span>
            </Link>
          )}
          empty={<Alert tone="info" title="Nenhuma loja encontrada com estes filtros." />}
        />
      )}
      {stores.data && stores.data.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm tabular-nums">
            {page} de {stores.data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= stores.data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      ) : null}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog === 'create' ? (
          <DialogContent title="Nova loja" size="lg">
            <StoreForm
              submitting={create.isPending}
              onSubmit={(d) => create.mutate(d)}
              onCancel={() => setDialog(null)}
            />
          </DialogContent>
        ) : dialog === 'quick' ? (
          <DialogContent
            title="Cadastro rápido"
            description="Cadastre várias lojas colando linhas da planilha."
            size="lg"
          >
            <QuickAdd
              onDone={() => {
                setDialog(null);
                void client.invalidateQueries({ queryKey: ['stores'] });
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

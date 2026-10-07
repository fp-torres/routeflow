import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, Trash, Wand } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import {
  addDaysIso,
  endOfWeekIso,
  formatBRL,
  formatDateBR,
  formatDistance,
  isoWeekday,
  ROUTE_TEMPLATE_KIND_LABEL,
  startOfWeekIso,
  todayIso,
  WEEKDAY_LABEL,
  WEEKDAY_SHORT_LABEL,
  type RouteDetailDto,
  type RouteTemplateDto,
} from '@routeflow/types';
import {
  Badge,
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@routeflow/ui';
import { ExportButtons } from '@/components/export-buttons';
import { ErrorState, ListSkeleton, toastError } from '@/components/states';
import { RouteStatusBadge } from '@/components/status';
import { StorePicker } from '@/components/store-picker';
import { api } from '@/lib/api';
import { keys, useRoutes, useTemplates } from '@/lib/queries';
import { SortableList } from './sortable';

function WeekRoutes() {
  const today = todayIso();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [anchor, setAnchor] = React.useState(today);
  const [newDate, setNewDate] = React.useState<string | null>(null);
  const from = startOfWeekIso(anchor);
  const to = endOfWeekIso(anchor);
  const routes = useRoutes(from, to);
  const generate = useMutation({
    mutationFn: () =>
      api.post<{ created: string[]; replaced: string[]; skipped: string[] }>('/routes/generate', {
        from,
        to,
      }),
    onSuccess: (r) => {
      toast.success(
        r.created.length
          ? `${r.created.length} rota(s) criada(s) a partir do roteiro.`
          : 'Nenhuma rota nova: os dias já estavam programados.',
      );
      void client.invalidateQueries({ queryKey: ['routes'] });
      void client.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: toastError,
  });
  const create = useMutation({
    mutationFn: (date: string) =>
      api.post<RouteDetailDto>('/routes', { date, fromTemplate: true, storeIds: [] }),
    onSuccess: (r) => navigate(`/rotas/${r.id}`),
    onError: toastError,
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchor((a) => addDaysIso(a, -7))}
            aria-label="Semana anterior"
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-44 text-center font-semibold">
            {formatDateBR(from)} a {formatDateBR(to)}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchor((a) => addDaysIso(a, 7))}
            aria-label="Próxima semana"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => generate.mutate()} loading={generate.isPending}>
            <Wand /> Gerar pela programação
          </Button>
          <Button onClick={() => setNewDate(today)}>
            <CalendarPlus /> Nova rota
          </Button>
        </div>
      </div>
      {routes.isLoading ? (
        <ListSkeleton />
      ) : routes.error ? (
        <ErrorState error={routes.error} onRetry={() => void routes.refetch()} />
      ) : !routes.data?.length ? (
        <EmptyState
          title="Nenhuma rota nesta semana."
          description="Gere as rotas a partir do roteiro padrão ou crie uma rota para um dia específico."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {routes.data.map((r) => (
            <li key={r.id}>
              <Link
                to={`/rotas/${r.id}`}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block font-bold">
                      {WEEKDAY_LABEL[isoWeekday(r.date)]}, {formatDateBR(r.date)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {r.region ?? 'Região não definida'}
                    </span>
                  </span>
                  <RouteStatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-sm">
                  <Badge tone="outline">{r.stopCount} lojas</Badge>
                  <Badge tone="success">{r.completedCount} concluídas</Badge>
                  {r.estimatedDistance != null ? (
                    <Badge tone="outline">{formatDistance(r.estimatedDistance)}</Badge>
                  ) : null}
                  {r.estimatedTransportCost != null ? (
                    <Badge tone="outline">{formatBRL(r.estimatedTransportCost)}</Badge>
                  ) : null}
                  {r.holiday ? <Badge tone="warning">{r.holiday.name}</Badge> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ExportButtons type="routes" query={{ from, to }} />
      <Dialog open={newDate !== null} onOpenChange={(o) => !o && setNewDate(null)}>
        <DialogContent
          title="Nova rota"
          description="Se houver roteiro para o dia, as lojas entram automaticamente; depois é só ajustar."
          size="sm"
        >
          <Field label="Data" htmlFor="new-route-date">
            <DatePicker
              id="new-route-date"
              value={newDate ?? ''}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewDate(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => newDate && create.mutate(newDate)}
              loading={create.isPending}
              disabled={!newDate}
            >
              Criar rota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateEditor({ template }: { template: RouteTemplateDto }) {
  const client = useQueryClient();
  const [weekday, setWeekday] = React.useState(1);
  const [weekIndex, setWeekIndex] = React.useState(template.kind === 'STANDARD' ? 0 : 1);
  const original = React.useMemo(
    () =>
      template.stops
        .filter((s) => s.weekday === weekday && s.weekIndex === weekIndex)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ id: s.store.id, store: s.store })),
    [template, weekday, weekIndex],
  );
  const [items, setItems] = React.useState(original);
  const [adding, setAdding] = React.useState('');
  React.useEffect(() => setItems(original), [original]);
  const dirty = items.map((i) => i.id).join() !== original.map((i) => i.id).join();
  const save = useMutation({
    mutationFn: () =>
      api.put<RouteTemplateDto>(`/route-templates/${template.id}/days/${weekday}`, {
        weekIndex,
        storeIds: items.map((i) => i.id),
      }),
    onSuccess: () => {
      toast.success('Roteiro salvo. As próximas rotas geradas seguirão esta ordem.');
      void client.invalidateQueries({ queryKey: keys.templates });
      void client.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: toastError,
  });
  const indexes =
    template.kind === 'WEEKLY'
      ? Array.from({ length: template.cycleWeeks }, (_, i) => i + 1)
      : template.kind === 'MONTHLY'
        ? [1, 2, 3, 4, 5]
        : [];
  const counts = (d: number) =>
    template.stops.filter((s) => s.weekday === d && s.weekIndex === weekIndex).length;

  return (
    <div className="flex flex-col gap-4">
      {indexes.length ? (
        <Field
          label={template.kind === 'WEEKLY' ? 'Semana do ciclo' : 'Semana do mês'}
          htmlFor="template-week"
          className="sm:max-w-xs"
        >
          <Select
            id="template-week"
            value={weekIndex}
            onChange={(e) => setWeekIndex(Number(e.target.value))}
          >
            {indexes.map((i) => (
              <option key={i} value={i}>
                {i}ª semana
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <div
        role="tablist"
        aria-label="Dia da semana"
        className="grid grid-cols-7 gap-1 rounded-lg bg-muted p-1"
      >
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={weekday === d}
            onClick={() => setWeekday(d)}
            className={`flex min-h-12 flex-col items-center justify-center rounded-md text-xs font-semibold sm:text-sm ${weekday === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {WEEKDAY_SHORT_LABEL[d]}
            <span className="text-[0.7rem] tabular-nums">{counts(d)}</span>
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState
          title={`Nenhuma loja na ${WEEKDAY_LABEL[weekday]!.toLowerCase()}.`}
          description="Adicione lojas abaixo para montar o roteiro deste dia."
        />
      ) : (
        <SortableList
          items={items}
          onReorder={setItems}
          className="flex flex-col gap-2"
          renderItem={(item, handle, index) => (
            <div className="flex items-center gap-2 rounded-lg border bg-card p-2 pr-3">
              {handle}
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-line text-sm font-bold tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{item.store.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.store.code} — {item.store.neighborhood}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${item.store.name}`}
                onClick={() => setItems((list) => list.filter((i) => i.id !== item.id))}
              >
                <Trash />
              </Button>
            </div>
          )}
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <StorePicker
            id="template-add"
            value={adding}
            onChange={setAdding}
            exclude={items.map((i) => i.id)}
          />
        </div>
        <Button
          variant="outline"
          disabled={!adding}
          onClick={async () => {
            const store = await api.get<RouteTemplateDto['stops'][number]['store']>(
              `/stores/${adding}`,
            );
            setItems((list) => [...list, { id: store.id, store }]);
            setAdding('');
          }}
        >
          <Plus /> Adicionar loja
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
          Salvar {WEEKDAY_LABEL[weekday]!.toLowerCase()}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={() => setItems(original)}>
            Descartar alterações
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Templates() {
  const templates = useTemplates();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string>('');
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    kind: 'WEEKLY',
    cycleWeeks: 2,
    validFrom: '',
    validUntil: '',
  });
  const list = templates.data ?? [];
  const selected = list.find((t) => t.id === selectedId) ?? list.find((t) => t.active) ?? list[0];
  const create = useMutation({
    mutationFn: () =>
      api.post<RouteTemplateDto>('/route-templates', {
        ...form,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      }),
    onSuccess: (t) => {
      setCreating(false);
      setSelectedId(t.id);
      void client.invalidateQueries({ queryKey: keys.templates });
    },
    onError: toastError,
  });
  if (templates.isLoading) return <ListSkeleton />;
  if (templates.error)
    return <ErrorState error={templates.error} onRetry={() => void templates.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Precedência: alteração feita na rota de uma data &gt; roteiro mensal &gt; roteiro semanal
        (ciclo) &gt; roteiro padrão.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Roteiro" htmlFor="template-select" className="min-w-0 flex-1">
          <Select
            id="template-select"
            value={selected?.id ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {list.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {ROUTE_TEMPLATE_KIND_LABEL[t.kind]}
                {t.active ? '' : ' (inativo)'}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus /> Novo roteiro
        </Button>
      </div>
      {selected ? (
        <TemplateEditor key={selected.id} template={selected} />
      ) : (
        <EmptyState title="Nenhum roteiro cadastrado." />
      )}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent
          title="Novo roteiro"
          description="Use semanal para alternar semanas (ex.: A/B) ou mensal para a semana do mês."
        >
          <div className="flex flex-col gap-3">
            <Field label="Nome" htmlFor="tpl-name">
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Roteiro de dezembro"
              />
            </Field>
            <Field label="Tipo" htmlFor="tpl-kind">
              <Select
                id="tpl-kind"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="STANDARD">{ROUTE_TEMPLATE_KIND_LABEL.STANDARD}</option>
                <option value="WEEKLY">{ROUTE_TEMPLATE_KIND_LABEL.WEEKLY}</option>
                <option value="MONTHLY">{ROUTE_TEMPLATE_KIND_LABEL.MONTHLY}</option>
              </Select>
            </Field>
            {form.kind === 'WEEKLY' ? (
              <Field label="Semanas no ciclo" htmlFor="tpl-cycle">
                <Input
                  id="tpl-cycle"
                  type="number"
                  min={1}
                  max={8}
                  value={form.cycleWeeks}
                  onChange={(e) => setForm({ ...form, cycleWeeks: Number(e.target.value) })}
                />
              </Field>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Válido a partir de" htmlFor="tpl-from">
                <DatePicker
                  id="tpl-from"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                />
              </Field>
              <Field label="Válido até" htmlFor="tpl-until">
                <DatePicker
                  id="tpl-until"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={form.name.trim().length < 2}
            >
              Criar roteiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RoutesPage() {
  React.useEffect(() => {
    document.title = 'Rotas — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader
        title="Rotas"
        description="Rotas do dia (Casa → lojas → Casa) e roteiro padrão por dia da semana."
      />
      <Tabs defaultValue="week" className="flex flex-col gap-4">
        <TabsList className="sm:max-w-sm">
          <TabsTrigger value="week">Rotas da semana</TabsTrigger>
          <TabsTrigger value="template">Roteiro</TabsTrigger>
        </TabsList>
        <TabsContent value="week">
          <WeekRoutes />
        </TabsContent>
        <TabsContent value="template">
          <Templates />
        </TabsContent>
      </Tabs>
    </>
  );
}

import { useMutation } from '@tanstack/react-query';
import { Pencil, Plus, Trash } from 'lucide-react';
import * as React from 'react';
import {
  endOfMonthIso,
  formatBRL,
  formatDateBR,
  formatShortDateBR,
  startOfMonthIso,
  todayIso,
  TRANSPORT_TYPE_LABEL,
  TRANSPORT_TYPES,
  type ExpenseDto,
  type TransportType,
} from '@routeflow/types';
import {
  Button,
  ChartCard,
  DataTable,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  StatCard,
  toast,
} from '@routeflow/ui';
import { MoneyLineChart } from '@/components/charts';
import { ExportButtons } from '@/components/export-buttons';
import { PeriodPicker, type PeriodPreset } from '@/components/period';
import { ErrorState, ListSkeleton, toastError } from '@/components/states';
import { api } from '@/lib/api';
import { useExpenses, useExpenseSummary, useInvalidateOperation } from '@/lib/queries';

interface FormState {
  date: string;
  type: TransportType;
  description: string;
  estimatedValue: string;
  actualValue: string;
}

const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null);

export function ExpensesPage() {
  const invalidate = useInvalidateOperation();
  const [period, setPeriod] = React.useState<{ preset: PeriodPreset; from: string; to: string }>({
    preset: 'month',
    from: startOfMonthIso(todayIso()),
    to: endOfMonthIso(todayIso()),
  });
  const [page, setPage] = React.useState(1);
  const summary = useExpenseSummary();
  const list = useExpenses({ from: period.from, to: period.to, page, pageSize: 30 });
  const [editing, setEditing] = React.useState<ExpenseDto | 'new' | null>(null);
  const [form, setForm] = React.useState<FormState>({
    date: todayIso(),
    type: 'BUS',
    description: '',
    estimatedValue: '',
    actualValue: '',
  });
  React.useEffect(() => {
    document.title = 'Despesas — RouteFlow';
  }, []);
  const open = (expense?: ExpenseDto) => {
    setForm(
      expense
        ? {
            date: expense.date,
            type: expense.type,
            description: expense.description ?? '',
            estimatedValue: expense.estimatedValue?.toString() ?? '',
            actualValue: expense.actualValue?.toString() ?? '',
          }
        : { date: todayIso(), type: 'BUS', description: '', estimatedValue: '', actualValue: '' },
    );
    setEditing(expense ?? 'new');
  };
  const save = useMutation({
    mutationFn: () => {
      const body = {
        date: form.date,
        type: form.type,
        description: form.description || null,
        estimatedValue: num(form.estimatedValue),
        actualValue: num(form.actualValue),
      };
      return editing && editing !== 'new'
        ? api.patch(`/expenses/${editing.id}`, body)
        : api.post('/expenses', body);
    },
    onSuccess: () => {
      setEditing(null);
      toast.success('Despesa salva.');
      void invalidate();
    },
    onError: toastError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success('Despesa excluída.');
      void invalidate();
    },
    onError: toastError,
  });
  const s = summary.data;

  return (
    <>
      <PageHeader
        title="Despesas"
        description="Transporte e demais gastos da operação, com valor estimado e valor pago."
        actions={
          <Button onClick={() => open()}>
            <Plus /> Nova despesa
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Hoje" value={s ? formatBRL(s.day) : '—'} tone="line" />
        <StatCard label="Semana" value={s ? formatBRL(s.week) : '—'} />
        <StatCard label="Mês" value={s ? formatBRL(s.month) : '—'} />
        <StatCard
          label="Média por visita"
          value={s?.averagePerVisit != null ? formatBRL(s.averagePerVisit) : '—'}
          hint={s ? `${s.monthCompletedVisits} visitas concluídas no mês` : undefined}
        />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ChartCard
          title="Gastos nos últimos 30 dias"
          empty={!s || s.byDay.every((d) => d.total === 0)}
          emptyText="Não há despesas registradas."
        >
          <MoneyLineChart
            data={(s?.byDay ?? []).map((d) => ({
              key: d.date,
              label: formatShortDateBR(d.date),
              total: d.total,
            }))}
          />
        </ChartCard>
        <ChartCard
          title="Por tipo (mês)"
          empty={!s?.byType.length}
          emptyText="Não há despesas no mês."
        >
          <ul className="divide-y">
            {s?.byType.map((t) => (
              <li key={t.type} className="flex justify-between py-2 text-sm">
                <span>{TRANSPORT_TYPE_LABEL[t.type]}</span>
                <span className="font-semibold tabular-nums">{formatBRL(t.total)}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
      <div className="mb-3 flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
        <PeriodPicker
          {...period}
          onChange={(p) => {
            setPeriod(p);
            setPage(1);
          }}
        />
        <ExportButtons type="expenses" query={{ from: period.from, to: period.to }} />
      </div>
      {list.isLoading ? (
        <ListSkeleton />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            Total no período:{' '}
            <strong className="text-foreground">{formatBRL(list.data?.totalValue ?? 0)}</strong>
          </p>
          <DataTable
            rows={list.data?.items ?? []}
            rowKey={(e) => e.id}
            caption="Despesas"
            empty={
              <EmptyState
                title="Não há despesas registradas."
                description="Registre passagens e outros gastos para acompanhar o custo por visita."
              />
            }
            columns={[
              { key: 'date', header: 'Data', cell: (e) => formatDateBR(e.date) },
              { key: 'type', header: 'Tipo', cell: (e) => TRANSPORT_TYPE_LABEL[e.type] },
              {
                key: 'desc',
                header: 'Descrição',
                cell: (e) => e.description ?? e.visitStoreName ?? '—',
              },
              {
                key: 'est',
                header: 'Estimado',
                cell: (e) => formatBRL(e.estimatedValue),
                className: 'text-right',
              },
              {
                key: 'real',
                header: 'Pago',
                cell: (e) => formatBRL(e.actualValue),
                className: 'text-right',
              },
              {
                key: 'value',
                header: 'Considerado',
                cell: (e) => <strong>{formatBRL(e.value)}</strong>,
                className: 'text-right',
              },
              {
                key: 'actions',
                header: 'Ações',
                cell: (e) => (
                  <span className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Editar despesa"
                      onClick={() => open(e)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Excluir despesa"
                      onClick={() => window.confirm('Excluir esta despesa?') && remove.mutate(e.id)}
                    >
                      <Trash />
                    </Button>
                  </span>
                ),
              },
            ]}
            mobileCard={(e) => (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {TRANSPORT_TYPE_LABEL[e.type]} — {formatBRL(e.value)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatDateBR(e.date)} {e.description ?? e.visitStoreName ?? ''}
                  </span>
                </span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Editar despesa"
                  onClick={() => open(e)}
                >
                  <Pencil />
                </Button>
              </div>
            )}
          />
          {list.data && list.data.totalPages > 1 ? (
            <div className="mt-3 flex justify-center gap-3">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= list.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent
          title={editing === 'new' ? 'Nova despesa' : 'Editar despesa'}
          description="Informe o valor pago; o estimado é opcional."
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Data" htmlFor="exp-date">
                <DatePicker
                  id="exp-date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Tipo" htmlFor="exp-type">
                <Select
                  id="exp-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as TransportType })}
                >
                  {TRANSPORT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TRANSPORT_TYPE_LABEL[t]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Valor pago (R$)" htmlFor="exp-actual">
                <Input
                  id="exp-actual"
                  inputMode="decimal"
                  value={form.actualValue}
                  onChange={(e) => setForm({ ...form, actualValue: e.target.value })}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Valor estimado (R$)" htmlFor="exp-est">
                <Input
                  id="exp-est"
                  inputMode="decimal"
                  value={form.estimatedValue}
                  onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                  placeholder="0,00"
                />
              </Field>
            </div>
            <Field label="Descrição" htmlFor="exp-desc">
              <Input
                id="exp-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex.: ônibus Rio Comprido → Copacabana"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => save.mutate()}
              loading={save.isPending}
              disabled={num(form.actualValue) == null && num(form.estimatedValue) == null}
            >
              Salvar despesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

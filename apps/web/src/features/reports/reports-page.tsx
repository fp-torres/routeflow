import { useQuery } from '@tanstack/react-query';
import { ChartColumn, ClipboardList, FileText, Route, ScrollText, Wallet } from 'lucide-react';
import * as React from 'react';
import {
  endOfMonthIso,
  formatDateBR,
  REPORT_TYPE_LABEL,
  startOfMonthIso,
  todayIso,
  VISIT_STATUS_LABEL,
  VISIT_STATUSES,
  type ReportPreviewDto,
  type ReportType,
} from '@routeflow/types';
import { cn, PageHeader, Select, Skeleton, StatCard } from '@routeflow/ui';
import { ExportButtons } from '@/components/export-buttons';
import { PeriodPicker, type PeriodPreset } from '@/components/period';
import { ErrorState } from '@/components/states';
import { api } from '@/lib/api';
import { useCatalog } from '@/lib/queries';

const TYPES: Array<{
  type: ReportType;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    type: 'consolidated',
    icon: ChartColumn,
    description: 'Resumo, visitas, rotas, lojas, despesas, autorizações, evidências e conclusões.',
  },
  {
    type: 'visits',
    icon: ClipboardList,
    description: 'Visitas do período com status, horários e fotos.',
  },
  {
    type: 'routes',
    icon: Route,
    description: 'Rotas por dia com distância, deslocamento e custos.',
  },
  { type: 'expenses', icon: Wallet, description: 'Despesas de transporte: estimado x pago.' },
  {
    type: 'authorizations',
    icon: FileText,
    description: 'Cartas por loja e situação de vencimento.',
  },
  {
    type: 'history',
    icon: ScrollText,
    description: 'Histórico detalhado com motivos e registros.',
  },
];

export function ReportsPage() {
  const catalog = useCatalog();
  const [type, setType] = React.useState<ReportType>('consolidated');
  const [period, setPeriod] = React.useState<{ preset: PeriodPreset; from: string; to: string }>({
    preset: 'month',
    from: startOfMonthIso(todayIso()),
    to: endOfMonthIso(todayIso()),
  });
  const [filters, setFilters] = React.useState({ network: '', region: '', status: '' });
  const query = {
    from: period.from,
    to: period.to,
    network: filters.network || undefined,
    region: filters.region || undefined,
    status: filters.status ? [filters.status] : undefined,
  };
  const preview = useQuery({
    queryKey: ['report-preview', type, query],
    queryFn: () => api.get<ReportPreviewDto>(`/reports/${type}/preview`, query),
  });
  React.useEffect(() => {
    document.title = 'Relatórios — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="PDF profissional e Excel formatado, com os filtros abaixo."
      />
      <ul
        className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="radiogroup"
        aria-label="Tipo de relatório"
      >
        {TYPES.map(({ type: t, icon: Icon, description }) => (
          <li key={t}>
            <button
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={cn(
                'flex h-full w-full items-start gap-3 rounded-lg border bg-card p-4 text-left hover:bg-muted/40',
                type === t && 'border-primary ring-2 ring-primary/30',
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 size-5 shrink-0',
                  type === t ? 'text-line' : 'text-muted-foreground',
                )}
              />
              <span>
                <span className="block font-bold">{REPORT_TYPE_LABEL[t]}</span>
                <span className="block text-sm text-muted-foreground">{description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-4">
        <PeriodPicker {...period} onChange={setPeriod} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            aria-label="Rede"
            value={filters.network}
            onChange={(e) => setFilters({ ...filters, network: e.target.value })}
          >
            <option value="">Todas as redes</option>
            {catalog.data?.networks.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Região"
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          >
            <option value="">Todas as regiões</option>
            {catalog.data?.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos os status</option>
            {VISIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VISIT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <section className="rounded-lg border bg-card p-4 sm:p-5" aria-label="Prévia do relatório">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">ROUTEFLOW — Relatório Operacional</h2>
            <p className="text-sm text-muted-foreground">
              {REPORT_TYPE_LABEL[type]} — {formatDateBR(period.from)} a {formatDateBR(period.to)}
            </p>
          </div>
          <ExportButtons type={type} query={query} size="md" />
        </div>
        {preview.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : preview.error ? (
          <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
        ) : preview.data ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {preview.data.kpis.map((k) => (
                <StatCard key={k.label} label={k.label} value={k.value} />
              ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {preview.data.sections.map((s) => (
                <li key={s.title} className="rounded-full bg-muted px-3 py-1">
                  {s.title}: <strong className="text-foreground">{s.rows}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </>
  );
}

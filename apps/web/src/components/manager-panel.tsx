import {
  CalendarCheck,
  CircleCheck,
  CircleX,
  Clock,
  MapPin,
  Percent,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  describeDaysLeft,
  formatBRL,
  formatDistance,
  type ManagerMetricsDto,
} from '@routeflow/types';
import { ChartCard, StatCard } from '@routeflow/ui';
import { HorizontalBars, StatusDonut, VisitsBarChart } from './charts';
import { ValidityBadge } from './status';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Indicadores do gestor — usado no dashboard interno e no painel público. */
export function ManagerPanel({
  metrics,
  showExpenses = true,
}: {
  metrics: ManagerMetricsDto;
  showExpenses?: boolean;
}) {
  const t = metrics.totals;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Programadas" value={t.scheduled} icon={CalendarCheck} tone="primary" />
        <StatCard label="Concluídas" value={t.completed} icon={CircleCheck} tone="success" />
        <StatCard label="Pendentes" value={t.pending + t.inProgress} icon={Clock} />
        <StatCard label="Não realizadas" value={t.notCompleted} icon={CircleX} tone="danger" />
        <StatCard label="Reagendadas" value={t.rescheduled} icon={RotateCcw} tone="warning" />
        <StatCard
          label="Taxa de conclusão"
          value={pct(metrics.completionRate)}
          hint={`${metrics.averageVisitsPerDay} visitas/dia`}
          icon={Percent}
          tone="line"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {showExpenses ? (
          <StatCard
            label="Despesas"
            value={formatBRL(metrics.expenses.total)}
            hint={
              metrics.expenses.perVisit != null
                ? `${formatBRL(metrics.expenses.perVisit)} por visita`
                : 'sem visitas concluídas'
            }
            icon={Wallet}
          />
        ) : null}
        <StatCard
          label="Distância estimada"
          value={
            metrics.distance.totalMeters != null
              ? formatDistance(metrics.distance.totalMeters)
              : '—'
          }
          hint={`${metrics.distance.routesWithEstimate}/${metrics.distance.routes} rotas calculadas`}
          icon={MapPin}
        />
        <StatCard
          label="Autorizações válidas"
          value={metrics.authorizations.valid}
          hint={`${metrics.authorizations.withoutLetter} lojas sem carta`}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Vencendo / expiradas"
          value={`${metrics.authorizations.expiring + metrics.authorizations.critical} / ${metrics.authorizations.expired}`}
          icon={ShieldAlert}
          tone="danger"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Visitas por dia" empty={metrics.byDay.length === 0}>
          <VisitsBarChart data={metrics.byDay} />
        </ChartCard>
        <ChartCard title="Status das visitas" empty={metrics.byStatus.length === 0}>
          <StatusDonut data={metrics.byStatus} />
        </ChartCard>
        <ChartCard title="Visitas por rede" empty={metrics.byNetwork.length === 0}>
          <HorizontalBars data={metrics.byNetwork} />
        </ChartCard>
        <ChartCard title="Visitas por região" empty={metrics.byRegion.length === 0}>
          <HorizontalBars data={metrics.byRegion} />
        </ChartCard>
      </div>
      {metrics.authorizations.expiringSoon.length > 0 ? (
        <ChartCard title="Autorizações que exigem atenção">
          <ul className="divide-y">
            {metrics.authorizations.expiringSoon.map((item) => (
              <li
                key={item.letterId}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.storeName}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.storeCode} — {describeDaysLeft(item.daysLeft)}
                  </span>
                </span>
                <ValidityBadge validity={item.validity} daysLeft={item.daysLeft} />
              </li>
            ))}
          </ul>
        </ChartCard>
      ) : null}
    </div>
  );
}

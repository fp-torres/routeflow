import {
  CalendarCheck,
  CircleCheck,
  Clock,
  MapPin,
  Navigation,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import {
  endOfMonthIso,
  formatBRL,
  formatDistance,
  formatDuration,
  formatLongDateBR,
  formatTimeBR,
  startOfMonthIso,
  todayIso,
} from '@routeflow/types';
import {
  Alert,
  Button,
  ChartCard,
  EmptyState,
  PageHeader,
  Progress,
  RouteStrip,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@routeflow/ui';
import { HorizontalBars, MoneyLineChart, StatusDonut, VisitsBarChart } from '@/components/charts';
import { ExportButtons } from '@/components/export-buttons';
import { ManagerPanel } from '@/components/manager-panel';
import { PeriodPicker, type PeriodPreset } from '@/components/period';
import { ErrorState, PageSkeleton } from '@/components/states';
import { StoreAuthBadge, VisitStatusBadge, visitState } from '@/components/status';
import { useAuth } from '@/lib/auth';
import { useDashboard, useManagerMetrics } from '@/lib/queries';

function TodayCard() {
  const { data } = useDashboard();
  if (!data) return null;
  const route = data.todayRoute;
  const next = data.nextVisit;
  if (!route || data.counts.total === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Você ainda não possui visitas para hoje."
        description="Confira a agenda da semana ou monte uma rota para hoje."
        action={
          <Button asChild variant="outline">
            <Link to="/agenda">Abrir agenda</Link>
          </Button>
        }
      />
    );
  }
  return (
    <section
      aria-label="Rota de hoje"
      className="overflow-hidden rounded-xl bg-[#13233b] text-white dark:bg-card dark:ring-1 dark:ring-border"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-[#c9d4e5]">Hoje{route.region ? ` — ${route.region}` : ''}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
              {data.counts.total} visita{data.counts.total === 1 ? '' : 's'}
            </p>
            <p className="text-sm text-[#c9d4e5]">
              {data.counts.completed} concluída{data.counts.completed === 1 ? '' : 's'},{' '}
              {data.counts.pending + data.counts.inProgress} pendente
              {data.counts.pending + data.counts.inProgress === 1 ? '' : 's'}
            </p>
          </div>
          {route.estimatedDuration != null ? (
            <p className="text-sm text-[#c9d4e5]">
              Deslocamento estimado:{' '}
              <strong className="text-white">{formatDuration(route.estimatedDuration)}</strong>
              {route.estimatedTransportCost != null
                ? ` · ${formatBRL(route.estimatedTransportCost)}`
                : ''}
            </p>
          ) : null}
        </div>
        <RouteStrip
          states={route.stops.map((s) => visitState(s.status))}
          className="[&>span:first-child]:bg-[#f05a28]/80"
        />
        <Progress
          value={data.progress}
          label="Progresso do dia"
          tone="line"
          className="bg-white/15"
        />
        {next ? (
          <div className="rounded-lg bg-white/8 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold text-[#ffb193]">Próxima visita</p>
            <p className="mt-1 text-xl leading-tight font-bold">{next.store.name}</p>
            <p className="text-sm text-[#c9d4e5]">
              {next.store.code} — {next.store.neighborhood ?? next.store.city}
            </p>
            <p className="mt-1 text-sm text-[#c9d4e5]">{next.store.address}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VisitStatusBadge status={next.status} />
              <StoreAuthBadge info={next.authorization} />
            </div>
          </div>
        ) : (
          <Alert tone="success" title="Todas as visitas de hoje foram registradas." />
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {next ? (
            <Button asChild size="lg" variant="line">
              <Link to={`/visitas/${next.id}`}>
                {next.status === 'IN_PROGRESS' ? 'Continuar visita' : 'Abrir visita'}
              </Link>
            </Button>
          ) : null}
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            <Link to={`/rotas/${route.id}`}>
              <Navigation /> Abrir rota completa
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function MyDay() {
  const { data, error, isLoading, refetch } = useDashboard();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const a = data.authorizations;
  return (
    <div className="flex flex-col gap-4">
      <TodayCard />
      {data.alerts.length ? (
        <ul className="flex flex-col gap-2" aria-label="Alertas">
          {data.alerts.map((alert) => (
            <li key={alert.id}>
              <Alert
                tone={alert.tone}
                title={alert.title}
                action={
                  alert.link ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={alert.link}>Ver</Link>
                    </Button>
                  ) : undefined
                }
              >
                {alert.description}
              </Alert>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Visitas hoje"
          value={data.counts.total}
          icon={CalendarCheck}
          tone="primary"
        />
        <StatCard
          label="Concluídas"
          value={data.counts.completed}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Pendentes"
          value={data.counts.pending + data.counts.inProgress}
          icon={Clock}
          hint={data.counts.inProgress ? `${data.counts.inProgress} em andamento` : undefined}
        />
        <StatCard
          label="Gasto do dia"
          value={formatBRL(data.expenses.today)}
          icon={Wallet}
          hint={
            data.expenses.estimatedToday != null
              ? `estimado ${formatBRL(data.expenses.estimatedToday)}`
              : undefined
          }
        />
        <StatCard
          label="Gasto do mês"
          value={formatBRL(data.expenses.month)}
          icon={Wallet}
          tone="line"
        />
        <StatCard
          label="Distância hoje"
          value={
            data.distance.todayMeters != null ? formatDistance(data.distance.todayMeters) : '—'
          }
          icon={MapPin}
          hint={
            data.distance.monthMeters
              ? `${formatDistance(data.distance.monthMeters)} no mês`
              : 'sem coordenadas'
          }
        />
      </div>
      <Link to="/autorizacoes" className="block rounded-lg border bg-card p-4 hover:bg-muted/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-bold">
            <ShieldAlert className="size-5 text-line" /> Autorizações
          </span>
          <span className="text-sm text-muted-foreground">
            {a.expiringIn7Days} vencem nos próximos 7 dias
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          {[
            ['Válidas', a.valid, 'text-success'],
            ['Vencendo', a.expiring, 'text-warning'],
            ['Até 7 dias', a.critical, 'text-danger'],
            ['Expiradas', a.expired, 'text-critical'],
            ['Sem carta', a.withoutLetter, 'text-muted-foreground'],
            ['Não exigida', a.notRequired, 'text-muted-foreground'],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-md bg-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={`text-xl font-bold tabular-nums ${color}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </Link>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Visitas por dia"
          description="Semana anterior e atual"
          empty={data.charts.visitsByDay.every((p) => p.total === 0)}
        >
          <VisitsBarChart data={data.charts.visitsByDay} />
        </ChartCard>
        <ChartCard
          title="Visitas por região"
          description="Mês atual"
          empty={data.charts.visitsByRegion.length === 0}
        >
          <HorizontalBars data={data.charts.visitsByRegion} />
        </ChartCard>
        <ChartCard
          title="Gastos por semana"
          description="Últimas 8 semanas"
          empty={data.charts.expensesByWeek.every((p) => p.total === 0)}
          emptyText="Não há despesas registradas."
        >
          <MoneyLineChart data={data.charts.expensesByWeek} />
        </ChartCard>
        <ChartCard
          title="Status das visitas"
          description="Mês atual"
          empty={data.charts.statusDistribution.length === 0}
        >
          <StatusDonut data={data.charts.statusDistribution} />
        </ChartCard>
      </div>
      <section className="rounded-lg border bg-card p-4 sm:p-5" aria-label="Atividades recentes">
        <h2 className="mb-3 font-bold">Atividades recentes</h2>
        {data.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            As atividades registradas nas visitas aparecem aqui.
          </p>
        ) : (
          <ol className="relative flex flex-col gap-3 border-l-2 border-line/50 pl-4">
            {data.timeline.map((item) => (
              <li key={item.id} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-line"
                />
                <Link to={item.link ?? '#'} className="block hover:underline">
                  <span className="text-sm font-semibold">{item.description}</span>
                  <span className="block text-xs text-muted-foreground">
                    {item.title} — {formatTimeBR(item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function ManagerView() {
  const [period, setPeriod] = React.useState<{ preset: PeriodPreset; from: string; to: string }>({
    preset: 'month',
    from: startOfMonthIso(todayIso()),
    to: endOfMonthIso(todayIso()),
  });
  const metrics = useManagerMetrics(period.from, period.to);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
        <PeriodPicker {...period} onChange={setPeriod} />
        <ExportButtons type="consolidated" query={{ from: period.from, to: period.to }} />
      </div>
      {metrics.isLoading ? (
        <PageSkeleton />
      ) : metrics.error || !metrics.data ? (
        <ErrorState error={metrics.error} onRetry={() => void metrics.refetch()} />
      ) : (
        <ManagerPanel metrics={metrics.data} />
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const today = todayIso();
  React.useEffect(() => {
    document.title = 'Início — RouteFlow';
  }, []);
  return (
    <>
      <PageHeader
        title={`Olá, ${user?.name.split(' ')[0] ?? ''} 👋`}
        description={formatLongDateBR(today)}
      />
      <Tabs defaultValue="day" className="flex flex-col gap-4">
        <TabsList className="sm:max-w-sm">
          <TabsTrigger value="day">Meu dia</TabsTrigger>
          <TabsTrigger value="manager">Visão gerencial</TabsTrigger>
        </TabsList>
        <TabsContent value="day">
          <MyDay />
        </TabsContent>
        <TabsContent value="manager">
          <ManagerView />
        </TabsContent>
      </Tabs>
    </>
  );
}

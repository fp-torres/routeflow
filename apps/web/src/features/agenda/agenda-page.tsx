import { CalendarDays, ChevronLeft, ChevronRight, Route as RouteIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import {
  addDaysIso,
  addMonthsIso,
  endOfMonthIso,
  endOfWeekIso,
  formatDateBR,
  formatLongDateBR,
  monthLabel,
  startOfMonthIso,
  startOfWeekIso,
  todayIso,
  WEEKDAY_LABEL,
  type AgendaDayDto,
} from '@routeflow/types';
import {
  Badge,
  Button,
  Calendar,
  cn,
  DatePicker,
  Drawer,
  DrawerContent,
  EmptyState,
  Label,
  PageHeader,
  Progress,
  SegmentedControl,
} from '@routeflow/ui';
import { ErrorState, ListSkeleton } from '@/components/states';
import { VisitStatusBadge } from '@/components/status';
import { useAgenda } from '@/lib/queries';

type View = 'day' | 'week' | 'month' | 'custom';

function DayVisits({ day }: { day: AgendaDayDto }) {
  return (
    <div className="flex flex-col gap-3">
      {day.holiday ? (
        <Badge tone="warning">
          {day.holiday.kind === 'national' ? 'Feriado' : 'Ponto facultativo'}: {day.holiday.name}
        </Badge>
      ) : null}
      {day.routeId ? (
        <Button asChild variant="outline" block>
          <Link to={`/rotas/${day.routeId}`}>
            <RouteIcon /> Abrir rota do dia
          </Link>
        </Button>
      ) : null}
      {day.visits.length === 0 && day.planned.length === 0 ? (
        <EmptyState title="Você ainda não possui visitas para este dia." />
      ) : null}
      <ul className="flex flex-col gap-2">
        {day.visits.map((v) => (
          <li key={v.id}>
            <Link
              to={`/visitas/${v.id}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold tabular-nums">
                {v.order}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{v.store.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {v.store.code} — {v.store.neighborhood ?? v.store.region}
                </span>
              </span>
              <VisitStatusBadge status={v.status} />
            </Link>
          </li>
        ))}
      </ul>
      {day.planned.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">
            Previstas pelo roteiro ({day.planned.length}) — a rota é criada automaticamente.
          </p>
          <ul className="flex flex-col gap-1.5">
            {day.planned.map((p, i) => (
              <li
                key={p.storeId}
                className="flex items-center gap-3 rounded-lg border border-dashed p-2.5 text-sm"
              >
                <span className="w-6 text-center font-bold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 truncate">
                  {p.name}{' '}
                  <span className="text-muted-foreground">({p.neighborhood ?? p.code})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DayCard({ day, today, onOpen }: { day: AgendaDayDto; today: string; onOpen: () => void }) {
  const count = day.total + day.planned.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full flex-col gap-2 rounded-lg border bg-card p-4 text-left hover:bg-muted/40',
        day.date === today && 'border-line ring-1 ring-line',
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span>
          <span className="block font-bold">{WEEKDAY_LABEL[day.weekday]}</span>
          <span className="text-sm text-muted-foreground">{formatDateBR(day.date)}</span>
        </span>
        <span className="text-right">
          <span className="block text-2xl font-bold tabular-nums">{count}</span>
          <span className="text-xs text-muted-foreground">visita{count === 1 ? '' : 's'}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {day.holiday ? <Badge tone="warning">{day.holiday.name}</Badge> : null}
        {day.regions.map((r) => (
          <Badge key={r} tone="outline">
            {r}
          </Badge>
        ))}
        {day.planned.length && !day.routeId ? (
          <Badge tone="info">Prevista pelo roteiro</Badge>
        ) : null}
      </div>
      {day.total > 0 ? (
        <div className="w-full">
          <Progress
            value={day.progress}
            label={`Progresso de ${formatDateBR(day.date)}`}
            tone="success"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {day.completed} de {day.total} concluídas
          </p>
        </div>
      ) : null}
    </button>
  );
}

export function AgendaPage() {
  const today = todayIso();
  const [view, setView] = React.useState<View>('week');
  const [anchor, setAnchor] = React.useState(today);
  const [custom, setCustom] = React.useState({ from: today, to: addDaysIso(today, 13) });
  const [selected, setSelected] = React.useState<string | null>(null);
  React.useEffect(() => {
    document.title = 'Agenda — RouteFlow';
  }, []);

  const range =
    view === 'day'
      ? { from: anchor, to: anchor }
      : view === 'week'
        ? { from: startOfWeekIso(anchor), to: endOfWeekIso(anchor) }
        : view === 'month'
          ? {
              from: startOfWeekIso(startOfMonthIso(anchor)),
              to: endOfWeekIso(endOfMonthIso(anchor)),
            }
          : custom;
  const agenda = useAgenda(range.from, range.to);
  const days = agenda.data?.days ?? [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const move = (dir: 1 | -1) =>
    setAnchor((a) =>
      view === 'day'
        ? addDaysIso(a, dir)
        : view === 'week'
          ? addDaysIso(a, 7 * dir)
          : addMonthsIso(a, dir),
    );
  const title =
    view === 'day'
      ? formatLongDateBR(anchor)
      : view === 'week'
        ? `${formatDateBR(range.from)} a ${formatDateBR(range.to)}`
        : view === 'month'
          ? monthLabel(anchor)
          : 'Período personalizado';
  const selectedDay = selected ? byDate.get(selected) : undefined;

  return (
    <>
      <PageHeader title="Agenda" description="Programação de visitas por dia, semana e mês." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          label="Visualização da agenda"
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: 'Hoje' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mês' },
            { value: 'custom', label: 'Personalizado' },
          ]}
        />
        {view !== 'custom' ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => move(-1)}
              aria-label="Período anterior"
            >
              <ChevronLeft />
            </Button>
            <p className="min-w-0 flex-1 text-center font-semibold first-letter:uppercase sm:min-w-56">
              {title}
            </p>
            <Button
              variant="outline"
              size="icon"
              onClick={() => move(1)}
              aria-label="Próximo período"
            >
              <ChevronRight />
            </Button>
            <Button variant="ghost" onClick={() => setAnchor(today)}>
              Hoje
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="agenda-from">De</Label>
              <DatePicker
                id="agenda-from"
                value={custom.from}
                onChange={(e) =>
                  e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="agenda-to">Até</Label>
              <DatePicker
                id="agenda-to"
                value={custom.to}
                min={custom.from}
                onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {agenda.isLoading ? (
        <ListSkeleton rows={6} />
      ) : agenda.error ? (
        <ErrorState error={agenda.error} onRetry={() => void agenda.refetch()} />
      ) : view === 'day' ? (
        byDate.get(anchor) ? (
          <DayVisits day={byDate.get(anchor)!} />
        ) : (
          <EmptyState icon={CalendarDays} title="Você ainda não possui visitas para este dia." />
        )
      ) : view === 'month' ? (
        <div className="rounded-lg border bg-card p-2 sm:p-4">
          <Calendar
            month={anchor.slice(0, 7)}
            today={today}
            selected={selected}
            onSelect={setSelected}
            dayLabel={(d) => {
              const day = byDate.get(d);
              return `${formatLongDateBR(d)}: ${day ? day.total + day.planned.length : 0} visitas`;
            }}
            renderDay={(d) => {
              const day = byDate.get(d);
              const count = day ? day.total + day.planned.length : 0;
              if (!count) return null;
              return (
                <>
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums',
                      day!.total
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-dashed border-primary text-primary',
                    )}
                  >
                    {count}
                  </span>
                  {day!.total ? (
                    <span className="mt-1 hidden h-1 w-full overflow-hidden rounded-full bg-muted sm:block">
                      <span
                        className="block h-full bg-success"
                        style={{ width: `${Math.round(day!.progress * 100)}%` }}
                      />
                    </span>
                  ) : null}
                  {day!.regions[0] ? (
                    <span className="mt-0.5 hidden max-w-full truncate text-[0.65rem] text-muted-foreground lg:block">
                      {day!.regions[0]}
                    </span>
                  ) : null}
                </>
              );
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {days
            .filter((d) => view === 'week' || d.total + d.planned.length > 0)
            .map((day) => (
              <DayCard
                key={day.date}
                day={day}
                today={today}
                onOpen={() => setSelected(day.date)}
              />
            ))}
          {view === 'custom' && days.every((d) => d.total + d.planned.length === 0) ? (
            <EmptyState title="Nenhuma visita no período." className="sm:col-span-2" />
          ) : null}
        </div>
      )}

      <Drawer open={!!selectedDay} onOpenChange={(open) => !open && setSelected(null)}>
        {selectedDay ? (
          <DrawerContent
            title={formatLongDateBR(selectedDay.date)}
            description={`${selectedDay.total + selectedDay.planned.length} visita(s)`}
          >
            <DayVisits day={selectedDay} />
          </DrawerContent>
        ) : null}
      </Drawer>
    </>
  );
}

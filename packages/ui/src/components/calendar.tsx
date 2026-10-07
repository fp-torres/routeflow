import * as React from 'react';
import { cn } from '../lib/cn';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function iso(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m, d));
  return date.toISOString().slice(0, 10);
}

export interface CalendarProps {
  /** Mês exibido no formato YYYY-MM */
  month: string;
  selected?: string | null;
  today?: string;
  onSelect?: (date: string) => void;
  renderDay?: (date: string) => React.ReactNode;
  dayLabel?: (date: string) => string;
  className?: string;
}

/** Calendário mensal (semana começando na segunda) com conteúdo customizável por dia. */
export function Calendar({
  month,
  selected,
  today,
  onSelect,
  renderDay,
  dayLabel,
  className,
}: CalendarProps) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => iso(y, m - 1, 1 - offset + i));
  const weeks = cells.slice(35).every((d) => d.slice(0, 7) !== month) ? cells.slice(0, 35) : cells;
  return (
    <div className={cn('w-full', className)}>
      <div
        className="grid grid-cols-7 gap-1 pb-1 text-center text-[0.7rem] font-semibold text-muted-foreground sm:text-xs"
        aria-hidden
      >
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendário de ${month}`}>
        {weeks.map((date) => {
          const outside = date.slice(0, 7) !== month;
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-selected={selected === date}
              aria-label={dayLabel ? dayLabel(date) : date}
              onClick={() => onSelect?.(date)}
              className={cn(
                'flex min-h-14 min-w-0 flex-col items-center gap-0.5 rounded-md border border-transparent p-1 text-sm transition-colors hover:bg-muted sm:min-h-20 sm:items-start sm:p-1.5',
                outside && 'text-muted-foreground/55',
                today === date && 'border-line',
                selected === date && 'bg-primary-soft border-primary',
              )}
            >
              <span className={cn('font-semibold tabular-nums', today === date && 'text-line')}>
                {Number(date.slice(8))}
              </span>
              {renderDay ? (
                <span className="flex w-full min-w-0 flex-col items-center sm:items-start">
                  {renderDay(date)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

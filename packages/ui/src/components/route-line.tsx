import { House } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export type RouteStopState = 'pending' | 'active' | 'done' | 'failed' | 'skipped';

export interface RouteLineStop {
  id: string;
  order: number;
  title: string;
  subtitle?: React.ReactNode;
  state: RouteStopState;
  href?: string;
  badge?: React.ReactNode;
  /** Informação do trecho até esta parada (modo, tempo, custo) */
  leg?: React.ReactNode;
  actions?: React.ReactNode;
}

type LinkLike = React.ComponentType<{ to: string; className?: string; children: React.ReactNode }>;

const markerState: Record<RouteStopState, string> = {
  pending: 'border-2 border-line bg-card text-foreground',
  active: 'bg-primary text-primary-foreground ring-4 ring-primary/25',
  done: 'bg-success text-white',
  failed: 'bg-danger text-white',
  skipped: 'bg-muted text-muted-foreground',
};

function HomeMarker({ label, detail }: { label: string; detail?: React.ReactNode }) {
  return (
    <li className="relative flex items-center gap-3 py-2 pl-0">
      <span className="z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <House className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {detail ? (
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Elemento de identidade do RouteFlow: o roteiro do dia como uma linha de
 * transporte — Casa → lojas → Casa — com o estado de cada parada.
 */
export function RouteLine({
  stops,
  homeLabel = 'Casa',
  homeDetail,
  returnLeg,
  Link,
  className,
}: {
  stops: RouteLineStop[];
  homeLabel?: string;
  homeDetail?: React.ReactNode;
  returnLeg?: React.ReactNode;
  Link?: LinkLike;
  className?: string;
}) {
  return (
    <ol className={cn('relative', className)} aria-label="Sequência da rota">
      <span
        aria-hidden
        className="absolute top-6 bottom-6 left-[17px] w-1 rounded-full bg-line/80"
      />
      <HomeMarker label={`Saída: ${homeLabel}`} detail={homeDetail} />
      {stops.map((stop) => {
        const content = (
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={cn(
                'z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                markerState[stop.state],
              )}
              aria-hidden
            >
              {stop.order}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate font-semibold',
                  stop.state === 'skipped' && 'line-through decoration-2',
                )}
              >
                {stop.title}
              </span>
              {stop.subtitle ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {stop.subtitle}
                </span>
              ) : null}
            </span>
            {stop.badge ? <span className="shrink-0">{stop.badge}</span> : null}
          </span>
        );
        return (
          <li key={stop.id} className="relative">
            {stop.leg ? (
              <div className="ml-12 border-l-0 py-1 text-xs text-muted-foreground">{stop.leg}</div>
            ) : null}
            <div className="flex items-center gap-2 py-1.5">
              {stop.href && Link ? (
                <Link
                  to={stop.href}
                  className="flex min-h-12 min-w-0 flex-1 items-center rounded-md hover:bg-muted/60"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex min-h-12 min-w-0 flex-1 items-center">{content}</div>
              )}
              {stop.actions}
            </div>
          </li>
        );
      })}
      {returnLeg ? <li className="ml-12 py-1 text-xs text-muted-foreground">{returnLeg}</li> : null}
      <HomeMarker label={`Retorno: ${homeLabel}`} />
    </ol>
  );
}

/** Versão compacta (horizontal) usada no cartão "Hoje". */
export function RouteStrip({
  states,
  className,
}: {
  states: RouteStopState[];
  className?: string;
}) {
  const color: Record<RouteStopState, string> = {
    pending: 'bg-card border-2 border-line',
    active: 'bg-primary ring-2 ring-primary/30',
    done: 'bg-success',
    failed: 'bg-danger',
    skipped: 'bg-muted-foreground/40',
  };
  return (
    <div
      className={cn('relative flex items-center justify-between px-0.5', className)}
      role="img"
      aria-label={`Rota com ${states.length} paradas; ${states.filter((s) => s === 'done').length} concluídas`}
    >
      <span
        aria-hidden
        className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line/70"
      />
      <span
        aria-hidden
        className="z-10 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-background"
      >
        <House className="size-3.5" />
      </span>
      {states.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className={cn('z-10 size-3 shrink-0 rounded-full sm:size-3.5', color[s])}
        />
      ))}
      <span
        aria-hidden
        className="z-10 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-background"
      >
        <House className="size-3.5" />
      </span>
    </div>
  );
}

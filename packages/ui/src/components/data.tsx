import * as React from 'react';
import { cn } from '../lib/cn';
import { EmptyState } from './feedback';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'line';
  className?: string;
}

const statTone: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  line: 'text-line',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-3.5 sm:p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-muted-foreground sm:text-sm">
          {label}
        </span>
        {Icon ? <Icon className={cn('size-4 shrink-0', statTone[tone])} /> : null}
      </div>
      <span className="truncate text-2xl font-bold tracking-tight tabular-nums sm:text-[1.7rem]">
        {value}
      </span>
      {hint ? <span className="truncate text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export interface ChartCardProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  actions,
  empty,
  emptyText = 'Ainda não há dados para este gráfico.',
  className,
  children,
}: ChartCardProps) {
  return (
    <section
      className={cn('min-w-0 rounded-lg border bg-card p-4 sm:p-5', className)}
      aria-label={title}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold leading-tight">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {empty ? (
        <EmptyState title={emptyText} className="py-8" />
      ) : (
        <div className="w-full min-w-0">{children}</div>
      )}
    </section>
  );
}

/* --------------------------------- Table ---------------------------------- */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-card">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  );
}
export const THead = (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-muted/60 text-left text-xs text-muted-foreground" {...props} />
);
export const TBody = (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className="divide-y" {...props} />
);
export const TR = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('hover:bg-muted/40', className)} {...props} />
);
export const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn('px-3 py-2.5 font-semibold whitespace-nowrap', className)}
    {...props}
  />
);
export const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-3 py-2.5 align-middle', className)} {...props} />
);

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Ocultar no cartão do celular */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  /** Renderização compacta usada no celular (cartões, sem rolagem horizontal) */
  mobileCard?: (row: T) => React.ReactNode;
  empty?: React.ReactNode;
  caption?: string;
}

/** Tabela no desktop, cartões empilhados no celular. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  mobileCard,
  empty,
  caption,
}: DataTableProps<T>) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Nenhum registro encontrado." />}</>;
  return (
    <>
      {mobileCard ? (
        <ul className="flex flex-col gap-2 md:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)}>{mobileCard(row)}</li>
          ))}
        </ul>
      ) : null}
      <div className={cn(mobileCard && 'hidden md:block')}>
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <THead>
            <tr>
              {columns.map((c) => (
                <TH key={c.key} className={c.className}>
                  {c.header}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={rowKey(row)}>
                {columns.map((c) => (
                  <TD key={c.key} className={c.className}>
                    {c.cell(row)}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[1.6rem] leading-tight font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'flex w-full max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:w-auto',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-10 flex-1 shrink-0 rounded-md px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors sm:flex-none',
            o.value === value && 'bg-card text-foreground shadow-sm',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Avatar com foto; sem foto (ou se a imagem falhar) mostra as iniciais. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const base = 'inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full';
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn(base, 'bg-muted object-cover', className)}
      />
    );
  }
  return (
    <span aria-hidden className={cn(base, 'bg-primary text-sm font-bold text-primary-foreground', className)}>
      {initials || '?'}
    </span>
  );
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn('my-4 border-border', className)} />;
}

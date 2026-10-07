import { CircleAlert, CircleCheck, Inbox, Info, LoaderCircle, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { cn } from '../lib/cn';

export { toast };

export function Toaster({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <SonnerToaster
      theme={theme}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ className: 'font-sans' }}
    />
  );
}

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'critical' | 'neutral';

const toneStyles: Record<Tone, string> = {
  info: 'border-info/30 bg-info-soft text-foreground [&_[data-icon]]:text-info',
  success: 'border-success/30 bg-success-soft text-foreground [&_[data-icon]]:text-success',
  warning: 'border-warning/40 bg-warning-soft text-foreground [&_[data-icon]]:text-warning',
  danger: 'border-danger/40 bg-danger-soft text-foreground [&_[data-icon]]:text-danger',
  critical: 'border-critical bg-critical-soft text-foreground [&_[data-icon]]:text-critical',
  neutral: 'border-border bg-muted text-foreground [&_[data-icon]]:text-muted-foreground',
};
const toneIcon: Record<Tone, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  critical: CircleAlert,
  neutral: Info,
};

export interface AlertProps {
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, action, className }: AlertProps) {
  const Icon = toneIcon[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'critical' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-3.5', toneStyles[tone], className)}
    >
      <span data-icon className="mt-0.5 shrink-0">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{title}</p>
        {children ? <div className="mt-0.5 text-sm text-muted-foreground">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function Spinner({
  label = 'Carregando',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}
    >
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span>{label}…</span>
    </span>
  );
}

export function Progress({
  value,
  label,
  tone = 'primary',
  className,
}: {
  value: number;
  label: string;
  tone?: 'primary' | 'success' | 'line';
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500',
          tone === 'primary' && 'bg-primary',
          tone === 'success' && 'bg-success',
          tone === 'line' && 'bg-line',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center',
        className,
      )}
    >
      <Icon className="size-8 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

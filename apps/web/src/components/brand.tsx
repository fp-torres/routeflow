import { cn } from '@routeflow/ui';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('size-8 shrink-0', className)}>
      <rect width="64" height="64" rx="14" fill="#13233B" />
      <path
        d="M14 40 C24 12, 34 56, 50 24"
        fill="none"
        stroke="#F05A28"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="14" cy="40" r="6" fill="#FFFFFF" />
      <circle cx="50" cy="24" r="6" fill="#F05A28" stroke="#FFFFFF" strokeWidth="3" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <BrandMark />
      <span className="text-lg font-bold tracking-tight">RouteFlow</span>
    </span>
  );
}

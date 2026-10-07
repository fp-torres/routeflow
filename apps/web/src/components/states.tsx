import { RefreshCw } from 'lucide-react';
import { Alert, Button, Skeleton, toast } from '@routeflow/ui';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a ação.';
}

export const toastError = (error: unknown) => toast.error(errorMessage(error));

export function ErrorState({
  error,
  onRetry,
  title = 'Não foi possível carregar os dados.',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <Alert
      tone="danger"
      title={title}
      action={
        onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw /> Tentar de novo
          </Button>
        ) : null
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

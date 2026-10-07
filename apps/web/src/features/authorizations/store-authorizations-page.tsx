import { ChevronLeft, FileText, Plus } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router';
import { Alert, Button, EmptyState, PageHeader } from '@routeflow/ui';
import { ErrorState, ListSkeleton } from '@/components/states';
import { StoreAuthBadge } from '@/components/status';
import { useAuth } from '@/lib/auth';
import { useLetters, useStore } from '@/lib/queries';
import { LetterDialog, LetterList } from './letter-dialogs';

export function StoreAuthorizationsPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const store = useStore(id);
  const letters = useLetters({ storeId: id });
  const [creating, setCreating] = React.useState(false);
  const preset = React.useMemo(() => [id], [id]);
  const info = store.data?.authorization ?? null;
  React.useEffect(() => {
    document.title = 'Autorizações da loja — RouteFlow';
  }, []);
  return (
    <>
      <Link
        to={`/lojas/${id}`}
        className="mb-1 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"
      >
        <ChevronLeft className="size-4" /> {store.data?.name ?? 'Loja'}
      </Link>
      <PageHeader
        title="Cartas de autorização"
        description={store.data ? `${store.data.code} — ${store.data.name}` : undefined}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Enviar carta
          </Button>
        }
      />
      {store.data ? (
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            Situação desta loja: <StoreAuthBadge info={info} />
          </div>
          {info?.required === false ? (
            <Alert
              tone="neutral"
              title={`A rede ${store.data.network} não exige carta de autorização.`}
            >
              A regra fica em Configurações › Operação (ou no cadastro da loja). Se esta loja passar
              a exigir carta, basta cadastrá-la aqui.
            </Alert>
          ) : null}
        </div>
      ) : null}
      {letters.isLoading ? (
        <ListSkeleton rows={3} />
      ) : letters.error ? (
        <ErrorState error={letters.error} onRetry={() => void letters.refetch()} />
      ) : !letters.data?.length ? (
        <EmptyState
          icon={FileText}
          title="Esta loja ainda não tem carta de autorização."
          description="Envie o PDF (uma carta pode valer para várias lojas) para que ele fique disponível no celular durante a visita."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Enviar carta
            </Button>
          }
        />
      ) : (
        <LetterList
          letters={letters.data}
          storeId={id}
          canDelete={user?.role === 'ADMIN' || user?.role === 'MANAGER'}
        />
      )}
      <LetterDialog open={creating} onOpenChange={setCreating} presetStoreIds={preset} />
    </>
  );
}

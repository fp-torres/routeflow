import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  ScrollText,
  Trash,
} from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router';
import {
  describeDaysLeft,
  formatDateBR,
  formatDateTimeBR,
  type AuthorizationLetterDto,
} from '@routeflow/types';
import {
  Button,
  Dialog,
  DialogContent,
  Drawer,
  DrawerContent,
  EmptyState,
  formatBytes,
  PageHeader,
  Spinner,
  toast,
} from '@routeflow/ui';
import { ErrorState, ListSkeleton, toastError } from '@/components/states';
import { ValidityBadge } from '@/components/status';
import { api, upload } from '@/lib/api';
import { useLetterHistory, useLetters, useStore } from '@/lib/queries';
import { LetterForm, type LetterFormValues } from './letter-dialogs';

const HISTORY_LABEL: Record<string, string> = {
  CREATED: 'Carta enviada',
  UPDATED: 'Dados alterados',
  FILE_REPLACED: 'Arquivo substituído (versão anterior)',
  DELETED: 'Carta excluída',
};

export function StoreAuthorizationsPage() {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const store = useStore(id);
  const letters = useLetters({ storeId: id });
  const [dialog, setDialog] = React.useState<
    { kind: 'create' } | { kind: 'edit'; letter: AuthorizationLetterDto } | null
  >(null);
  const [historyOf, setHistoryOf] = React.useState<string | null>(null);
  const history = useLetterHistory(historyOf);
  const replaceInput = React.useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = React.useState<string | null>(null);
  const refresh = () =>
    Promise.all(
      ['letters', 'store', 'dashboard', 'visit'].map((k) =>
        client.invalidateQueries({ queryKey: [k] }),
      ),
    );
  React.useEffect(() => {
    document.title = 'Autorizações da loja — RouteFlow';
  }, []);

  const toForm = (values: LetterFormValues) => {
    const form = new FormData();
    form.append('title', values.title);
    if (values.issueDate) form.append('issueDate', values.issueDate);
    if (values.validFrom) form.append('validFrom', values.validFrom);
    if (values.expirationDate) form.append('expirationDate', values.expirationDate);
    if (values.notes) form.append('notes', values.notes);
    return form;
  };
  const create = useMutation({
    mutationFn: ({ values, file }: { values: LetterFormValues; file: File }) => {
      const form = toForm(values);
      form.append('file', file, file.name);
      return upload<AuthorizationLetterDto>(`/stores/${id}/authorizations`, form);
    },
    onSuccess: () => {
      setDialog(null);
      toast.success('Carta enviada.');
      void refresh();
    },
    onError: toastError,
  });
  const update = useMutation({
    mutationFn: ({ letterId, values }: { letterId: string; values: LetterFormValues }) =>
      api.patch(`/authorizations/${letterId}`, {
        title: values.title,
        issueDate: values.issueDate || null,
        validFrom: values.validFrom || null,
        expirationDate: values.expirationDate || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      setDialog(null);
      toast.success('Carta atualizada.');
      void refresh();
    },
    onError: toastError,
  });
  const replace = useMutation({
    mutationFn: ({ letterId, file }: { letterId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file, file.name);
      return upload(`/authorizations/${letterId}/file`, form);
    },
    onSuccess: () => {
      toast.success('Arquivo substituído. A versão anterior continua no histórico.');
      void refresh();
    },
    onError: toastError,
    onSettled: () => setReplacing(null),
  });
  const remove = useMutation({
    mutationFn: (letterId: string) => api.delete(`/authorizations/${letterId}`),
    onSuccess: () => {
      toast.success('Carta excluída.');
      void refresh();
    },
    onError: toastError,
  });

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
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus /> Enviar carta
          </Button>
        }
      />
      <input
        ref={replaceInput}
        type="file"
        accept="application/pdf"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replacing) replace.mutate({ letterId: replacing, file });
          e.target.value = '';
        }}
      />
      {letters.isLoading ? (
        <ListSkeleton rows={3} />
      ) : letters.error ? (
        <ErrorState error={letters.error} onRetry={() => void letters.refetch()} />
      ) : !letters.data?.length ? (
        <EmptyState
          icon={FileText}
          title="Esta loja ainda não tem carta de autorização."
          description="Envie o PDF para que ele fique disponível no celular durante a visita."
          action={
            <Button onClick={() => setDialog({ kind: 'create' })}>
              <Plus /> Enviar carta
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {letters.data.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.fileName} — {formatBytes(l.fileSize)}
                  </p>
                </div>
                <ValidityBadge validity={l.validity} daysLeft={l.daysLeft} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Emissão</dt>
                  <dd>{formatDateBR(l.issueDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Início</dt>
                  <dd>{formatDateBR(l.validFrom)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Vencimento</dt>
                  <dd className="font-semibold">{formatDateBR(l.expirationDate)}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted-foreground">{describeDaysLeft(l.daysLeft)}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button asChild size="sm">
                  <a href={l.url} target="_blank" rel="noreferrer">
                    <ExternalLink /> Abrir
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={l.downloadUrl}>
                    <Download /> Baixar
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={replace.isPending && replacing === l.id}
                  onClick={() => {
                    setReplacing(l.id);
                    replaceInput.current?.click();
                  }}
                >
                  <RefreshCw /> Substituir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ kind: 'edit', letter: l })}
                >
                  <Pencil /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setHistoryOf(l.id)}>
                  <ScrollText /> Histórico
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() =>
                    window.confirm('Excluir esta carta? O histórico é mantido.') &&
                    remove.mutate(l.id)
                  }
                >
                  <Trash /> Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog ? (
          <DialogContent
            title={dialog.kind === 'create' ? 'Enviar carta de autorização' : 'Editar carta'}
            size="lg"
          >
            <LetterForm
              letter={dialog.kind === 'edit' ? dialog.letter : undefined}
              withFile={dialog.kind === 'create'}
              submitting={create.isPending || update.isPending}
              onCancel={() => setDialog(null)}
              onSubmit={(values, file) =>
                dialog.kind === 'create'
                  ? file && create.mutate({ values, file })
                  : update.mutate({ letterId: dialog.letter.id, values })
              }
            />
          </DialogContent>
        ) : null}
      </Dialog>
      <Drawer open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DrawerContent title="Histórico da carta">
          {history.isLoading ? (
            <Spinner />
          ) : (
            <ol className="flex flex-col gap-3 border-l-2 border-line/50 pl-4">
              {history.data?.map((h) => (
                <li key={h.id}>
                  <p className="text-sm font-semibold">{HISTORY_LABEL[h.action] ?? h.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTimeBR(h.createdAt)}
                    {h.user ? ` — ${h.user.name}` : ''}
                  </p>
                  {h.url ? (
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {h.fileName ?? 'Abrir arquivo'}
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

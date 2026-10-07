import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, Pencil, RefreshCw, ScrollText, Trash, Unlink } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';
import {
  describeDaysLeft,
  formatDateBR,
  formatDateTimeBR,
  parseAuthorizationLetterText,
  todayIso,
  type AuthorizationLetterDto,
  type IsoDate,
  type ParsedLetter,
  type StoreDto,
} from '@routeflow/types';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  Drawer,
  DrawerContent,
  Field,
  FileUploader,
  formatBytes,
  Input,
  Select,
  Spinner,
  Textarea,
  toast,
} from '@routeflow/ui';
import { useConfirm } from '@/components/confirm';
import { toastError } from '@/components/states';
import { ValidityBadge } from '@/components/status';
import { api, upload } from '@/lib/api';
import { extractPdfLines } from '@/lib/pdf-text';
import { useAllStores, useCatalog, useLetterHistory } from '@/lib/queries';

const MONTHS = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'maio',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
];
const DEFAULT_TITLE = 'Autorização de promotor';
const codeKey = (v: string) => v.trim().toUpperCase();
const plain = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
export const byStoreCode = (a: { code: string }, b: { code: string }) =>
  a.code.localeCompare(b.code, 'pt-BR', { numeric: true });

const HISTORY_LABEL: Record<string, string> = {
  CREATED: 'Carta enviada',
  UPDATED: 'Dados ou lojas alterados',
  FILE_REPLACED: 'Arquivo substituído (versão anterior)',
  DELETED: 'Carta excluída',
};

function useRefreshLetters() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ['letters', 'store', 'stores', 'dashboard', 'visit'].map((k) =>
        client.invalidateQueries({ queryKey: [k] }),
      ),
    );
}

interface LetterValues {
  title: string;
  network: string;
  issueDate: string;
  validFrom: string;
  expirationDate: string;
  notes: string;
}

/**
 * Enviar ou editar uma carta de autorização que pode cobrir várias lojas.
 * Ao escolher o PDF, o texto é lido no navegador: as filiais encontradas já ficam marcadas,
 * com as datas da ação, e a vigência é sugerida a partir dos meses da carta.
 */
export function LetterDialog({
  open,
  onOpenChange,
  letter,
  presetStoreIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letter?: AuthorizationLetterDto | null;
  presetStoreIds?: string[];
}) {
  const refresh = useRefreshLetters();
  const stores = useAllStores(open);
  const catalog = useCatalog();
  const [file, setFile] = React.useState<File | null>(null);
  const [values, setValues] = React.useState<LetterValues>({
    title: DEFAULT_TITLE,
    network: '',
    issueDate: '',
    validFrom: '',
    expirationDate: '',
    notes: '',
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [dates, setDates] = React.useState<Record<string, IsoDate[]>>({});
  const [parsed, setParsed] = React.useState<ParsedLetter | null>(null);
  const [reading, setReading] = React.useState(false);
  const [readError, setReadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const presetKey = presetStoreIds?.join(',') ?? '';

  React.useEffect(() => {
    if (!open) return;
    setFile(null);
    setParsed(null);
    setReadError(null);
    setSearch('');
    setErrors({});
    setValues({
      title: letter?.title ?? DEFAULT_TITLE,
      network: letter?.network ?? '',
      issueDate: letter?.issueDate ?? '',
      validFrom: letter?.validFrom ?? '',
      expirationDate: letter?.expirationDate ?? '',
      notes: letter?.notes ?? '',
    });
    setSelected(
      new Set(letter ? letter.stores.map((s) => s.id) : presetKey ? presetKey.split(',') : []),
    );
    setDates(
      letter
        ? Object.fromEntries(
            letter.stores.filter((s) => s.dates.length).map((s) => [s.id, s.dates]),
          )
        : {},
    );
  }, [open, letter, presetKey]);

  const all = React.useMemo(
    () =>
      [...(stores.data ?? [])]
        .filter((s) => s.active || selected.has(s.id))
        .sort((a, b) => a.network.localeCompare(b.network) || byStoreCode(a, b)),
    [stores.data, selected],
  );
  const known = React.useMemo(() => new Map(all.map((s) => [codeKey(s.code), s])), [all]);

  const readPdf = async (next: File | null) => {
    setFile(next);
    setParsed(null);
    setReadError(null);
    if (!next) return;
    setReading(true);
    try {
      const list: StoreDto[] = stores.data ?? (await stores.refetch()).data ?? [];
      const map = new Map(list.map((s) => [codeKey(s.code), s]));
      const result = parseAuthorizationLetterText(await extractPdfLines(next), todayIso());
      setParsed(result);
      if (!result.stores.length) {
        setReadError(
          'Nenhum código de filial foi encontrado no PDF. Selecione as lojas manualmente.',
        );
        return;
      }
      const matched = result.stores
        .map((p) => ({ p, store: map.get(codeKey(p.code)) }))
        .filter((m): m is { p: (typeof result.stores)[number]; store: StoreDto } => !!m.store);
      setSelected((prev) => new Set([...prev, ...matched.map((m) => m.store.id)]));
      setDates((prev) => ({
        ...prev,
        ...Object.fromEntries(
          matched.filter((m) => m.p.dates.length).map((m) => [m.store.id, m.p.dates]),
        ),
      }));
      const first = result.months[0];
      const last = result.months[result.months.length - 1];
      setValues((v) => ({
        ...v,
        title:
          v.title === DEFAULT_TITLE && first && last
            ? `${DEFAULT_TITLE} — ${MONTHS[first - 1]} a ${MONTHS[last - 1]} ${result.expirationDate?.slice(0, 4) ?? ''}`.trim()
            : v.title,
        network: v.network || result.network || '',
        validFrom: v.validFrom || result.validFrom || '',
        expirationDate: v.expirationDate || result.expirationDate || '',
      }));
    } catch {
      setReadError(
        'Não foi possível ler o texto deste PDF (pode ser uma imagem escaneada). Selecione as lojas manualmente.',
      );
    } finally {
      setReading(false);
    }
  };

  const network = values.network || parsed?.network || '';
  const unknownCodes = parsed
    ? parsed.stores.filter((p) => !known.has(codeKey(p.code))).map((p) => p.code)
    : [];
  const matchedCount = parsed ? parsed.stores.length - unknownCodes.length : 0;
  const notCovered =
    parsed && network
      ? all.filter(
          (s) =>
            s.active &&
            s.network === network &&
            !parsed.stores.some((p) => codeKey(p.code) === codeKey(s.code)),
        )
      : [];
  const networks = [
    ...new Set([...(catalog.data?.networks ?? []), ...(values.network ? [values.network] : [])]),
  ];
  const term = plain(search.trim());
  const visible = term
    ? all.filter((s) => plain(`${s.code} ${s.name} ${s.neighborhood ?? ''}`).includes(term))
    : all;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const save = useMutation({
    mutationFn: async () => {
      const storeIds = [...selected];
      const storeDates = Object.fromEntries(
        storeIds.filter((id) => dates[id]?.length).map((id) => [id, dates[id]!]),
      );
      if (letter) {
        return api.patch(`/authorizations/${letter.id}`, {
          title: values.title,
          network: values.network || null,
          issueDate: values.issueDate || null,
          validFrom: values.validFrom || null,
          expirationDate: values.expirationDate || null,
          notes: values.notes || null,
          storeIds,
          storeDates,
        });
      }
      const form = new FormData();
      form.append('title', values.title);
      if (values.network) form.append('network', values.network);
      if (values.issueDate) form.append('issueDate', values.issueDate);
      if (values.validFrom) form.append('validFrom', values.validFrom);
      if (values.expirationDate) form.append('expirationDate', values.expirationDate);
      if (values.notes) form.append('notes', values.notes);
      form.append('storeIds', storeIds.join(','));
      if (Object.keys(storeDates).length) form.append('storeDates', JSON.stringify(storeDates));
      form.append('file', file!, file!.name);
      return upload('/authorizations', form);
    },
    onSuccess: () => {
      toast.success(letter ? 'Carta atualizada.' : `Carta enviada para ${selected.size} loja(s).`);
      onOpenChange(false);
      void refresh();
    },
    onError: toastError,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!letter && !file) next.file = 'Selecione o PDF da carta.';
    if (values.title.trim().length < 2) next.title = 'Informe um título.';
    if (selected.size === 0) next.stores = 'Selecione ao menos uma loja coberta pela carta.';
    if (values.validFrom && values.expirationDate && values.validFrom > values.expirationDate) {
      next.expirationDate = 'O vencimento deve ser depois do início.';
    }
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };
  const set =
    (key: keyof LetterValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={letter ? 'Editar carta de autorização' : 'Enviar carta de autorização'}
        description="Uma carta pode valer para várias lojas (ex.: carta trimestral da rede)."
        size="lg"
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          {!letter ? (
            <Field label="PDF da carta" htmlFor="letter-file" error={errors.file}>
              <FileUploader
                id="letter-file"
                file={file}
                onChange={(f) => void readPdf(f)}
                error={errors.file}
              />
            </Field>
          ) : null}
          {reading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Lendo as filiais e datas da carta…
            </p>
          ) : null}
          {readError ? <Alert tone="warning" title={readError} /> : null}
          {parsed && parsed.stores.length ? (
            <Alert tone="info" title={`Carta lida: ${parsed.stores.length} filiais encontradas`}>
              <p>
                {matchedCount} cadastrada(s) já marcada(s) abaixo
                {parsed.validFrom && parsed.expirationDate
                  ? `; vigência sugerida de ${formatDateBR(parsed.validFrom)} a ${formatDateBR(parsed.expirationDate)}`
                  : ''}
                .
              </p>
              {unknownCodes.length ? (
                <p>Não cadastradas no sistema: {unknownCodes.join(', ')}.</p>
              ) : null}
              {notCovered.length ? (
                <p className="font-semibold">
                  Lojas da {network} que NÃO estão nesta carta:{' '}
                  {notCovered.map((s) => s.code).join(', ')}.
                </p>
              ) : null}
            </Alert>
          ) : null}
          <Field label="Título" htmlFor="letter-title" error={errors.title}>
            <Input id="letter-title" value={values.title} onChange={set('title')} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Rede" htmlFor="letter-network">
              <Select id="letter-network" value={values.network} onChange={set('network')}>
                <option value="">Não informada</option>
                {networks.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Emissão" htmlFor="letter-issue">
              <DatePicker id="letter-issue" value={values.issueDate} onChange={set('issueDate')} />
            </Field>
            <Field label="Início da vigência" htmlFor="letter-from">
              <DatePicker id="letter-from" value={values.validFrom} onChange={set('validFrom')} />
            </Field>
            <Field
              label="Vencimento"
              htmlFor="letter-exp"
              error={errors.expirationDate}
              hint="Vazio = sem vencimento"
            >
              <DatePicker
                id="letter-exp"
                value={values.expirationDate}
                onChange={set('expirationDate')}
              />
            </Field>
          </div>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Lojas cobertas ({selected.size})</legend>
            <div className="flex flex-wrap gap-2">
              {networks.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelected(
                      (prev) =>
                        new Set([
                          ...prev,
                          ...all.filter((s) => s.active && s.network === n).map((s) => s.id),
                        ]),
                    )
                  }
                >
                  Todas: {n}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                Limpar
              </Button>
            </div>
            <Input
              aria-label="Filtrar lojas"
              placeholder="Filtrar por código, nome ou bairro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto rounded-md border px-3">
              {stores.isLoading ? (
                <div className="py-3">
                  <Spinner />
                </div>
              ) : (
                visible.map((s) => (
                  <Checkbox
                    key={s.id}
                    id={`letter-store-${s.id}`}
                    checked={selected.has(s.id)}
                    onChange={(e) => toggle(s.id, e.target.checked)}
                    className="border-b py-1 last:border-b-0"
                    label={
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">
                          <strong>{s.code}</strong> — {s.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {s.network}
                          {s.neighborhood ? ` · ${s.neighborhood}` : ''}
                          {dates[s.id]?.length
                            ? ` · datas: ${dates[s.id]!.map((d) => formatDateBR(d).slice(0, 5)).join(', ')}`
                            : ''}
                        </span>
                      </span>
                    }
                  />
                ))
              )}
            </div>
            {errors.stores ? (
              <p className="text-sm font-semibold text-danger">{errors.stores}</p>
            ) : null}
          </fieldset>
          <Field label="Observações" htmlFor="letter-notes">
            <Textarea id="letter-notes" value={values.notes} onChange={set('notes')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending} disabled={reading}>
              {letter ? 'Salvar' : 'Enviar carta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Lista de cartas com ações (abrir, baixar, substituir, editar lojas/datas, histórico, excluir). */
export function LetterList({
  letters,
  storeId,
}: {
  letters: AuthorizationLetterDto[];
  storeId?: string;
}) {
  const refresh = useRefreshLetters();
  const confirm = useConfirm();
  const [editing, setEditing] = React.useState<AuthorizationLetterDto | null>(null);
  const [historyOf, setHistoryOf] = React.useState<string | null>(null);
  const history = useLetterHistory(historyOf);
  const replaceInput = React.useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = React.useState<string | null>(null);
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
      toast.success('Carta excluída. O histórico continua disponível na auditoria.');
      void refresh();
    },
    onError: toastError,
  });
  const removeStore = useMutation({
    mutationFn: ({ letterId, store }: { letterId: string; store: string }) =>
      api.delete<{ deleted: boolean }>(`/authorizations/${letterId}/stores/${store}`),
    onSuccess: () => {
      toast.success('Loja removida da carta.');
      void refresh();
    },
    onError: toastError,
  });
  return (
    <>
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
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {letters.map((l) => {
          const here = storeId ? l.stores.find((s) => s.id === storeId) : null;
          return (
            <li key={l.id} className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{l.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.network ? `${l.network} · ` : ''}
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
              {here?.dates.length ? (
                <p className="text-sm">
                  <span className="font-semibold">Datas da ação nesta loja:</span>{' '}
                  {here.dates.map((d) => formatDateBR(d).slice(0, 5)).join(', ')}
                </p>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <p className="text-sm">
                  <span className="font-semibold">{l.stores.length}</span> loja(s) coberta(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {l.stores.slice(0, 14).map((s) => (
                    <Link key={s.id} to={`/lojas/${s.id}/autorizacoes`} title={s.name}>
                      <Badge tone={s.id === storeId ? 'line' : 'neutral'}>{s.code}</Badge>
                    </Link>
                  ))}
                  {l.stores.length > 14 ? (
                    <Badge tone="neutral">+{l.stores.length - 14}</Badge>
                  ) : null}
                </div>
              </div>
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
                <Button size="sm" variant="outline" onClick={() => setEditing(l)}>
                  <Pencil /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setHistoryOf(l.id)}>
                  <ScrollText /> Histórico
                </Button>
                {storeId && l.stores.length > 1 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={removeStore.isPending}
                    onClick={() =>
                      void confirm({
                        title: `Remover esta loja da carta?`,
                        description: `A carta "${l.title}" continua valendo para as outras ${l.stores.length - 1} loja(s).`,
                        confirmLabel: 'Remover desta loja',
                        tone: 'danger',
                      }).then((ok) => ok && removeStore.mutate({ letterId: l.id, store: storeId }))
                    }
                  >
                    <Unlink /> Remover desta loja
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  loading={remove.isPending && remove.variables === l.id}
                  onClick={() =>
                    void confirm({
                      title: `Excluir a carta "${l.title}"?`,
                      description: `Ela deixa de valer para ${l.stores.length === 1 ? 'a loja' : `as ${l.stores.length} lojas`}. O arquivo e o histórico ficam guardados para auditoria.`,
                      confirmLabel: 'Excluir carta',
                      tone: 'danger',
                    }).then((ok) => ok && remove.mutate(l.id))
                  }
                >
                  <Trash /> Excluir
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <LetterDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        letter={editing}
      />
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

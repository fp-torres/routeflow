import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  CalendarClock,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Download,
  ExternalLink,
  FileText,
  ListChecks,
  MapPin,
  Play,
  ShieldAlert,
  StickyNote,
  Trash,
  Wallet,
  Bus,
  Pencil,
} from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  addDaysIso,
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  formatDuration,
  formatTimeBR,
  isUsableValidity,
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABEL,
  todayIso,
  TRANSPORT_TYPE_LABEL,
  TRANSPORT_TYPES,
  VISIT_ACTIVITY_TYPE_LABEL,
  type PhotoCategory,
  type PhotoDto,
  type TransportType,
  type VisitActionResult,
  type VisitDetailDto,
} from '@routeflow/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePicker,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  formatBytes,
  Input,
  PhotoUploader,
  Select,
  Textarea,
  toast,
  MoneyInput,
} from '@routeflow/ui';
import { ErrorState, PageSkeleton, toastError } from '@/components/states';
import { useConfirm } from '@/components/confirm';
import { StoreAuthBadge, ValidityBadge, VisitStatusBadge } from '@/components/status';
import { api, upload } from '@/lib/api';
import { currentPosition } from '@/lib/geo';
import { keys, useInvalidateOperation, useVisit } from '@/lib/queries';
import { VisitEditDialog } from './visit-edit-dialog';

type DialogKind = 'note' | 'activity' | 'finish' | 'reschedule' | 'expense' | null;

export function VisitDetailPage() {
  const confirm = useConfirm();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const invalidate = useInvalidateOperation();
  const visit = useVisit(id);
  const [dialog, setDialog] = React.useState<DialogKind>(null);
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState('');
  const [category, setCategory] = React.useState<PhotoCategory>('FACADE');
  const [finish, setFinish] = React.useState<{
    status: 'COMPLETED' | 'NOT_COMPLETED';
    reason: string;
    notes: string;
  }>({ status: 'COMPLETED', reason: '', notes: '' });
  const [reschedule, setReschedule] = React.useState({
    date: addDaysIso(todayIso(), 1),
    reason: '',
  });
  const [expense, setExpense] = React.useState<{ type: TransportType; value: number | null }>({
    type: 'BUS',
    value: null,
  });
  const [photo, setPhoto] = React.useState<PhotoDto | null>(null);

  React.useEffect(() => {
    if (visit.data) document.title = `${visit.data.store.name} — RouteFlow`;
  }, [visit.data]);

  const apply = (data: VisitDetailDto) => {
    client.setQueryData(keys.visit(id), data);
    void invalidate();
  };
  const close = () => {
    setDialog(null);
    setText('');
  };

  const start = useMutation({
    mutationFn: async () => {
      const position = await currentPosition();
      return api.post<VisitActionResult>(`/visits/${id}/start`, position ?? {});
    },
    onSuccess: (r) => {
      apply(r.visit);
      if (r.warning) toast.warning(r.warning);
      else toast.success('Visita iniciada.');
    },
    onError: toastError,
  });
  const addActivity = useMutation({
    mutationFn: (body: { type: 'NOTE' | 'ACTIVITY'; description: string }) =>
      api.post<VisitDetailDto>(`/visits/${id}/activities`, body),
    onSuccess: (d, body) => {
      apply(d);
      close();
      toast.success(body.type === 'NOTE' ? 'Observação registrada.' : 'Atividade registrada.');
    },
    onError: toastError,
  });
  const finishVisit = useMutation({
    mutationFn: async () => {
      const position = await currentPosition();
      return api.post<VisitActionResult>(`/visits/${id}/finish`, {
        status: finish.status,
        reason: finish.reason || undefined,
        notes: finish.notes || undefined,
        ...(position ?? {}),
      });
    },
    onSuccess: (r) => {
      apply(r.visit);
      close();
      toast.success(
        r.visit.status === 'COMPLETED'
          ? 'Visita finalizada.'
          : 'Visita registrada como não realizada.',
      );
    },
    onError: toastError,
  });
  const doReschedule = useMutation({
    mutationFn: () =>
      api.post<VisitDetailDto>(`/visits/${id}/reschedule`, {
        date: reschedule.date,
        reason: reschedule.reason || undefined,
      }),
    onSuccess: (d) => {
      void invalidate();
      close();
      toast.success(`Visita reagendada para ${formatDateBR(d.scheduledDate)}.`);
      navigate(`/visitas/${d.id}`, { replace: true });
    },
    onError: toastError,
  });
  const addExpense = useMutation({
    mutationFn: () =>
      api.post('/expenses', {
        date: todayIso(),
        type: expense.type,
        actualValue: expense.value,
        visitId: id,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.visit(id) });
      void invalidate();
      close();
      toast.success('Despesa registrada.');
    },
    onError: toastError,
  });
  const removePhoto = useMutation({
    mutationFn: (photoId: string) => api.delete(`/visits/${id}/photos/${photoId}`),
    onSuccess: () => {
      setPhoto(null);
      void client.invalidateQueries({ queryKey: keys.visit(id) });
      toast.success('Foto removida.');
    },
    onError: toastError,
  });

  if (visit.isLoading) return <PageSkeleton />;
  if (visit.error || !visit.data)
    return <ErrorState error={visit.error} onRetry={() => void visit.refetch()} />;
  const v = visit.data;
  const letter = v.letters.find((l) => isUsableValidity(l.validity)) ?? v.letters[0];
  const open = v.status === 'PENDING' || v.status === 'BLOCKED';
  const inProgress = v.status === 'IN_PROGRESS';
  const closed = v.status === 'COMPLETED' || v.status === 'NOT_COMPLETED';
  const canAddEvidence = inProgress || closed;
  const duration =
    v.startedAt && v.finishedAt
      ? (new Date(v.finishedAt).getTime() - new Date(v.startedAt).getTime()) / 1000
      : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <Link
          to={v.routeId ? `/rotas/${v.routeId}` : '/visitas'}
          className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"
        >
          <ChevronLeft className="size-4" /> {v.routeId ? 'Rota do dia' : 'Visitas'}
        </Link>
        <h1 className="text-[1.6rem] leading-tight font-bold sm:text-3xl">{v.store.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge tone="outline">{v.store.code}</Badge>
          {v.store.region ? <span>{v.store.region}</span> : null}
          <span>
            {formatDateBR(v.scheduledDate)} — parada {v.order}
          </span>
          <VisitStatusBadge status={v.status} />
        </div>
        {v.statusReason ? (
          <p className="mt-2 text-sm text-muted-foreground">Motivo: {v.statusReason}</p>
        ) : null}
        {v.rescheduledFrom ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Reagendada de{' '}
            <Link className="font-semibold text-primary" to={`/visitas/${v.rescheduledFrom.id}`}>
              {formatDateBR(v.rescheduledFrom.scheduledDate)}
            </Link>
          </p>
        ) : null}
        {v.rescheduledTo ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Reagendada para{' '}
            <Link className="font-semibold text-primary" to={`/visitas/${v.rescheduledTo.id}`}>
              {formatDateBR(v.rescheduledTo.scheduledDate)}
            </Link>
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-line" /> Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-[1.05rem]">{v.store.fullAddress}</p>
          <Button asChild size="lg" variant="line" block>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.store.fullAddress)}&travelmode=transit`}
              target="_blank"
              rel="noreferrer"
            >
              <Bus /> Como chegar (transporte público)
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" block>
            <a href={v.store.mapsUrl} target="_blank" rel="noreferrer">
              <ExternalLink /> Ver no mapa
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-line" /> Carta de autorização
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {letter ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{letter.title}</span>
                <ValidityBadge validity={letter.validity} daysLeft={letter.daysLeft} />
              </div>
              <p className="text-sm text-muted-foreground">
                Vencimento: {formatDateBR(letter.expirationDate)}
              </p>
              {(() => {
                const days = letter.stores.find((s) => s.id === v.store.id)?.dates ?? [];
                if (!days.length) return null;
                const listed = days.includes(v.scheduledDate);
                return (
                  <p
                    className={listed ? 'text-sm' : 'text-sm font-semibold text-warning-foreground'}
                  >
                    Datas da ação nesta loja:{' '}
                    {days.map((d) => formatDateBR(d).slice(0, 5)).join(', ')}
                    {listed ? '' : ' — a data desta visita não está na carta.'}
                  </p>
                );
              })()}
              <div className="grid grid-cols-2 gap-2">
                <Button asChild size="lg">
                  <a href={letter.url} target="_blank" rel="noreferrer">
                    <FileText /> Abrir carta
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={letter.downloadUrl}>
                    <Download /> Baixar
                  </a>
                </Button>
              </div>
            </>
          ) : null}
          {!v.authorization?.hasValid ? (
            <Alert tone="warning" title="Esta loja não possui carta de autorização válida.">
              {v.blockWithoutAuthorization
                ? 'A visita será bloqueada até o envio de uma carta válida.'
                : 'A visita não é bloqueada, mas providencie a carta.'}{' '}
              <Link to={`/lojas/${v.store.id}/autorizacoes`} className="font-semibold text-primary">
                Gerenciar cartas
              </Link>
            </Alert>
          ) : (
            <StoreAuthBadge info={v.authorization} />
          )}
        </CardContent>
      </Card>

      {open ? (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            variant="line"
            className="h-14 text-lg"
            onClick={() => start.mutate()}
            loading={start.isPending}
          >
            <Play /> Iniciar visita
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            A localização aproximada é registrada só neste momento, se você permitir.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setDialog('reschedule')}>
              <CalendarClock /> Reagendar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFinish({ status: 'NOT_COMPLETED', reason: '', notes: '' });
                setDialog('finish');
              }}
            >
              <CircleX /> Não realizada
            </Button>
          </div>
        </div>
      ) : null}

      {inProgress ? (
        <Alert tone="info" title={`Visita em andamento desde ${formatTimeBR(v.startedAt)}`}>
          Registre as evidências e finalize ao sair da loja.
        </Alert>
      ) : null}
      {closed ? (
        <Alert
          tone={v.status === 'COMPLETED' ? 'success' : 'danger'}
          title={v.status === 'COMPLETED' ? 'Visita concluída' : 'Visita não realizada'}
        >
          {v.startedAt
            ? `${formatTimeBR(v.startedAt)} – ${formatTimeBR(v.finishedAt)}${duration ? ` (${formatDuration(duration)})` : ''}`
            : `Registrada em ${formatDateTimeBR(v.finishedAt)}`}
        </Alert>
      ) : null}

      {canAddEvidence ? (
        <Card>
          <CardHeader>
            <CardTitle>Fotos e evidências ({v.photos.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PhotoUploader
              extra={
                <Field label="Categoria das fotos" htmlFor="photo-category">
                  <Select
                    id="photo-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PhotoCategory)}
                  >
                    {PHOTO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {PHOTO_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </Select>
                </Field>
              }
              onUpload={async (files, sizes, onProgress) => {
                const form = new FormData();
                files.forEach((f) => form.append('files', f, f.name));
                form.append('category', category);
                form.append('originalSizes', sizes.join(','));
                const photos = await upload<PhotoDto[]>(`/visits/${id}/photos`, form, onProgress);
                const saved = photos.reduce((acc, p) => acc + p.originalSize - p.optimizedSize, 0);
                toast.success(
                  `${photos.length} foto(s) enviada(s). Economia de ${formatBytes(Math.max(0, saved))}.`,
                );
                void client.invalidateQueries({ queryKey: keys.visit(id) });
              }}
            />
            {v.photos.length ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {v.photos.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPhoto(p)}
                      className="block aspect-square w-full overflow-hidden rounded-md border bg-muted"
                    >
                      <img
                        src={p.thumbnailUrl ?? p.url}
                        alt={`${PHOTO_CATEGORY_LABEL[p.category]} — ${p.fileName}`}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={() => setDialog('note')}>
                <StickyNote /> Adicionar observação
              </Button>
              <Button variant="outline" onClick={() => setDialog('activity')}>
                <ListChecks /> Registrar atividade
              </Button>
              <Button variant="outline" onClick={() => setDialog('expense')}>
                <Wallet /> Registrar gasto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {inProgress ? (
        <Button
          size="lg"
          className="h-14 text-lg"
          onClick={() => {
            setFinish({ status: 'COMPLETED', reason: '', notes: v.notes ?? '' });
            setDialog('finish');
          }}
        >
          <CircleCheck /> Finalizar visita
        </Button>
      ) : null}
      {v.nextVisitId && closed ? (
        <Button asChild size="lg" variant="line">
          <Link to={`/visitas/${v.nextVisitId}`}>
            Próxima visita <ArrowUpRight />
          </Link>
        </Button>
      ) : null}

      {v.notes || closed ? (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Observações</CardTitle>
            {closed ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Editar visita
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {v.notes ? (
              <p className="whitespace-pre-line">{v.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem observações.</p>
            )}
            {closed ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Esqueceu algo? Edite a visita e adicione fotos, atividades e gastos mesmo depois de
                finalizada — tudo fica no histórico.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <VisitEditDialog visit={v} open={editing} onOpenChange={setEditing} />

      {v.expenses.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Gastos desta visita</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {v.expenses.map((e) => (
                <li key={e.id} className="flex justify-between py-2 text-sm">
                  <span>{TRANSPORT_TYPE_LABEL[e.type]}</span>
                  <span className="font-semibold tabular-nums">{formatBRL(e.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Histórico da visita</CardTitle>
        </CardHeader>
        <CardContent>
          {v.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <ol className="flex flex-col gap-3 border-l-2 border-line/50 pl-4">
              {v.activities.map((a) => (
                <li key={a.id}>
                  <p className="text-sm font-semibold">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {VISIT_ACTIVITY_TYPE_LABEL[a.type]} — {formatDateTimeBR(a.createdAt)}
                    {a.user ? ` — ${a.user.name}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog === 'note' || dialog === 'activity'} onOpenChange={(o) => !o && close()}>
        <DialogContent title={dialog === 'note' ? 'Adicionar observação' : 'Registrar atividade'}>
          {dialog === 'activity' && v.activityPresets.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {v.activityPresets.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={text === preset ? 'primary' : 'outline'}
                  onClick={() => setText(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          ) : null}
          <Field
            label={dialog === 'note' ? 'Observação' : 'Descrição da atividade'}
            htmlFor="activity-text"
          >
            <Textarea
              id="activity-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                addActivity.mutate({
                  type: dialog === 'note' ? 'NOTE' : 'ACTIVITY',
                  description: text.trim(),
                })
              }
              loading={addActivity.isPending}
              disabled={text.trim().length < 2}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'finish'} onOpenChange={(o) => !o && close()}>
        <DialogContent
          title={finish.status === 'COMPLETED' ? 'Finalizar visita' : 'Visita não realizada'}
        >
          <div className="flex flex-col gap-3">
            {inProgress ? (
              <Field label="Resultado" htmlFor="finish-status">
                <Select
                  id="finish-status"
                  value={finish.status}
                  onChange={(e) =>
                    setFinish({
                      ...finish,
                      status: e.target.value as 'COMPLETED' | 'NOT_COMPLETED',
                    })
                  }
                >
                  <option value="COMPLETED">Concluída</option>
                  <option value="NOT_COMPLETED">Não realizada</option>
                </Select>
              </Field>
            ) : null}
            {finish.status === 'NOT_COMPLETED' ? (
              <Field label="Motivo (obrigatório)" htmlFor="finish-reason">
                <Input
                  id="finish-reason"
                  value={finish.reason}
                  onChange={(e) => setFinish({ ...finish, reason: e.target.value })}
                  placeholder="Ex.: loja fechada, gerente ausente"
                />
              </Field>
            ) : null}
            <Field label="Observações finais" htmlFor="finish-notes">
              <Textarea
                id="finish-notes"
                value={finish.notes}
                onChange={(e) => setFinish({ ...finish, notes: e.target.value })}
              />
            </Field>
            {v.photos.length === 0 && finish.status === 'COMPLETED' ? (
              <Alert tone="warning" title="Nenhuma foto registrada nesta visita." />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Voltar
            </Button>
            <Button
              variant={finish.status === 'COMPLETED' ? 'primary' : 'danger'}
              onClick={() => finishVisit.mutate()}
              loading={finishVisit.isPending}
              disabled={finish.status === 'NOT_COMPLETED' && finish.reason.trim().length < 3}
            >
              {finish.status === 'COMPLETED' ? 'Finalizar visita' : 'Registrar não realizada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'reschedule'} onOpenChange={(o) => !o && close()}>
        <DialogContent
          title="Reagendar visita"
          description="A loja entra na rota da nova data e esta visita fica registrada como reagendada."
        >
          <div className="flex flex-col gap-3">
            <Field label="Nova data" htmlFor="reschedule-date">
              <DatePicker
                id="reschedule-date"
                min={todayIso()}
                value={reschedule.date}
                onChange={(e) => setReschedule({ ...reschedule, date: e.target.value })}
              />
            </Field>
            <Field label="Motivo" htmlFor="reschedule-reason">
              <Input
                id="reschedule-reason"
                value={reschedule.reason}
                onChange={(e) => setReschedule({ ...reschedule, reason: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              onClick={() => doReschedule.mutate()}
              loading={doReschedule.isPending}
              disabled={!reschedule.date}
            >
              Reagendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'expense'} onOpenChange={(o) => !o && close()}>
        <DialogContent
          title="Registrar gasto"
          description="Vinculado a esta visita e à rota do dia."
          size="sm"
        >
          <div className="flex flex-col gap-3">
            <Field label="Tipo" htmlFor="expense-type">
              <Select
                id="expense-type"
                value={expense.type}
                onChange={(e) => setExpense({ ...expense, type: e.target.value as TransportType })}
              >
                {TRANSPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TRANSPORT_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor pago (R$)" htmlFor="expense-value">
              <MoneyInput
                id="expense-value"
                value={expense.value}
                onValueChange={(v) => setExpense({ ...expense, value: v })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              onClick={() => addExpense.mutate()}
              loading={addExpense.isPending}
              disabled={!(expense.value && expense.value > 0)}
            >
              Salvar gasto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!photo} onOpenChange={(o) => !o && setPhoto(null)}>
        {photo ? (
          <DialogContent
            title={PHOTO_CATEGORY_LABEL[photo.category]}
            description={`${photo.width}×${photo.height} — original ${formatBytes(photo.originalSize)}, otimizada ${formatBytes(photo.optimizedSize)}`}
            size="lg"
          >
            <img
              src={photo.url}
              alt={photo.fileName}
              className="max-h-[60dvh] w-full rounded-md object-contain"
            />
            <DialogFooter>
              <Button
                variant="danger"
                onClick={() =>
                  void confirm({
                    title: 'Remover esta foto?',
                    confirmLabel: 'Remover',
                    tone: 'danger',
                  }).then((ok) => ok && removePhoto.mutate(photo.id))
                }
                loading={removePhoto.isPending}
              >
                <Trash /> Remover foto
              </Button>
              <Button asChild variant="outline">
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <ExternalLink /> Abrir original
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      {v.status === 'BLOCKED' ? (
        <Alert tone="critical" title="Visita bloqueada por falta de autorização válida.">
          <ShieldAlert className="inline size-4" /> Envie uma carta válida e tente iniciar
          novamente.
        </Alert>
      ) : null}
    </div>
  );
}

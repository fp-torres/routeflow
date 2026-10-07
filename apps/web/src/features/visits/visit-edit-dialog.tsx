import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import type { VisitDetailDto } from '@routeflow/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  Select,
  Textarea,
  toast,
} from '@routeflow/ui';
import { toastError } from '@/components/states';
import { api } from '@/lib/api';

const TZ = 'America/Sao_Paulo';

/** Data e hora locais (Brasília) de um instante ISO. */
function localParts(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null;
  const text = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
  const [date, time] = text.split(' ');
  return date && time ? { date, time: time.slice(0, 5) } : null;
}

const toIso = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`).toISOString();

/**
 * Corrige uma visita — inclusive depois de finalizada: resultado, motivo, observações e
 * horários. Cada alteração fica registrada no histórico da visita e na auditoria.
 */
export function VisitEditDialog({
  visit,
  open,
  onOpenChange,
}: {
  visit: VisitDetailDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = useQueryClient();
  const closed = visit.status === 'COMPLETED' || visit.status === 'NOT_COMPLETED';
  const start = localParts(visit.startedAt);
  const end = localParts(visit.finishedAt);
  const initial = React.useCallback(
    () => ({
      status: visit.status,
      reason: visit.statusReason ?? '',
      notes: visit.notes ?? '',
      start: start?.time ?? '',
      end: end?.time ?? '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula quando a visita muda
    [visit],
  );
  const [values, setValues] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setValues(initial());
      setError(null);
    }
  }, [open, initial]);
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {};
      if (values.notes !== (visit.notes ?? '')) body.notes = values.notes.trim() || null;
      if (closed && values.status !== visit.status) {
        body.status = values.status;
        if (values.status === 'NOT_COMPLETED') body.statusReason = values.reason.trim() || null;
      } else if (
        closed &&
        values.status === 'NOT_COMPLETED' &&
        values.reason !== (visit.statusReason ?? '')
      ) {
        body.statusReason = values.reason.trim() || null;
      }
      if (start && values.start && values.start !== start.time)
        body.startedAt = toIso(start.date, values.start);
      if (closed && end && values.end && values.end !== end.time)
        body.finishedAt = toIso(end.date, values.end);
      return api.patch(`/visits/${visit.id}`, body);
    },
    onSuccess: () => {
      toast.success('Visita atualizada. A alteração ficou registrada no histórico.');
      onOpenChange(false);
      void client.invalidateQueries();
    },
    onError: toastError,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      start &&
      end &&
      values.start &&
      values.end &&
      start.date === end.date &&
      values.start > values.end
    ) {
      setError('O término precisa ser depois do início.');
      return;
    }
    setError(null);
    save.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Editar visita"
        description="Esqueceu algo ou precisa corrigir? As alterações ficam no histórico da visita."
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          {closed ? (
            <Field label="Resultado" htmlFor="ve-status">
              <Select
                id="ve-status"
                value={values.status}
                onChange={(e) =>
                  setValues({ ...values, status: e.target.value as typeof values.status })
                }
              >
                <option value="COMPLETED">Concluída</option>
                <option value="NOT_COMPLETED">Não realizada</option>
              </Select>
            </Field>
          ) : null}
          {closed && values.status === 'NOT_COMPLETED' ? (
            <Field label="Motivo" htmlFor="ve-reason">
              <Input
                id="ve-reason"
                value={values.reason}
                onChange={(e) => setValues({ ...values, reason: e.target.value })}
              />
            </Field>
          ) : null}
          {start ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início" htmlFor="ve-start">
                <Input
                  id="ve-start"
                  type="time"
                  value={values.start}
                  onChange={(e) => setValues({ ...values, start: e.target.value })}
                />
              </Field>
              {closed && end ? (
                <Field label="Término" htmlFor="ve-end" error={error ?? undefined}>
                  <Input
                    id="ve-end"
                    type="time"
                    value={values.end}
                    onChange={(e) => setValues({ ...values, end: e.target.value })}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
          <Field label="Observações" htmlFor="ve-notes">
            <Textarea
              id="ve-notes"
              rows={5}
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Fotos, atividades e gastos podem ser adicionados direto na página da visita, mesmo
            depois de finalizada.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

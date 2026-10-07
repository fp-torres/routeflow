import * as React from 'react';
import { letterMetaSchema, type AuthorizationLetterDto } from '@routeflow/types';
import {
  Button,
  DatePicker,
  DialogFooter,
  Field,
  FileUploader,
  Input,
  Textarea,
} from '@routeflow/ui';
import { fieldErrors } from '@/lib/forms';

export interface LetterFormValues {
  title: string;
  issueDate: string;
  validFrom: string;
  expirationDate: string;
  notes: string;
}

export function LetterForm({
  letter,
  withFile,
  submitting,
  onSubmit,
  onCancel,
}: {
  letter?: AuthorizationLetterDto;
  withFile: boolean;
  submitting: boolean;
  onSubmit: (values: LetterFormValues, file: File | null) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = React.useState<LetterFormValues>({
    title: letter?.title ?? 'Carta de autorização',
    issueDate: letter?.issueDate ?? '',
    validFrom: letter?.validFrom ?? '',
    expirationDate: letter?.expirationDate ?? '',
    notes: letter?.notes ?? '',
  });
  const [file, setFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set =
    (key: keyof LetterFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = letterMetaSchema.safeParse({
      ...values,
      issueDate: values.issueDate || null,
      validFrom: values.validFrom || null,
      expirationDate: values.expirationDate || null,
    });
    const next = parsed.success ? {} : fieldErrors(parsed.error);
    if (withFile && !file) next.file = 'Selecione o PDF da carta.';
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(values, file);
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      {withFile ? (
        <FileUploader id="letter-file" file={file} onChange={setFile} error={errors.file} />
      ) : null}
      <Field label="Título" htmlFor="letter-title" error={errors.title}>
        <Input id="letter-title" value={values.title} onChange={set('title')} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Emissão" htmlFor="letter-issue" error={errors.issueDate}>
          <DatePicker id="letter-issue" value={values.issueDate} onChange={set('issueDate')} />
        </Field>
        <Field label="Início da vigência" htmlFor="letter-from" error={errors.validFrom}>
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
      <Field label="Observações" htmlFor="letter-notes">
        <Textarea id="letter-notes" value={values.notes} onChange={set('notes')} />
      </Field>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {withFile ? 'Enviar carta' : 'Salvar'}
        </Button>
      </DialogFooter>
    </form>
  );
}

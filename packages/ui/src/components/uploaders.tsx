import { Camera, FileText, Image as ImageIcon, Upload, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';
import { compressImage, formatBytes } from '../lib/image';
import { Button } from './button';
import { Progress } from './feedback';

interface Pending {
  id: string;
  file: File;
  preview: string;
}

export interface PhotoUploaderProps {
  /** Envia os arquivos já comprimidos; deve chamar onProgress (0..1) e rejeitar em caso de erro. */
  onUpload: (
    files: File[],
    originalSizes: number[],
    onProgress: (value: number) => void,
  ) => Promise<void>;
  maxFiles?: number;
  maxSizeMb?: number;
  disabled?: boolean;
  /** Campos extras (ex.: categoria da foto) exibidos antes do envio */
  extra?: React.ReactNode;
}

/** Câmera ou galeria, várias fotos, pré-visualização, remoção e progresso do envio. */
export function PhotoUploader({
  onUpload,
  maxFiles = 10,
  maxSizeMb = 15,
  disabled,
  extra,
}: PhotoUploaderProps) {
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<Pending[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);

  React.useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), [items]);

  const add = (list: FileList | null) => {
    setError(null);
    if (!list) return;
    const next = [...items];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" não é uma imagem.`);
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024 * 3) {
        setError(`"${file.name}" é muito grande.`);
        continue;
      }
      if (next.length >= maxFiles) {
        setError(`Envie até ${maxFiles} fotos por vez.`);
        break;
      }
      next.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setItems(next);
  };

  const remove = (id: string) => setItems((list) => list.filter((i) => i.id !== id));

  const send = async () => {
    if (!items.length) return;
    setError(null);
    setProgress(0);
    try {
      const compressed = await Promise.all(items.map((i) => compressImage(i.file)));
      await onUpload(
        compressed,
        items.map((i) => i.file.size),
        (v) => setProgress(v),
      );
      setItems([]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível enviar as fotos. Tente novamente.',
      );
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="primary"
          size="lg"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || busy}
        >
          <Camera /> Tirar foto
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => galleryRef.current?.click()}
          disabled={disabled || busy}
        >
          <ImageIcon /> Galeria
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
      {items.length > 0 ? (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Fotos selecionadas">
            {items.map((item) => (
              <li
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-md border bg-muted"
              >
                <img
                  src={item.preview}
                  alt={`Pré-visualização de ${item.file.name}`}
                  className="size-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[0.65rem] text-white">
                  {formatBytes(item.file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={busy}
                  aria-label={`Remover ${item.file.name}`}
                  className="absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {extra}
          {busy ? <Progress value={progress ?? 0} label="Progresso do envio das fotos" /> : null}
          <Button size="lg" onClick={send} loading={busy} block>
            <Upload />{' '}
            {busy
              ? `Enviando… ${Math.round((progress ?? 0) * 100)}%`
              : `Enviar ${items.length} foto${items.length === 1 ? '' : 's'}`}
          </Button>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface FileUploaderProps {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMb?: number;
  label?: string;
  error?: string;
}

/** Seleção de PDF com validação de tipo e tamanho. */
export function FileUploader({
  id,
  file,
  onChange,
  accept = 'application/pdf',
  maxSizeMb = 10,
  label = 'Selecionar PDF',
  error,
}: FileUploaderProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const pick = (f: File | undefined) => {
    setLocalError(null);
    if (!f) return;
    if (
      accept === 'application/pdf' &&
      f.type !== 'application/pdf' &&
      !f.name.toLowerCase().endsWith('.pdf')
    ) {
      setLocalError('Selecione um arquivo PDF.');
      return;
    }
    if (f.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`O arquivo tem ${formatBytes(f.size)}; o limite é ${maxSizeMb} MB.`);
      return;
    }
    onChange(f);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn(
          'flex min-h-16 w-full items-center gap-3 rounded-lg border-2 border-dashed border-input px-4 py-3 text-left hover:bg-muted',
          (error || localError) && 'border-danger',
        )}
      >
        <FileText className="size-6 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{file ? file.name : label}</span>
          <span className="block text-xs text-muted-foreground">
            {file ? formatBytes(file.size) : `PDF de até ${maxSizeMb} MB`}
          </span>
        </span>
      </button>
      <input
        ref={ref}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error || localError ? (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error ?? localError}
        </p>
      ) : null}
    </div>
  );
}

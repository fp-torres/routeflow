import { z } from 'zod';
import { isIsoDate } from '../domain/dates';

export const isoDateSchema = z
  .string({ error: 'Informe a data.' })
  .trim()
  .refine((value) => isIsoDate(value), 'Data inválida (use AAAA-MM-DD).');

export const optionalIsoDateSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  isoDateSchema.optional(),
);

export const nullableIsoDateSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  isoDateSchema.nullable().optional(),
);

/** Aceita "a,b" ou ["a","b"] (query string) e retorna array. */
export function csvArray<T extends z.ZodTypeAny>(item: T) {
  return z.preprocess((value) => {
    if (value == null || value === '') return undefined;
    if (Array.isArray(value)) return value.flatMap((v) => String(v).split(',')).filter(Boolean);
    return String(value)
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }, z.array(item).optional());
}

export const booleanQuery = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'sim', 'yes'].includes(String(value).toLowerCase());
}, z.boolean().optional());

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const dateRangeQuerySchema = z
  .object({ from: optionalIsoDateSchema, to: optionalIsoDateSchema })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: 'A data inicial deve ser anterior à final.',
    path: ['to'],
  });

export const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

export const latitudeSchema = z.coerce.number().min(-90).max(90);
export const longitudeSchema = z.coerce.number().min(-180).max(180);

export const geoCaptureSchema = z.object({
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  accuracy: z.coerce.number().min(0).max(100000).optional(),
});

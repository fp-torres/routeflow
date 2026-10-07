import { z } from 'zod';
import { AUTHORIZATION_VALIDITIES } from '../enums';
import { csvArray, nullableIsoDateSchema, optionalText } from './common';

export const letterMetaSchema = z
  .object({
    title: z.string().trim().min(2, 'Informe um título.').max(191),
    issueDate: nullableIsoDateSchema,
    validFrom: nullableIsoDateSchema,
    expirationDate: nullableIsoDateSchema,
    notes: optionalText(2000),
  })
  .refine((v) => !v.validFrom || !v.expirationDate || v.validFrom <= v.expirationDate, {
    message: 'O vencimento deve ser posterior ao início da vigência.',
    path: ['expirationDate'],
  });
export type LetterMetaInput = z.infer<typeof letterMetaSchema>;

export const letterUpdateSchema = z.object({
  title: z.string().trim().min(2).max(191).optional(),
  issueDate: nullableIsoDateSchema,
  validFrom: nullableIsoDateSchema,
  expirationDate: nullableIsoDateSchema,
  notes: optionalText(2000),
});
export type LetterUpdateInput = z.infer<typeof letterUpdateSchema>;

export const letterQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  validity: csvArray(z.enum(AUTHORIZATION_VALIDITIES)),
  search: z.string().trim().max(120).optional(),
  network: z.string().trim().max(120).optional(),
  expiringWithinDays: z.coerce.number().int().min(0).max(365).optional(),
});
export type LetterQuery = z.infer<typeof letterQuerySchema>;

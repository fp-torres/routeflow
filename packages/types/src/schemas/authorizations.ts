import { z } from 'zod';
import { AUTHORIZATION_VALIDITIES } from '../enums';
import { csvArray, isoDateSchema, nullableIsoDateSchema, optionalText } from './common';

/** Datas da ação por loja: { [storeId]: ["2026-10-08", ...] } */
export const letterStoreDatesSchema = z.record(z.string().uuid(), z.array(isoDateSchema).max(120));
export type LetterStoreDates = z.infer<typeof letterStoreDatesSchema>;

const storeIdsSchema = z.array(z.string().uuid()).max(500);

export const letterMetaSchema = z
  .object({
    title: z.string().trim().min(2, 'Informe um título.').max(191),
    issueDate: nullableIsoDateSchema,
    validFrom: nullableIsoDateSchema,
    expirationDate: nullableIsoDateSchema,
    notes: optionalText(2000),
    network: optionalText(120),
    // multipart: "id1,id2"; obrigatório no envio geral (na página da loja ela já entra)
    storeIds: csvArray(z.string().uuid()),
    // multipart: JSON texto com as datas por loja (lidas da carta)
    storeDates: z.string().max(200_000).optional(),
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
  network: optionalText(120),
  storeIds: storeIdsSchema.min(1, 'Selecione ao menos uma loja.').optional(),
  storeDates: letterStoreDatesSchema.optional(),
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

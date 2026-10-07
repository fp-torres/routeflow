import { z } from 'zod';
import {
  booleanQuery,
  latitudeSchema,
  longitudeSchema,
  optionalText,
  paginationQuerySchema,
} from './common';

export const storeBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .max(40, 'Código muito longo.')
    .transform((v) => v.toUpperCase().replace(/\s+/g, ''))
    .optional()
    .or(z.literal('').transform(() => undefined)),
  name: z.string().trim().min(2, 'Informe o nome da loja.').max(191),
  network: z.string().trim().min(2, 'Informe a rede.').max(120),
  address: z.string().trim().min(5, 'Informe o endereço.').max(500),
  neighborhood: optionalText(120),
  city: z.string().trim().min(2).max(120).default('Rio de Janeiro'),
  state: z
    .string()
    .trim()
    .length(2, 'Use a sigla do estado (ex.: RJ).')
    .transform((v) => v.toUpperCase())
    .default('RJ'),
  zipCode: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z
      .string()
      .trim()
      .regex(/^\d{5}-?\d{3}$/, 'CEP inválido (ex.: 20251-060).')
      .nullable()
      .optional(),
  ),
  region: optionalText(80),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional(),
  observations: optionalText(5000),
  // null = segue a regra da rede; true/false = exceção desta loja
  authorizationRequired: z.boolean().nullable().optional(),
  active: z.boolean().default(true),
});

export const storeCreateSchema = storeBaseSchema;
export type StoreCreateInput = z.input<typeof storeCreateSchema>;

export const storeUpdateSchema = storeBaseSchema.partial();
export type StoreUpdateInput = z.input<typeof storeUpdateSchema>;

export const storeQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  network: z.string().trim().max(120).optional(),
  region: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  active: booleanQuery,
  withoutCoordinates: booleanQuery,
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type StoreQuery = z.infer<typeof storeQuerySchema>;

export const quickAddCommitSchema = z.object({
  rows: z
    .array(
      z.object({
        code: z.string().trim().max(40).nullable().optional(),
        name: z.string().trim().min(2).max(191),
        network: z.string().trim().min(2).max(120),
        address: z.string().trim().min(5).max(500),
        neighborhood: optionalText(120),
        region: optionalText(80),
      }),
    )
    .min(1, 'Adicione pelo menos uma loja.')
    .max(200, 'Máximo de 200 lojas por vez.'),
});
export type QuickAddCommitInput = z.infer<typeof quickAddCommitSchema>;

import { z } from 'zod';
import { TRANSPORT_TYPES } from '../enums';
import {
  csvArray,
  isoDateSchema,
  optionalIsoDateSchema,
  optionalText,
  paginationQuerySchema,
} from './common';

const money = z.preprocess(
  (v) =>
    v === '' || v === null || v === undefined
      ? null
      : typeof v === 'string'
        ? Number(v.replace(',', '.'))
        : v,
  z
    .number({ error: 'Valor inválido.' })
    .min(0, 'O valor não pode ser negativo.')
    .max(100000)
    .nullable(),
);

export const expenseCreateSchema = z
  .object({
    date: isoDateSchema,
    type: z.enum(TRANSPORT_TYPES),
    description: optionalText(500),
    estimatedValue: money.optional(),
    actualValue: money.optional(),
    routeId: z.string().uuid().nullable().optional(),
    visitId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.actualValue != null || v.estimatedValue != null, {
    message: 'Informe o valor pago (ou o valor estimado).',
    path: ['actualValue'],
  });
export type ExpenseCreateInput = z.input<typeof expenseCreateSchema>;

export const expenseUpdateSchema = z.object({
  date: isoDateSchema.optional(),
  type: z.enum(TRANSPORT_TYPES).optional(),
  description: optionalText(500),
  estimatedValue: money.optional(),
  actualValue: money.optional(),
});
export type ExpenseUpdateInput = z.input<typeof expenseUpdateSchema>;

export const expenseQuerySchema = paginationQuerySchema.extend({
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  type: csvArray(z.enum(TRANSPORT_TYPES)),
  routeId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;

export const fareSchema = z.object({
  type: z.enum(TRANSPORT_TYPES),
  operator: z.string().trim().min(2, 'Informe a operadora.').max(120),
  description: optionalText(255),
  value: z.coerce.number().min(0).max(1000),
  effectiveFrom: isoDateSchema,
  effectiveUntil: optionalIsoDateSchema.nullable(),
  active: z.boolean().default(true),
  verified: z.boolean().default(true),
});
export type FareInput = z.input<typeof fareSchema>;

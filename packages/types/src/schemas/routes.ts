import { z } from 'zod';
import { ROUTE_STATUSES, ROUTE_TEMPLATE_KINDS } from '../enums';
import {
  isoDateSchema,
  nullableIsoDateSchema,
  optionalIsoDateSchema,
  optionalText,
} from './common';

export const routeQuerySchema = z.object({
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  employeeId: z.string().uuid().optional(),
});
export type RouteQuery = z.infer<typeof routeQuerySchema>;

export const routeCreateSchema = z.object({
  // ADMIN/MANAGER: rota de outro funcionário
  employeeId: z.string().uuid().optional(),
  date: isoDateSchema,
  storeIds: z.array(z.string().uuid()).max(40).default([]),
  fromTemplate: z.boolean().default(false),
});
export type RouteCreateInput = z.infer<typeof routeCreateSchema>;

export const routeUpdateSchema = z.object({
  startAddress: z.string().trim().min(5).max(500).optional(),
  status: z.enum(ROUTE_STATUSES).optional(),
  notes: optionalText(5000),
  actualTransportCost: z.coerce.number().min(0).max(100000).nullable().optional(),
});
export type RouteUpdateInput = z.infer<typeof routeUpdateSchema>;

export const routeAddStopSchema = z.object({
  storeId: z.string().uuid('Selecione a loja.'),
  position: z.coerce.number().int().min(1).optional(),
});
export type RouteAddStopInput = z.infer<typeof routeAddStopSchema>;

export const routeReorderSchema = z.object({
  stopIds: z.array(z.string().uuid()).min(1),
});
export type RouteReorderInput = z.infer<typeof routeReorderSchema>;

export const routeOptimizeSchema = z.object({
  apply: z.boolean().default(false),
});
export type RouteOptimizeInput = z.infer<typeof routeOptimizeSchema>;

export const routeGenerateSchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    from: isoDateSchema,
    to: isoDateSchema,
    overwrite: z.boolean().default(false),
  })
  .refine((v) => v.from <= v.to, { message: 'Período inválido.', path: ['to'] });
export type RouteGenerateInput = z.infer<typeof routeGenerateSchema>;

export const templateCreateSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome ao roteiro.').max(120),
  kind: z.enum(ROUTE_TEMPLATE_KINDS).default('STANDARD'),
  cycleWeeks: z.coerce.number().int().min(1).max(8).default(1),
  anchorDate: nullableIsoDateSchema,
  validFrom: nullableIsoDateSchema,
  validUntil: nullableIsoDateSchema,
  active: z.boolean().default(true),
  notes: optionalText(2000),
});
export type TemplateCreateInput = z.input<typeof templateCreateSchema>;

export const templateUpdateSchema = templateCreateSchema.partial();
export type TemplateUpdateInput = z.input<typeof templateUpdateSchema>;

export const templateDaySchema = z.object({
  weekday: z.coerce.number().int().min(1).max(7),
  weekIndex: z.coerce.number().int().min(0).max(8).default(0),
  storeIds: z.array(z.string().uuid()).max(40),
});
export type TemplateDayInput = z.infer<typeof templateDaySchema>;

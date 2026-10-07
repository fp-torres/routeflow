import { z } from 'zod';
import { PHOTO_CATEGORIES, VISIT_STATUSES } from '../enums';
import {
  csvArray,
  geoCaptureSchema,
  isoDateSchema,
  optionalIsoDateSchema,
  optionalText,
  paginationQuerySchema,
} from './common';

export const visitQuerySchema = paginationQuerySchema.extend({
  date: optionalIsoDateSchema,
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  status: csvArray(z.enum(VISIT_STATUSES)),
  storeId: z.string().uuid().optional(),
  network: z.string().trim().max(120).optional(),
  region: z.string().trim().max(80).optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().trim().max(120).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type VisitQuery = z.infer<typeof visitQuerySchema>;

export const visitCreateSchema = z.object({
  storeId: z.string().uuid('Selecione a loja.'),
  scheduledDate: isoDateSchema,
  notes: optionalText(5000),
});
export type VisitCreateInput = z.infer<typeof visitCreateSchema>;

export const visitUpdateSchema = z.object({
  notes: optionalText(5000),
  status: z.enum(VISIT_STATUSES).optional(),
  statusReason: optionalText(500),
});
export type VisitUpdateInput = z.infer<typeof visitUpdateSchema>;

export const visitStartSchema = geoCaptureSchema;
export type VisitStartInput = z.infer<typeof visitStartSchema>;

export const visitFinishSchema = geoCaptureSchema.extend({
  status: z.enum(['COMPLETED', 'NOT_COMPLETED']).default('COMPLETED'),
  notes: optionalText(5000),
  reason: optionalText(500),
});
export type VisitFinishInput = z.infer<typeof visitFinishSchema>;

export const visitActivitySchema = z.object({
  type: z.enum(['NOTE', 'ACTIVITY']),
  description: z.string().trim().min(2, 'Descreva a atividade.').max(2000),
});
export type VisitActivityInput = z.infer<typeof visitActivitySchema>;

export const visitRescheduleSchema = z.object({
  date: isoDateSchema,
  reason: optionalText(500),
});
export type VisitRescheduleInput = z.infer<typeof visitRescheduleSchema>;

export const photoUploadMetaSchema = z.object({
  category: z.enum(PHOTO_CATEGORIES).default('OTHER'),
  caption: optionalText(500),
  /** Tamanhos originais (bytes) antes da compressão no navegador, separados por vírgula. */
  originalSizes: z.string().max(2000).optional(),
});
export type PhotoUploadMeta = z.infer<typeof photoUploadMetaSchema>;

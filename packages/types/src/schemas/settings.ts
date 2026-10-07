import { z } from 'zod';
import { SHARED_SCOPES, VISIT_STATUSES } from '../enums';
import {
  csvArray,
  latitudeSchema,
  longitudeSchema,
  optionalIsoDateSchema,
  optionalText,
} from './common';

export const homeAddressSchema = z.object({
  address: z.string().trim().min(8, 'Informe o endereço completo.').max(500),
  label: optionalText(80),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional(),
});
export type HomeAddressInput = z.infer<typeof homeAddressSchema>;

/** Configurações da operação editáveis pela interface. */
export const companySettingsSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  authorizationWarningDays: z.coerce.number().int().min(1).max(365),
  authorizationCriticalDays: z.coerce.number().int().min(0).max(60),
  blockVisitWithoutAuthorization: z.boolean(),
  autoGenerateRoutes: z.boolean(),
  routeGenerationHorizonDays: z.coerce.number().int().min(0).max(120),
  fullRouteTravelMode: z.enum(['driving', 'walking']),
  networks: z.array(z.string().trim().min(1).max(120)).max(50),
  regions: z.array(z.string().trim().min(1).max(80)).max(50),
  activityPresets: z.array(z.string().trim().min(1).max(120)).max(30),
  networkCodeRules: z
    .array(
      z.object({
        pattern: z.string().trim().min(1).max(60),
        network: z.string().trim().min(1).max(120),
      }),
    )
    .max(20),
  defaultNetworkForNamedStores: z.string().trim().min(1).max(120),
});
export type CompanySettings = z.infer<typeof companySettingsSchema>;
export const companySettingsUpdateSchema = companySettingsSchema.partial();
export type CompanySettingsUpdate = z.infer<typeof companySettingsUpdateSchema>;

export const sharedAccessCreateSchema = z.object({
  label: z.string().trim().min(2, 'Dê um nome ao link (ex.: Gestor comercial).').max(120),
  expiresAt: optionalIsoDateSchema,
  scope: z.array(z.enum(SHARED_SCOPES)).min(1, 'Selecione o que o link pode exibir.'),
});
export type SharedAccessCreateInput = z.infer<typeof sharedAccessCreateSchema>;

export const reportQuerySchema = z.object({
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  employeeId: z.string().uuid().optional(),
  network: z.string().trim().max(120).optional(),
  storeId: z.string().uuid().optional(),
  region: z.string().trim().max(80).optional(),
  status: csvArray(z.enum(VISIT_STATUSES)),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const auditQuerySchema = z.object({
  entity: z.string().trim().max(60).optional(),
  action: z.string().trim().max(60).optional(),
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

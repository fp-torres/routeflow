import { DEFAULT_NETWORK_RULES, type CompanySettings } from '@routeflow/types';

/** Valores padrão das configurações da operação (gravados pelo seed). */
export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'RouteFlow',
  authorizationWarningDays: 30,
  authorizationCriticalDays: 7,
  blockVisitWithoutAuthorization: false,
  autoGenerateRoutes: true,
  routeGenerationHorizonDays: 14,
  fullRouteTravelMode: 'driving',
  networks: ['Drogaria Venancio', 'Cristal'],
  regions: ['Zona Norte', 'Zona Sul', 'Centro / Zona Sul', 'Centro', 'Oeste'],
  activityPresets: [
    'Reposição de produtos',
    'Organização de gôndola',
    'Conferência de preços',
    'Instalação de material de PDV',
    'Conversa com o gerente da loja',
    'Registro de ruptura',
  ],
  networkCodeRules: DEFAULT_NETWORK_RULES.codeRules,
  defaultNetworkForNamedStores: DEFAULT_NETWORK_RULES.defaultNetworkForNamedStores,
};

/**
 * Tarifas de REFERÊNCIA (a planilha não traz valores de transporte).
 * Gravadas como "não confirmadas" (verified = false): a interface pede revisão
 * em Configurações > Tarifas antes de considerar as estimativas de custo.
 */
export const REFERENCE_FARES = [
  { type: 'BUS', operator: 'Ônibus municipal — Rio de Janeiro', value: 4.7 },
  { type: 'METRO', operator: 'MetrôRio', value: 7.9 },
  { type: 'TRAIN', operator: 'SuperVia', value: 7.6 },
] as const;

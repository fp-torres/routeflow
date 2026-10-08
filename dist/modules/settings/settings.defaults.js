"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFERENCE_FARES = exports.DEFAULT_SETTINGS = void 0;
const types_1 = require("@routeflow/types");
/** Valores padrão das configurações da operação (gravados pelo seed). */
exports.DEFAULT_SETTINGS = {
    companyName: 'RouteFlow',
    authorizationWarningDays: 30,
    authorizationCriticalDays: 7,
    blockVisitWithoutAuthorization: false,
    // Cristal não exige carta no momento; basta incluir a rede aqui (ou marcar a loja) se passar a exigir
    authorizationRequiredNetworks: ['Drogaria Venancio'],
    autoGenerateRoutes: true,
    routeGenerationHorizonDays: 14,
    fullRouteTravelMode: 'walking',
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
    networkCodeRules: types_1.DEFAULT_NETWORK_RULES.codeRules,
    defaultNetworkForNamedStores: types_1.DEFAULT_NETWORK_RULES.defaultNetworkForNamedStores,
};
/**
 * Tarifas de REFERÊNCIA (a planilha não traz valores de transporte).
 * Gravadas como "não confirmadas" (verified = false): a interface pede revisão
 * em Configurações > Tarifas antes de considerar as estimativas de custo.
 */
exports.REFERENCE_FARES = [
    { type: 'BUS', operator: 'Ônibus municipal — Rio de Janeiro', value: 4.7 },
    { type: 'METRO', operator: 'MetrôRio', value: 7.9 },
    { type: 'TRAIN', operator: 'SuperVia', value: 7.6 },
];
//# sourceMappingURL=settings.defaults.js.map
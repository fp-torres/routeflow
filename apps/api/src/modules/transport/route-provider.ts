import type { TransportMode } from '@routeflow/types';

export interface LegPoint {
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface LegResult {
  mode: TransportMode | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  cost: number | null;
  summary: string | null;
  source: 'google' | 'estimate' | 'unavailable';
}

/**
 * Contrato para provedores de rota/transporte público. Implementações:
 *  - EstimateRouteProvider: sem API externa (distância em linha reta + tarifas cadastradas);
 *  - GoogleRoutesProvider: Google Routes API em modo TRANSIT (ônibus, metrô, trem, caminhada).
 * Novos provedores (ex.: Moovit, OpenTripPlanner) implementam a mesma interface.
 */
export interface RouteProvider {
  readonly name: string;
  isConfigured(): boolean;
  computeLeg(from: LegPoint, to: LegPoint, date: string): Promise<LegResult>;
}

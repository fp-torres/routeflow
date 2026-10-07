import type { TransitStepDto, TransportMode } from '@routeflow/types';

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
  /** Etapas do itinerário: caminhada, ônibus, metrô, trem, VLT... */
  steps: TransitStepDto[] | null;
  source: 'google' | 'estimate' | 'unavailable';
}

/** Tempos de deslocamento (transporte público) entre todos os pontos: base da otimização. */
export interface TravelMatrix {
  seconds: number[][];
  meters: Array<Array<number | null>>;
  source: 'google' | 'estimate';
}

/**
 * Contrato dos provedores de rota. Implementações:
 *  - EstimateRouteProvider: modelo local de transporte público (sem API externa);
 *  - GoogleRoutesProvider: Google Routes API em modo TRANSIT (ônibus, metrô, trem, VLT e caminhada).
 * Outros provedores (ex.: OpenTripPlanner com GTFS do Rio) implementam a mesma interface.
 */
export interface RouteProvider {
  readonly name: string;
  isConfigured(): boolean;
  computeLeg(from: LegPoint, to: LegPoint, date: string): Promise<LegResult>;
  computeMatrix(points: LegPoint[], date: string): Promise<TravelMatrix>;
}

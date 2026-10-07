import { Logger } from '@nestjs/common';
import {
  estimateLeg,
  hasCoordinates,
  TRANSPORT_MODE_LABEL,
  type TransportMode,
  type TransportType,
} from '@routeflow/types';
import type { FaresService } from './fares.service';
import type { LegPoint, LegResult, RouteProvider } from './route-provider';

/** Estimativa local: honesta e sem custo, rotulada como "estimativa" em toda a interface. */
export class EstimateRouteProvider implements RouteProvider {
  readonly name = 'estimate';
  constructor(private readonly fares: FaresService) {}

  isConfigured(): boolean {
    return true;
  }

  async computeLeg(from: LegPoint, to: LegPoint, date: string): Promise<LegResult> {
    if (!hasCoordinates(from) || !hasCoordinates(to)) {
      return {
        mode: null,
        distanceMeters: null,
        durationSeconds: null,
        cost: null,
        summary: 'Sem coordenadas: atualize as coordenadas das lojas/casa para estimar o trecho.',
        source: 'unavailable',
      };
    }
    const leg = estimateLeg(from, to);
    if (leg.mode === 'WALKING') {
      return {
        mode: 'WALKING',
        distanceMeters: leg.distanceMeters,
        durationSeconds: leg.durationSeconds,
        cost: 0,
        summary: 'Caminhada (estimativa)',
        source: 'estimate',
      };
    }
    const fare = await this.fares.activeFare('BUS', date);
    return {
      mode: 'BUS',
      distanceMeters: leg.distanceMeters,
      durationSeconds: leg.durationSeconds,
      cost: fare ? fare.value : null,
      summary: fare
        ? 'Caminhada + ônibus (estimativa)'
        : 'Caminhada + ônibus (estimativa — cadastre a tarifa de ônibus)',
      source: 'estimate',
    };
  }
}

interface GoogleStep {
  travelMode?: string;
  transitDetails?: {
    transitLine?: { nameShort?: string; name?: string; vehicle?: { type?: string } };
  };
}

interface GoogleRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    travelAdvisory?: { transitFare?: { currencyCode?: string; units?: string; nanos?: number } };
    legs?: Array<{ steps?: GoogleStep[] }>;
  }>;
}

function vehicleToType(vehicle: string | undefined): TransportType {
  if (!vehicle) return 'BUS';
  if (['SUBWAY', 'METRO_RAIL'].includes(vehicle)) return 'METRO';
  if (
    ['HEAVY_RAIL', 'COMMUTER_TRAIN', 'RAIL', 'HIGH_SPEED_TRAIN', 'LONG_DISTANCE_TRAIN'].includes(
      vehicle,
    )
  )
    return 'TRAIN';
  return 'BUS';
}

const TYPE_TO_MODE: Record<TransportType, TransportMode> = {
  BUS: 'BUS',
  METRO: 'METRO',
  TRAIN: 'TRAIN',
  INTEGRATION: 'TRANSIT',
  TAXI: 'TAXI',
  RIDE_APP: 'RIDE_APP',
  OTHER: 'OTHER',
};

/**
 * Google Routes API (transporte público real). Requer GOOGLE_MAPS_API_KEY com a
 * "Routes API" habilitada. Em caso de falha, recorre à estimativa e informa isso.
 */
export class GoogleRoutesProvider implements RouteProvider {
  readonly name = 'google';
  private readonly logger = new Logger('GoogleRoutes');

  constructor(
    private readonly apiKey: string | null,
    private readonly fares: FaresService,
    private readonly fallback: EstimateRouteProvider,
  ) {}

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private waypoint(point: LegPoint) {
    return hasCoordinates(point)
      ? { location: { latLng: { latitude: point.latitude, longitude: point.longitude } } }
      : { address: point.address };
  }

  async computeLeg(from: LegPoint, to: LegPoint, date: string): Promise<LegResult> {
    if (!this.apiKey) return this.fallback.computeLeg(from, to, date);
    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        signal: AbortSignal.timeout(12_000),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.duration,routes.travelAdvisory.transitFare,routes.legs.steps.travelMode,routes.legs.steps.transitDetails.transitLine.nameShort,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.vehicle.type',
        },
        body: JSON.stringify({
          origin: this.waypoint(from),
          destination: this.waypoint(to),
          travelMode: 'TRANSIT',
          languageCode: 'pt-BR',
          units: 'METRIC',
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as GoogleRoutesResponse;
      const route = body.routes?.[0];
      if (!route) throw new Error('nenhuma rota encontrada');
      const steps = route.legs?.flatMap((leg) => leg.steps ?? []) ?? [];
      const parts: string[] = [];
      const types: TransportType[] = [];
      for (const step of steps) {
        if (step.travelMode === 'TRANSIT') {
          const type = vehicleToType(step.transitDetails?.transitLine?.vehicle?.type);
          types.push(type);
          const line =
            step.transitDetails?.transitLine?.nameShort ||
            step.transitDetails?.transitLine?.name ||
            '';
          parts.push(`${TRANSPORT_MODE_LABEL[TYPE_TO_MODE[type]]}${line ? ` ${line}` : ''}`);
        } else if (parts[parts.length - 1] !== 'Caminhada') {
          parts.push('Caminhada');
        }
      }
      const fare = route.travelAdvisory?.transitFare;
      let cost: number | null = fare ? Number(fare.units ?? 0) + (fare.nanos ?? 0) / 1e9 : null;
      if (cost == null && types.length) {
        const values = await Promise.all(types.map((type) => this.fares.activeFare(type, date)));
        cost = values.every(Boolean) ? values.reduce((acc, f) => acc + (f?.value ?? 0), 0) : null;
      }
      const distinct = [...new Set(types)];
      const mode: TransportMode =
        distinct.length === 0
          ? 'WALKING'
          : distinct.length === 1
            ? TYPE_TO_MODE[distinct[0]!]
            : 'TRANSIT';
      return {
        mode,
        distanceMeters: route.distanceMeters ?? null,
        durationSeconds: route.duration ? Number(route.duration.replace('s', '')) : null,
        cost: cost == null ? (distinct.length === 0 ? 0 : null) : Math.round(cost * 100) / 100,
        summary: parts.join(' + ') || 'Caminhada',
        source: 'google',
      };
    } catch (error) {
      this.logger.warn(`Google Routes indisponível (${String(error)}); usando estimativa.`);
      const estimate = await this.fallback.computeLeg(from, to, date);
      return {
        ...estimate,
        summary: estimate.summary ? `${estimate.summary} — Google indisponível` : null,
      };
    }
  }
}

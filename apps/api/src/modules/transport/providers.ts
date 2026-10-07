import { Logger } from '@nestjs/common';
import {
  hasCoordinates,
  haversineKm,
  TRANSIT_STEP_LABEL,
  todayIso,
  type TransitStepDto,
  type TransitStepMode,
  type TransportMode,
  type TransportType,
} from '@routeflow/types';
import type { FaresService } from './fares.service';
import type { LegPoint, LegResult, RouteProvider, TravelMatrix } from './route-provider';

/**
 * Modelo local de transporte público (sem API externa). Trechos curtos são feitos a pé;
 * nos demais soma-se caminhada até o ponto, espera, viagem (velocidade média urbana com
 * paradas) e caminhada até a loja. Os valores são rotulados como estimativa na interface.
 */
const WALK_KMH = 4.8;
const WALK_FACTOR = 1.3; // ruas não são linha reta
const RIDE_FACTOR = 1.35;
const RIDE_KMH = 17; // média de ônibus/metrô no Rio considerando paradas
const ACCESS_S = 6 * 60;
const WAIT_S = 7 * 60;
const EGRESS_S = 5 * 60;
const ALWAYS_WALK_KM = 1.2;

export interface TransitEstimate {
  walkOnly: boolean;
  seconds: number;
  meters: number;
  rideSeconds: number;
}

export function estimateTransit(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): TransitEstimate {
  const km = haversineKm(from, to);
  const walkKm = km * WALK_FACTOR;
  const walkSeconds = (walkKm / WALK_KMH) * 3600;
  const rideSeconds = ((km * RIDE_FACTOR) / RIDE_KMH) * 3600;
  const transitSeconds = ACCESS_S + WAIT_S + rideSeconds + EGRESS_S;
  if (walkKm <= ALWAYS_WALK_KM || walkSeconds <= transitSeconds) {
    return {
      walkOnly: true,
      seconds: Math.round(walkSeconds),
      meters: Math.round(walkKm * 1000),
      rideSeconds: 0,
    };
  }
  return {
    walkOnly: false,
    seconds: Math.round(transitSeconds),
    meters: Math.round(km * RIDE_FACTOR * 1000 + 700),
    rideSeconds: Math.round(rideSeconds),
  };
}

const walkStep = (seconds: number | null, meters: number | null): TransitStepDto => ({
  mode: 'WALK',
  line: null,
  headsign: null,
  from: null,
  to: null,
  durationSeconds: seconds,
  distanceMeters: meters,
  stopCount: null,
});

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
        summary: null,
        steps: null,
        source: 'unavailable',
      };
    }
    const est = estimateTransit(from, to);
    if (est.walkOnly) {
      return {
        mode: 'WALKING',
        distanceMeters: est.meters,
        durationSeconds: est.seconds,
        cost: 0,
        summary: 'A pé (estimativa)',
        steps: [walkStep(est.seconds, est.meters)],
        source: 'estimate',
      };
    }
    const fare = await this.fares.activeFare('BUS', date);
    return {
      mode: 'TRANSIT',
      distanceMeters: est.meters,
      durationSeconds: est.seconds,
      cost: fare ? fare.value : null,
      summary: 'Transporte público (estimativa)',
      steps: [
        walkStep(ACCESS_S, 400),
        { ...walkStep(WAIT_S + est.rideSeconds, est.meters - 700), mode: 'BUS' },
        walkStep(EGRESS_S, 300),
      ],
      source: 'estimate',
    };
  }

  async computeMatrix(points: LegPoint[]): Promise<TravelMatrix> {
    const n = points.length;
    const seconds = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const meters = Array.from({ length: n }, () => new Array<number | null>(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const a = points[i]!;
        const b = points[j]!;
        if (!hasCoordinates(a) || !hasCoordinates(b)) {
          seconds[i]![j] = 6 * 3600;
          meters[i]![j] = null;
          continue;
        }
        const est = estimateTransit(a, b);
        seconds[i]![j] = est.seconds;
        meters[i]![j] = est.meters;
      }
    }
    return { seconds, meters, source: 'estimate' };
  }
}

interface GoogleStep {
  travelMode?: string;
  distanceMeters?: number;
  staticDuration?: string;
  transitDetails?: {
    headsign?: string;
    stopCount?: number;
    stopDetails?: { departureStop?: { name?: string }; arrivalStop?: { name?: string } };
    transitLine?: { nameShort?: string; name?: string; vehicle?: { type?: string } };
  };
}

interface GoogleRoute {
  distanceMeters?: number;
  duration?: string;
  travelAdvisory?: { transitFare?: { currencyCode?: string; units?: string; nanos?: number } };
  legs?: Array<{ steps?: GoogleStep[] }>;
}

interface GoogleMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string;
  distanceMeters?: number;
  condition?: string;
}

const secondsOf = (value: string | undefined) =>
  value ? Math.round(Number(value.replace(/s$/, ''))) : null;

export function vehicleToStepMode(vehicle: string | undefined): TransitStepMode {
  switch (vehicle) {
    case 'SUBWAY':
    case 'METRO_RAIL':
      return 'METRO';
    case 'HEAVY_RAIL':
    case 'COMMUTER_TRAIN':
    case 'RAIL':
    case 'HIGH_SPEED_TRAIN':
    case 'LONG_DISTANCE_TRAIN':
      return 'TRAIN';
    case 'TRAM':
    case 'LIGHT_RAIL':
    case 'MONORAIL':
      return 'TRAM';
    case 'FERRY':
      return 'FERRY';
    case 'CABLE_CAR':
    case 'GONDOLA_LIFT':
    case 'FUNICULAR':
      return 'OTHER';
    default:
      return 'BUS';
  }
}

/** Converte as etapas da Google Routes API, juntando as caminhadas consecutivas. */
export function compactGoogleSteps(steps: GoogleStep[]): TransitStepDto[] {
  const out: TransitStepDto[] = [];
  for (const step of steps) {
    const duration = secondsOf(step.staticDuration);
    if (step.travelMode === 'TRANSIT' && step.transitDetails) {
      const t = step.transitDetails;
      out.push({
        mode: vehicleToStepMode(t.transitLine?.vehicle?.type),
        line: t.transitLine?.nameShort || t.transitLine?.name || null,
        headsign: t.headsign ?? null,
        from: t.stopDetails?.departureStop?.name ?? null,
        to: t.stopDetails?.arrivalStop?.name ?? null,
        durationSeconds: duration,
        distanceMeters: step.distanceMeters ?? null,
        stopCount: t.stopCount ?? null,
      });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.mode === 'WALK') {
      last.durationSeconds = (last.durationSeconds ?? 0) + (duration ?? 0);
      last.distanceMeters = (last.distanceMeters ?? 0) + (step.distanceMeters ?? 0);
    } else {
      out.push(walkStep(duration, step.distanceMeters ?? null));
    }
  }
  return out;
}

const STEP_TO_FARE: Record<TransitStepMode, TransportType> = {
  WALK: 'OTHER',
  BUS: 'BUS',
  METRO: 'METRO',
  TRAIN: 'TRAIN',
  TRAM: 'BUS',
  FERRY: 'OTHER',
  OTHER: 'OTHER',
};

const STEP_TO_MODE: Partial<Record<TransitStepMode, TransportMode>> = {
  BUS: 'BUS',
  METRO: 'METRO',
  TRAIN: 'TRAIN',
};

/**
 * Google Routes API (transporte público real: linhas, estações, tempos e tarifa quando
 * disponível). Requer GOOGLE_MAPS_API_KEY com a "Routes API" habilitada e ROUTE_PROVIDER=google.
 * Em qualquer falha, recorre ao modelo local e informa isso.
 */
export class GoogleRoutesProvider implements RouteProvider {
  readonly name = 'google';
  private readonly logger = new Logger('GoogleRoutes');

  constructor(
    private readonly apiKey: string | null,
    private readonly fares: FaresService,
    private readonly fallback: EstimateRouteProvider,
    private readonly timeZone: string,
  ) {}

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private waypoint(point: LegPoint) {
    return hasCoordinates(point)
      ? { location: { latLng: { latitude: point.latitude, longitude: point.longitude } } }
      : { address: point.address };
  }

  /** Datas futuras: saída às 8h (horário de Brasília); hoje/passado: agora. */
  private departureTime(date: string): string | undefined {
    if (date <= todayIso(this.timeZone)) return undefined;
    return new Date(`${date}T08:00:00-03:00`).toISOString();
  }

  async computeLeg(from: LegPoint, to: LegPoint, date: string): Promise<LegResult> {
    if (!this.apiKey) return this.fallback.computeLeg(from, to, date);
    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': [
            'routes.distanceMeters',
            'routes.duration',
            'routes.travelAdvisory.transitFare',
            'routes.legs.steps.travelMode',
            'routes.legs.steps.distanceMeters',
            'routes.legs.steps.staticDuration',
            'routes.legs.steps.transitDetails',
          ].join(','),
        },
        body: JSON.stringify({
          origin: this.waypoint(from),
          destination: this.waypoint(to),
          travelMode: 'TRANSIT',
          departureTime: this.departureTime(date),
          languageCode: 'pt-BR',
          units: 'METRIC',
        }),
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
      const route = ((await response.json()) as { routes?: GoogleRoute[] }).routes?.[0];
      if (!route) throw new Error('nenhuma rota de transporte público encontrada');
      const steps = compactGoogleSteps(route.legs?.flatMap((leg) => leg.steps ?? []) ?? []);
      const rides = steps.filter((s) => s.mode !== 'WALK');
      const fare = route.travelAdvisory?.transitFare;
      let cost: number | null = fare ? Number(fare.units ?? 0) + (fare.nanos ?? 0) / 1e9 : null;
      if (cost == null && rides.length) {
        const values = await Promise.all(
          rides.map((s) => this.fares.activeFare(STEP_TO_FARE[s.mode], date)),
        );
        cost = values.every(Boolean) ? values.reduce((acc, f) => acc + (f?.value ?? 0), 0) : null;
      }
      const distinct = [...new Set(rides.map((s) => s.mode))];
      const mode: TransportMode =
        distinct.length === 0
          ? 'WALKING'
          : distinct.length === 1
            ? (STEP_TO_MODE[distinct[0]!] ?? 'TRANSIT')
            : 'TRANSIT';
      const summary = rides.length
        ? rides.map((s) => `${TRANSIT_STEP_LABEL[s.mode]}${s.line ? ` ${s.line}` : ''}`).join(' → ')
        : 'A pé';
      return {
        mode,
        distanceMeters: route.distanceMeters ?? null,
        durationSeconds: secondsOf(route.duration),
        cost: cost == null ? (rides.length === 0 ? 0 : null) : Math.round(cost * 100) / 100,
        summary,
        steps,
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

  /** Matriz de tempos em transporte público (Route Matrix API, até 100 elementos por chamada). */
  async computeMatrix(points: LegPoint[], date: string): Promise<TravelMatrix> {
    const base = await this.fallback.computeMatrix(points);
    if (!this.apiKey || points.length < 2) return base;
    const n = points.length;
    const perRequest = Math.max(1, Math.floor(100 / n));
    try {
      for (let start = 0; start < n; start += perRequest) {
        const origins = Array.from(
          { length: Math.min(perRequest, n - start) },
          (_, k) => start + k,
        );
        const response = await fetch(
          'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
          {
            method: 'POST',
            signal: AbortSignal.timeout(20_000),
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey,
              'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition',
            },
            body: JSON.stringify({
              origins: origins.map((i) => ({ waypoint: this.waypoint(points[i]!) })),
              destinations: points.map((p) => ({ waypoint: this.waypoint(p) })),
              travelMode: 'TRANSIT',
              departureTime: this.departureTime(date),
            }),
          },
        );
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
        const elements = (await response.json()) as GoogleMatrixElement[];
        for (const el of elements) {
          if (el.condition !== 'ROUTE_EXISTS') continue;
          const i = origins[el.originIndex ?? 0]!;
          const j = el.destinationIndex ?? 0;
          if (i === j) continue;
          const s = secondsOf(el.duration);
          if (s != null) base.seconds[i]![j] = s;
          base.meters[i]![j] = el.distanceMeters ?? base.meters[i]![j]!;
        }
      }
      return { ...base, source: 'google' };
    } catch (error) {
      this.logger.warn(`Route Matrix indisponível (${String(error)}); usando estimativa.`);
      return base;
    }
  }
}

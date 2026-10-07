export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function hasCoordinates<T extends { latitude?: number | null; longitude?: number | null }>(
  value: T | null | undefined,
): value is T & GeoPoint {
  return value != null && typeof value.latitude === 'number' && typeof value.longitude === 'number';
}

/** Parâmetros da estimativa local de deslocamento (sem API externa). */
export interface EstimateParams {
  /** Fator de desvio urbano aplicado à distância em linha reta. */
  detourFactor: number;
  /** Até esta distância (km, em linha reta) o trecho é feito a pé. */
  walkingThresholdKm: number;
  walkingSpeedKmh: number;
  transitSpeedKmh: number;
  /** Minutos de espera/acesso ao transporte público. */
  transitOverheadMinutes: number;
}

export const DEFAULT_ESTIMATE_PARAMS: EstimateParams = {
  detourFactor: 1.35,
  walkingThresholdKm: 1.1,
  walkingSpeedKmh: 4.5,
  transitSpeedKmh: 16,
  transitOverheadMinutes: 8,
};

export interface EstimatedLeg {
  mode: 'WALKING' | 'BUS';
  distanceMeters: number;
  durationSeconds: number;
}

export function estimateLeg(
  from: GeoPoint,
  to: GeoPoint,
  params: EstimateParams = DEFAULT_ESTIMATE_PARAMS,
): EstimatedLeg {
  const straightKm = haversineKm(from, to);
  const routeKm = straightKm * params.detourFactor;
  if (straightKm <= params.walkingThresholdKm) {
    return {
      mode: 'WALKING',
      distanceMeters: Math.round(routeKm * 1000),
      durationSeconds: Math.round((routeKm / params.walkingSpeedKmh) * 3600),
    };
  }
  return {
    mode: 'BUS',
    distanceMeters: Math.round(routeKm * 1000),
    durationSeconds: Math.round(
      (routeKm / params.transitSpeedKmh) * 3600 + params.transitOverheadMinutes * 60,
    ),
  };
}

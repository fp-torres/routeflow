/**
 * Links do Google Maps (Maps URLs API — não exige chave de API).
 * https://developers.google.com/maps/documentation/urls/get-started
 *
 * Limitações oficiais respeitadas aqui:
 *  - no máximo 9 waypoints por link (3 em navegadores móveis sem o app);
 *  - waypoints NÃO são suportados no modo transporte público (transit).
 *    Por isso a rota completa usa "driving"/"walking" e cada trecho tem
 *    o seu próprio link em transporte público.
 */
export type MapsTravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export const MAX_WAYPOINTS_PER_LINK = 9;

const BASE = 'https://www.google.com/maps';

export function googleMapsSearchUrl(query: string): string {
  return `${BASE}/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsCoordinatesUrl(latitude: number, longitude: number): string {
  return `${BASE}/search/?api=1&query=${latitude},${longitude}`;
}

export interface DirectionsParams {
  origin: string;
  destination: string;
  waypoints?: string[];
  travelMode?: MapsTravelMode;
}

export function googleMapsDirectionsUrl({
  origin,
  destination,
  waypoints = [],
  travelMode = 'transit',
}: DirectionsParams): string {
  const params = new URLSearchParams({ api: '1', origin, destination, travelmode: travelMode });
  if (waypoints.length > 0 && travelMode !== 'transit')
    params.set('waypoints', waypoints.join('|'));
  return `${BASE}/dir/?${params.toString()}`;
}

export interface RoutePoint {
  label: string;
  address: string;
}

export interface FullRouteLink {
  part: number;
  totalParts: number;
  url: string;
  from: string;
  to: string;
  stops: number;
}

/**
 * Rota completa Casa -> lojas -> Casa, dividida em partes quando houver mais
 * de 9 paradas intermediárias.
 */
export function buildFullRouteLinks(
  home: RoutePoint,
  stops: RoutePoint[],
  travelMode: Exclude<MapsTravelMode, 'transit'> = 'driving',
): FullRouteLink[] {
  if (stops.length === 0) return [];
  const points = [home, ...stops, home];
  const maxSpan = MAX_WAYPOINTS_PER_LINK + 1;
  const segments: Array<[number, number]> = [];
  for (let start = 0; start < points.length - 1; start += maxSpan) {
    segments.push([start, Math.min(start + maxSpan, points.length - 1)]);
  }
  return segments.map(([start, end], index) => {
    const slice = points.slice(start, end + 1);
    return {
      part: index + 1,
      totalParts: segments.length,
      url: googleMapsDirectionsUrl({
        origin: slice[0]!.address,
        destination: slice[slice.length - 1]!.address,
        waypoints: slice.slice(1, -1).map((p) => p.address),
        travelMode,
      }),
      from: slice[0]!.label,
      to: slice[slice.length - 1]!.label,
      stops: slice.length - 2,
    };
  });
}

export interface LegLink {
  index: number;
  from: RoutePoint;
  to: RoutePoint;
  url: string;
}

/** Um link por trecho (Casa -> Loja 1, Loja 1 -> Loja 2, ..., Última -> Casa). */
export function buildLegLinks(
  home: RoutePoint,
  stops: RoutePoint[],
  travelMode: MapsTravelMode = 'transit',
): LegLink[] {
  if (stops.length === 0) return [];
  const points = [home, ...stops, home];
  return points.slice(0, -1).map((from, index) => {
    const to = points[index + 1]!;
    return {
      index,
      from,
      to,
      url: googleMapsDirectionsUrl({ origin: from.address, destination: to.address, travelMode }),
    };
  });
}

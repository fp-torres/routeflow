import { haversineKm, type GeoPoint } from './geo';

export interface OptimizablePoint extends GeoPoint {
  id: string;
}

export interface OptimizationResult {
  order: string[];
  distanceKm: number;
  originalDistanceKm: number;
  improvementKm: number;
}

/** Distância total do circuito fechado origem -> pontos (na ordem) -> origem. */
export function closedTourDistanceKm(origin: GeoPoint, points: GeoPoint[]): number {
  if (points.length === 0) return 0;
  let total = haversineKm(origin, points[0]!);
  for (let i = 1; i < points.length; i += 1) total += haversineKm(points[i - 1]!, points[i]!);
  return total + haversineKm(points[points.length - 1]!, origin);
}

/**
 * Otimização opcional da ordem das visitas (problema do caixeiro-viajante
 * com retorno à casa): vizinho mais próximo + melhoria 2-opt.
 * Determinística e rápida para o tamanho de uma rota diária.
 */
export function optimizeClosedTour(
  origin: GeoPoint,
  points: OptimizablePoint[],
): OptimizationResult {
  const originalDistanceKm = closedTourDistanceKm(origin, points);
  if (points.length <= 2) {
    return {
      order: points.map((p) => p.id),
      distanceKm: originalDistanceKm,
      originalDistanceKm,
      improvementKm: 0,
    };
  }

  const remaining = [...points];
  const tour: OptimizablePoint[] = [];
  let current: GeoPoint = origin;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((p, index) => {
      const d = haversineKm(current, p);
      if (d < bestDistance - 1e-9) {
        bestDistance = d;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    tour.push(next!);
    current = next!;
  }

  let improved = true;
  let best = closedTourDistanceKm(origin, tour);
  let guard = 0;
  while (improved && guard < 500) {
    improved = false;
    guard += 1;
    for (let i = 0; i < tour.length - 1; i += 1) {
      for (let k = i + 1; k < tour.length; k += 1) {
        const candidate = [
          ...tour.slice(0, i),
          ...tour.slice(i, k + 1).reverse(),
          ...tour.slice(k + 1),
        ];
        const distance = closedTourDistanceKm(origin, candidate);
        if (distance + 1e-9 < best) {
          tour.splice(0, tour.length, ...candidate);
          best = distance;
          improved = true;
        }
      }
    }
  }

  const finalDistance = Math.min(best, originalDistanceKm);
  const order = best <= originalDistanceKm ? tour.map((p) => p.id) : points.map((p) => p.id);
  return {
    order,
    distanceKm: finalDistance,
    originalDistanceKm,
    improvementKm: Math.max(0, originalDistanceKm - finalDistance),
  };
}

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

export interface PathOptimization {
  /** Índices (da matriz) na ordem proposta */
  order: number[];
  cost: number;
  method: 'exact' | 'heuristic';
}

/** Custo de start → order... → end numa matriz (assimétrica) de custos. */
export function pathCost(
  cost: number[][],
  start: number,
  end: number,
  order: readonly number[],
): number {
  let total = 0;
  let prev = start;
  for (const node of order) {
    total += cost[prev]![node]!;
    prev = node;
  }
  return total + cost[prev]![end]!;
}

const EXACT_LIMIT = 13;

/**
 * Melhor ordem para visitar `nodes` saindo de `start` e terminando em `end`, minimizando
 * o custo (ex.: tempo de transporte público, que é assimétrico).
 * Exato (programação dinâmica de Held-Karp) até 13 paradas; acima disso,
 * vizinho mais próximo + 2-opt.
 */
export function optimizePath(
  cost: number[][],
  start: number,
  end: number,
  nodes: readonly number[],
): PathOptimization {
  const n = nodes.length;
  if (n <= 1)
    return { order: [...nodes], cost: pathCost(cost, start, end, nodes), method: 'exact' };
  if (n <= EXACT_LIMIT) {
    const size = 1 << n;
    const dp = new Float64Array(size * n).fill(Infinity);
    const parent = new Int8Array(size * n).fill(-1);
    for (let j = 0; j < n; j++) dp[(1 << j) * n + j] = cost[start]![nodes[j]!]!;
    for (let mask = 1; mask < size; mask++) {
      for (let j = 0; j < n; j++) {
        if (!(mask & (1 << j))) continue;
        const current = dp[mask * n + j]!;
        if (current === Infinity) continue;
        for (let k = 0; k < n; k++) {
          if (mask & (1 << k)) continue;
          const next = mask | (1 << k);
          const value = current + cost[nodes[j]!]![nodes[k]!]!;
          if (value < dp[next * n + k]!) {
            dp[next * n + k] = value;
            parent[next * n + k] = j;
          }
        }
      }
    }
    const full = size - 1;
    let bestJ = 0;
    let best = Infinity;
    for (let j = 0; j < n; j++) {
      const value = dp[full * n + j]! + cost[nodes[j]!]![end]!;
      if (value < best) {
        best = value;
        bestJ = j;
      }
    }
    const order: number[] = [];
    let mask = full;
    let j = bestJ;
    while (j !== -1) {
      order.push(nodes[j]!);
      const p = parent[mask * n + j]!;
      mask &= ~(1 << j);
      j = p;
    }
    order.reverse();
    return { order, cost: best, method: 'exact' };
  }
  // Heurística: vizinho mais próximo + 2-opt (caminho com extremos fixos)
  const remaining = new Set(nodes);
  let order: number[] = [];
  let prev = start;
  while (remaining.size) {
    let pick = -1;
    let bestCost = Infinity;
    for (const node of remaining) {
      const c = cost[prev]![node]!;
      if (c < bestCost) {
        bestCost = c;
        pick = node;
      }
    }
    order.push(pick);
    remaining.delete(pick);
    prev = pick;
  }
  let bestTotal = pathCost(cost, start, end, order);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = [
          ...order.slice(0, i),
          ...order.slice(i, k + 1).reverse(),
          ...order.slice(k + 1),
        ];
        const total = pathCost(cost, start, end, candidate);
        if (total + 1e-9 < bestTotal) {
          order = candidate;
          bestTotal = total;
          improved = true;
        }
      }
    }
  }
  return { order, cost: bestTotal, method: 'heuristic' };
}

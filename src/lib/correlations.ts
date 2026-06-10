import { format, parseISO, isSameDay, subDays } from 'date-fns';
import type { Event, Variable } from '@/lib/types';


export interface CorrelationPoint {
  x: number;
  y: number;
  date: string;
  label?: string;
}

export interface CorrelationResult {
  varIdX: string;
  varIdY: string;
  labelX: string;
  labelY: string;
  r: number;
  interpretation: string;
  data: CorrelationPoint[];
}

/** Pearson r ∈ [-1, 1]. Returns NaN when there is insufficient variance. */
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? NaN : num / den;
}

function interpretR(r: number): string {
  const abs = Math.abs(r);
  const dir = r >= 0 ? 'positiva' : 'negativa';
  if (abs >= 0.7) return `Correlación ${dir} fuerte`;
  if (abs >= 0.4) return `Correlación ${dir} moderada`;
  if (abs >= 0.2) return `Correlación ${dir} débil`;
  return 'Sin correlación aparente';
}

/**
 * Computes the top dynamic Pearson correlations across all variable pairs
 * using the last `lookbackDays` days of event data.
 *
 * Returns up to `topN` pairs sorted by |r| descending.
 */
export function computeDynamicCorrelations(
  events: Event[],
  variables: Variable[],
  lookbackDays = 30,
  topN = 3,
  minPoints = 5,
): CorrelationResult[] {
  const days = Array.from({ length: lookbackDays }, (_, i) => subDays(new Date(), i));
  const variableById = new Map(variables.map((v) => [v.var_id, v]));

  // Build day-indexed intensity map per variable
  // dayIntensity[var_id][day_index] = max intensity that day (0 if absent)
  const varIds = variables.map((v) => v.var_id);
  const dayIntensityMap = new Map<string, number[]>();
  for (const varId of varIds) {
    dayIntensityMap.set(varId, new Array(days.length).fill(0));
  }

  for (const event of events) {
    if (!variableById.has(event.var_id)) continue;
    const eventDate = parseISO(event.fecha);
    const idx = days.findIndex((d) => isSameDay(d, eventDate));
    if (idx === -1) continue;
    const arr = dayIntensityMap.get(event.var_id)!;
    arr[idx] = Math.max(arr[idx], event.intensidad);
  }

  const results: CorrelationResult[] = [];

  for (let i = 0; i < varIds.length; i++) {
    for (let j = i + 1; j < varIds.length; j++) {
      const idX = varIds[i];
      const idY = varIds[j];
      const vecX = dayIntensityMap.get(idX)!;
      const vecY = dayIntensityMap.get(idY)!;

      // Only use days where at least one variable had activity
      const points: CorrelationPoint[] = [];
      const xs: number[] = [];
      const ys: number[] = [];

      for (let d = 0; d < days.length; d++) {
        if (vecX[d] === 0 && vecY[d] === 0) continue;
        xs.push(vecX[d]);
        ys.push(vecY[d]);
        points.push({ x: vecX[d], y: vecY[d], date: format(days[d], 'dd/MM') });
      }

      if (xs.length < minPoints) continue;

      const r = pearson(xs, ys);
      if (isNaN(r)) continue;

      const varX = variableById.get(idX)!;
      const varY = variableById.get(idY)!;

      results.push({
        varIdX: idX,
        varIdY: idY,
        labelX: varX.var_nombre,
        labelY: varY.var_nombre,
        r: Math.round(r * 1000) / 1000,
        interpretation: interpretR(r),
        data: points,
      });
    }
  }

  return results
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, topN);
}

export interface AreaCorrelationResult {
  areaIdX: string;
  areaIdY: string;
  labelX: string;
  labelY: string;
  r: number;
  interpretation: string;
  data: CorrelationPoint[];
}

/**
 * Computes Pearson correlations between all pairs of life area scores.
 * Input: daily rows with { date, [areaId]: score }.
 * Returns up to topN pairs sorted by |r| descending.
 */
export function computeAreaCrossCorrelations(
  dailyRows: { date: string; [areaId: string]: number | string }[],
  areas: { area_id: string; area_nombre: string }[],
  topN = 6,
  minPoints = 5,
): AreaCorrelationResult[] {
  if (dailyRows.length < minPoints) return [];

  const results: AreaCorrelationResult[] = [];

  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const ax = areas[i];
      const ay = areas[j];

      const points: CorrelationPoint[] = dailyRows
        .map(d => ({
          x: d[ax.area_id] as number,
          y: d[ay.area_id] as number,
          date: d.date as string,
        }))
        .filter(p => typeof p.x === 'number' && typeof p.y === 'number' && !isNaN(p.x) && !isNaN(p.y));

      if (points.length < minPoints) continue;

      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const r = pearson(xs, ys);
      if (isNaN(r)) continue;

      results.push({
        areaIdX: ax.area_id,
        areaIdY: ay.area_id,
        labelX: ax.area_nombre,
        labelY: ay.area_nombre,
        r: Math.round(r * 1000) / 1000,
        interpretation: interpretR(r),
        data: points,
      });
    }
  }

  return results
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, topN);
}

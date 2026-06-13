// Cadencia de hábitos consciente de la frecuencia.
//
// Antes el cumplimiento y la racha eran SIEMPRE por día, ignorando la frecuencia
// (un hábito semanal salía "pendiente" cada día y su racha se rompía entre marcas).
// Aquí el cumplimiento y la racha se miden por el PERIODO propio de cada hábito:
//   Diaria    → 1 registro / día      · racha en días
//   3xSemana  → 3 registros / semana  · racha en semanas que alcanzan el objetivo
//   Semanal   → 1 registro / semana   · racha en semanas
//   Mensual   → 1 registro / mes      · racha en meses

import { parseISO, getISOWeek, getISOWeekYear, subDays, subWeeks, subMonths } from 'date-fns';

export type Frecuencia = 'Diaria' | '3xSemana' | 'Semanal' | 'Mensual';
type Period = 'day' | 'week' | 'month';

export interface FreqSpec {
  period: Period;
  target: number;       // registros necesarios por periodo
  periodLabel: string;  // "hoy" / "esta semana" / "este mes"
  unit: string;         // "días" / "semanas" / "meses" (para la racha)
}

export function freqSpec(f: string | undefined): FreqSpec {
  switch (f) {
    case '3xSemana': return { period: 'week', target: 3, periodLabel: 'esta semana', unit: 'semanas' };
    case 'Semanal':  return { period: 'week', target: 1, periodLabel: 'esta semana', unit: 'semanas' };
    case 'Mensual':  return { period: 'month', target: 1, periodLabel: 'este mes', unit: 'meses' };
    case 'Diaria':
    default:         return { period: 'day', target: 1, periodLabel: 'hoy', unit: 'días' };
  }
}

function periodKey(d: Date, period: Period): string {
  if (period === 'week') return `${getISOWeekYear(d)}-W${getISOWeek(d)}`;
  if (period === 'month') return `${d.getFullYear()}-${d.getMonth()}`;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function prevPeriod(d: Date, period: Period): Date {
  if (period === 'week') return subWeeks(d, 1);
  if (period === 'month') return subMonths(d, 1);
  return subDays(d, 1);
}

/** Cuenta de registros por clave de periodo a partir de las fechas ISO de un hábito. */
function countsByPeriod(fechas: string[], period: Period): Record<string, number> {
  const m: Record<string, number> = {};
  for (const f of fechas) {
    const d = (() => { try { const x = parseISO(f); return Number.isNaN(x.getTime()) ? null : x; } catch { return null; } })();
    if (!d) continue;
    const k = periodKey(d, period);
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

export interface Completion {
  count: number;     // registros en el periodo actual
  target: number;    // objetivo del periodo
  done: boolean;     // ¿cumplido el periodo actual?
  periodLabel: string;
}

export function habitCompletion(fechas: string[], frecuencia: string | undefined, now: Date): Completion {
  const spec = freqSpec(frecuencia);
  const counts = countsByPeriod(fechas, spec.period);
  const count = counts[periodKey(now, spec.period)] || 0;
  return { count, target: spec.target, done: count >= spec.target, periodLabel: spec.periodLabel };
}

/**
 * Racha en periodos consecutivos cumplidos. El periodo actual cuenta solo si ya
 * está cumplido; si está en curso (aún sin alcanzar el objetivo) NO rompe la racha
 * — se cuentan los periodos anteriores completados de forma consecutiva.
 */
export function habitStreak(fechas: string[], frecuencia: string | undefined, now: Date): { value: number; unit: string } {
  const spec = freqSpec(frecuencia);
  const counts = countsByPeriod(fechas, spec.period);
  const met = (d: Date) => (counts[periodKey(d, spec.period)] || 0) >= spec.target;

  let streak = 0;
  if (met(now)) streak++;           // periodo actual ya cumplido
  let p = prevPeriod(now, spec.period);
  while (met(p)) { streak++; p = prevPeriod(p, spec.period); }
  return { value: streak, unit: spec.unit };
}

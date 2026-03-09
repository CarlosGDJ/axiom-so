import { differenceInHours, parseISO } from 'date-fns';
import type { Area, Event, OverallState, Variable } from '@/lib/types';

const AREA_BASE_SCORE = 70;
const AREA_SCORE_MULTIPLIER = 2;
const AREA_DECAY_K = 0.14;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function variableCurveResponse(variable: Variable, intensity: number): number {
  const x = clamp(intensity / 5, 0, 1);
  switch (variable.curva) {
    case 'Exponencial':
      return x * x;
    case 'Umbral':
      return x < 0.6 ? x * 0.45 : 0.27 + ((x - 0.6) / 0.4) * 0.73;
    case 'Lineal':
    default:
      return x;
  }
}

export function computeAreaEventContributionAtTime(event: Event, variable: Variable, at: Date): number {
  const eventDate = parseISO(event.fecha);
  const dt = differenceInHours(at, eventDate);
  if (dt < 0) return 0;

  const delayHours = Math.max(0, (variable.delay_dias || 0) * 24);
  if (dt < delayHours) return 0;

  const effectiveDt = dt - delayHours;
  const curveFactor = variableCurveResponse(variable, event.intensidad);
  const peakImpact = variable.polaridad * variable.impacto_base * curveFactor;
  const effectiveDuration = Math.max(1, (variable.duracion_dias || 0) * 24);

  if (effectiveDt <= effectiveDuration) {
    return peakImpact;
  }

  const timeAfterPeak = effectiveDt - effectiveDuration;
  return peakImpact * Math.exp(-AREA_DECAY_K * timeAfterPeak);
}

function resolveAreaState(score: number, area: Area): OverallState {
  const rawRisk = (area.umbral_riesgo ?? 7) * 10;
  const rawCritical = (area.umbral_critico ?? 4) * 10;
  const criticalThreshold = Math.min(rawCritical, rawRisk - 1);
  const riskThreshold = Math.max(rawRisk, criticalThreshold + 1);

  if (score < criticalThreshold) return 'CRITICO';
  if (score < riskThreshold) return 'RIESGO';
  return 'OK';
}

export function computeAreaScoreAtTime(params: {
  area: Area;
  events: Event[];
  variableById: Map<string, Variable>;
  at: Date;
  globalState?: OverallState;
}) {
  const { area, events, variableById, at, globalState } = params;

  const weightedImpact = events.reduce((acc, event) => {
    const variable = variableById.get(event.var_id);
    if (!variable) return acc;
    return acc + computeAreaEventContributionAtTime(event, variable, at);
  }, 0);

  let score = Math.round(clamp(AREA_BASE_SCORE + (weightedImpact * AREA_SCORE_MULTIPLIER)));
  if (globalState === 'CRITICO') score = Math.min(score, 49);
  if (globalState === 'RIESGO') score = Math.min(score, 74);

  return {
    score,
    state: resolveAreaState(score, area),
    weightedImpact,
  };
}


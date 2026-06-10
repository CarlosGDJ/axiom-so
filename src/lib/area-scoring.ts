import { differenceInHours, parseISO } from 'date-fns';
import type { Area, Event, OverallState, PlayerProfile, Variable } from '@/lib/types';

const AREA_BASE_SCORE = 70;
const AREA_SCORE_MULTIPLIER = 2;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

// ─── Improvement 1: Variable-specific decay rates ────────────────────────────
//
// Each variable type has a biologically-motivated decay constant (k, hr⁻¹).
// Half-life = ln(2)/k. Higher k → faster decay after the active duration window.
//
// Physical/sleep events persist for days (k ≈ 0.03 → half-life ~23 h).
// Mental/stress events linger 2-3 days (k ≈ 0.10).
// Behavioral/impulsive events spike and fade quickly (k ≈ 0.22 → half-life ~3 h).

export function getVariableDecayK(variable: Variable): number {
  const tipo  = (variable.tipo  ?? '').toLowerCase();
  const varId = (variable.var_id ?? '').toLowerCase();

  // Impulsive (Exponential curve) → fastest decay
  if (variable.curva === 'Exponencial') return 0.22;

  // Physical, sleep, exercise → slowest decay (high physiological persistence)
  const isPhysical =
    tipo.includes('fís') || tipo.includes('fis') ||
    varId.includes('sue')  || varId.includes('sleep') ||
    varId.includes('ejerc') || varId.includes('entreno') ||
    varId.includes('deport');
  if (isPhysical) return 0.03;

  // Environmental context → very slow (chronic baseline effect)
  if (tipo === 'entorno') return 0.05;

  // Financial stress lingers
  if (tipo.includes('financier')) return 0.04;

  // Social events persist moderately
  if (tipo.includes('social')) return 0.07;

  // Emotional events medium-long persistence
  if (tipo.includes('emocional')) return 0.09;

  // Mental/cognitive events: medium
  if (tipo.includes('mental')) return 0.11;

  // Behavioral (non-impulsive): near original default
  if (tipo.includes('conductual')) return 0.16;

  return 0.14; // default — matches original behaviour
}

// ─── Improvement 2: Personality-modulated impact weight ──────────────────────
//
// Uses Big Five traits derived from the PlayerProfile to amplify or dampen
// how much a given event affects the user's score. Clamped to [0.6, 1.8]
// so no trait can double or zero out the impact.
//
// · Neuroticism   → amplifies negative events (anxious people are hit harder)
// · Conscientiousness → amplifies positive habitual/behavioural events
// · Extraversion  → amplifies social events in both directions

export function getPersonalityMultiplier(
  variable: Variable,
  playerProfile: PlayerProfile | null | undefined,
): number {
  if (!playerProfile) return 1.0;

  let multiplier = 1.0;
  const tipo = (variable.tipo ?? '').toLowerCase();

  // Neuroticism: negative events hit harder for high-N individuals
  if (variable.polaridad === -1) {
    const n = (playerProfile.personality_neuroticism - 50) / 100; // [-0.5, 0.5]
    multiplier += n * 0.6; // range contribution: ±0.30
  }

  // Conscientiousness: positive behavioural events more impactful for high-C
  if (variable.polaridad === 1 && (tipo.includes('conductual') || tipo.includes('mental'))) {
    const c = (playerProfile.personality_conscientiousness - 50) / 100;
    multiplier += c * 0.4; // range contribution: ±0.20
  }

  // Extraversion: social events amplified for both high-E and low-E (opposite signs)
  if (tipo.includes('social')) {
    const e = (playerProfile.personality_extraversion - 50) / 100;
    // High-E gets more from positive social; low-E gets more from negative social
    multiplier += e * variable.polaridad * 0.5; // range contribution: ±0.25
  }

  return clamp(multiplier, 0.6, 1.8);
}

// ─── Core computation ─────────────────────────────────────────────────────────

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

export function computeAreaEventContributionAtTime(
  event: Event,
  variable: Variable,
  at: Date,
  playerProfile?: PlayerProfile | null,
): number {
  const eventDate = parseISO(event.fecha);
  const dt = differenceInHours(at, eventDate);
  if (dt < 0) return 0;

  const delayHours = Math.max(0, (variable.delay_dias || 0) * 24);
  if (dt < delayHours) return 0;

  const effectiveDt     = dt - delayHours;
  const curveFactor     = variableCurveResponse(variable, event.intensidad);
  const personalityMult = getPersonalityMultiplier(variable, playerProfile);
  const peakImpact      = variable.polaridad * variable.impacto_base * curveFactor * personalityMult;
  const effectiveDuration = Math.max(1, (variable.duracion_dias || 0) * 24);

  if (effectiveDt <= effectiveDuration) {
    return peakImpact;
  }

  const k            = getVariableDecayK(variable);
  const timeAfterPeak = effectiveDt - effectiveDuration;
  return peakImpact * Math.exp(-k * timeAfterPeak);
}

function resolveAreaState(score: number, area: Area): OverallState {
  const rawRisk     = (area.umbral_riesgo  ?? 7) * 10;
  const rawCritical = (area.umbral_critico ?? 4) * 10;
  const criticalThreshold = Math.min(rawCritical, rawRisk - 1);
  const riskThreshold     = Math.max(rawRisk, criticalThreshold + 1);

  if (score < criticalThreshold) return 'CRITICO';
  if (score < riskThreshold)     return 'RIESGO';
  return 'OK';
}

export function computeAreaScoreAtTime(params: {
  area: Area;
  events: Event[];
  variableById: Map<string, Variable>;
  at: Date;
  globalState?: OverallState;
  playerProfile?: PlayerProfile | null;
}) {
  const { area, events, variableById, at, globalState, playerProfile } = params;

  const weightedImpact = events.reduce((acc, event) => {
    const variable = variableById.get(event.var_id);
    if (!variable) return acc;
    return acc + computeAreaEventContributionAtTime(event, variable, at, playerProfile);
  }, 0);

  let score = Math.round(clamp(AREA_BASE_SCORE + (weightedImpact * AREA_SCORE_MULTIPLIER)));
  if (globalState === 'CRITICO') score = Math.min(score, 49);
  if (globalState === 'RIESGO')  score = Math.min(score, 74);

  return {
    score,
    state: resolveAreaState(score, area),
    weightedImpact,
  };
}

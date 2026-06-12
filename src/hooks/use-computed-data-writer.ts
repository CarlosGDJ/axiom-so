'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@/hooks/use-session-user';
import { useCollection, useDoc } from '@/hooks/use-mongo-collection';
import {
  Area,
  Hormone,
  Variable,
  Event,
  Interaction,
  Relation,
  Transaction,
  PlayerProfile,
  ComputedGlobalState,
  ImpactMatrix,
  RPGStats,
  OverallState,
  DominantVariableInfo,
  DashboardConfig,
  ComputedDailyScore,
  Protocol,
} from '@/lib/types';
import { computeClinicalModelV2 } from '@/lib/model-v2-clinical';
import { impactMatrixPresets, protocolPresets } from '@/lib/seed-data';
import { computeAreaScoreAtTime } from '@/lib/area-scoring';
import { subDays, parseISO, differenceInHours, differenceInDays, format } from 'date-fns';
import type { Milestone } from '@/lib/types';

// Constantes de decaimiento k (por hora) usadas en exp(-k·t). Donde el stat mapea
// a una sustancia real, k se deriva de su vida media clínica: k = ln(2)/t½.
//   · cortisol  → vida media 1.2–2.0h (Hydrocortisone PK) ⇒ k≈0.46 (t½≈1.5h)
//   · serotonina → neurotransmisor lento de ánimo ⇒ decaimiento lento
// El resto son proxies conductuales (no sustancias medibles); k ajustado para que
// el efecto de un evento dure un rango plausible sin acantilados.
const DECAY_K: Record<string, number> = {
  cortisol: 0.46,            // antes 0.2 (t½ 3.5h, irreal): el estrés se quedaba pegado
  dopamina: 0.4,             // antes 0.5: suaviza el acantilado post-recompensa
  serotonina: 0.1,
  energia: 0.15,
  foco: 0.3,
  sueno: 0.08,
  conexion_social: 0.2,
  carga_dopaminergica: 0.4,
};


const HORMONE_TO_STATS_MAP: Record<string, string | null> = {
  DOPAMINA: 'dopamina',
  SEROTONINA: 'serotonina',
  CORTISOL: 'cortisol',
  FOCUS: 'foco',
  ENERGY: 'energia',
  MELATONINA: 'sueno',
  OXITOCINA: 'conexion_social',
  DOPA_LOAD: 'carga_dopaminergica',
  ENDORFINAS: null,
  TESTOSTERONA: null,
  NORADRENALINA: null,
  PROLACTINA: null,
  INSULINA: null,
  GABA: null,
  PARASIMPATICO: null,
};

function buildHeuristicImpactsForVariable(variable: Variable): ImpactMatrix[] {
  const polarity = variable.polaridad || 1;
  const intensity = Math.max(1, variable.impacto_base || 5);
  const baseDuration = Math.max(2, Math.round(Math.max(0.08, variable.duracion_dias || 0.25) * 24));
  const tipo = (variable.tipo || '').toLowerCase();
  const area = (variable.area_id || '').toUpperCase();

  // Core fallback profile:
  // Positive events raise dopamina/foco/energia/serotonina and lower cortisol/dopa load.
  // Negative events do the inverse.
  let dopamina = 6 * polarity;
  let serotonina = 5 * polarity;
  let cortisol = -7 * polarity;
  let focus = 5 * polarity;
  let energy = 5 * polarity;
  let dopaLoad = -6 * polarity;

  // Context tuning by domain.
  if (tipo.includes('social') || area.includes('RELACIONES')) {
    serotonina += 2 * polarity;
    cortisol -= 2 * polarity;
  }
  if (tipo.includes('financier') || area.includes('FINANZAS')) {
    cortisol -= 2 * polarity;
    focus += 1.5 * polarity;
  }
  if (area.includes('DOPAMINA') || tipo.includes('conductual')) {
    dopaLoad -= 2 * polarity;
    dopamina += 1.5 * polarity;
  }
  if (tipo.includes('fís') || tipo.includes('fis') || area.includes('SALUD_FIS')) {
    energy += 2 * polarity;
    cortisol -= 1 * polarity;
  }

  const scale = Math.max(0.5, Math.min(1.8, intensity / 8));
  const mk = (hormone_id: string, effect_size: number, duration_hours = baseDuration): ImpactMatrix => ({
    id: `heur_${variable.var_id}_${hormone_id}`,
    matrix_id: `HEUR_${variable.var_id}_${hormone_id}`,
    var_id: variable.var_id,
    hormone_id,
    effect_size: Math.round(effect_size * scale),
    duration_hours,
  });

  return [
    mk('DOPAMINA', dopamina, Math.max(2, Math.round(baseDuration * 0.8))),
    mk('SEROTONINA', serotonina, baseDuration),
    mk('CORTISOL', cortisol, Math.max(2, Math.round(baseDuration * 0.9))),
    mk('FOCUS', focus, Math.max(2, Math.round(baseDuration * 0.85))),
    mk('ENERGY', energy, baseDuration),
    mk('DOPA_LOAD', dopaLoad, Math.max(2, Math.round(baseDuration * 1.2))),
  ];
}

function buildVirtualVariableFromEvent(event: Event): Variable {
  const text = `${event.var_id} ${event.contexto || ''}`.toLowerCase();
  const isFinancial = text.includes('gasto') || text.includes('dinero') || text.includes('deuda');
  const isSocial = text.includes('social') || text.includes('persona') || text.includes('relacion');
  const isPhysical = text.includes('sue') || text.includes('sleep') || text.includes('entreno') || text.includes('cuerpo');
  const isEnvironmental = text.includes('entorno') || text.includes('orden') || text.includes('ruido');

  const tipo: Variable['tipo'] =
    isFinancial ? 'Financiera' :
    isSocial ? 'Social' :
    isPhysical ? 'FÃ­sica' :
    isEnvironmental ? 'Entorno' :
    'Conductual';

  const area_id =
    isFinancial ? 'FINANZAS' :
    isSocial ? 'RELACIONES' :
    isPhysical ? 'SALUD_FIS' :
    isEnvironmental ? 'ENTORNO' :
    'SALUD_MENT';

  const durationDays = event.duracion_min && event.duracion_min > 0
    ? Math.min(2, Math.max(0.08, event.duracion_min / 60 / 24))
    : 0.25;

  const polarity: 1 | -1 =
    event.tipo === 'Protocolo'
      ? 1
      : (event.impulsivo ? -1 : -1);

  return {
    id: `virtual_${event.var_id}`,
    var_id: event.var_id,
    var_nombre: event.contexto?.trim() || event.var_id,
    area_id,
    tipo,
    polaridad: polarity,
    impacto_base: Math.max(3, Math.min(12, 3 + (event.intensidad * 1.6))),
    curva: event.impulsivo ? 'Exponencial' : 'Lineal',
    delay_dias: 0,
    duracion_dias: durationDays,
    umbral_riesgo: 2,
    controlabilidad: 'Media',
    activo: true,
  };
}

function inferProtocolProxyVarId(
  event: Event,
  protocolById: Map<string, { nombre?: string; pasos?: string }>,
  variableById: Map<string, Variable>,
): string | null {
  const meta = protocolById.get(event.var_id);
  const text = `${event.var_id} ${meta?.nombre || ''} ${meta?.pasos || ''} ${event.contexto || ''}`.toLowerCase();
  const candidates: Array<{ pattern: RegExp; varId: string }> = [
    { pattern: /respir|4-7-8|coherencia/, varId: 'BREATHING' },
    { pattern: /medit/, varId: 'MEDITATION' },
    { pattern: /camina|walk|naturalez/, varId: 'WALK' },
    { pattern: /sue|sleep|descans/, varId: 'SUEÑO_PROF' },
    { pattern: /enfoque|focus|deep work|trabajo profundo/, varId: 'DEEP_WORK' },
    { pattern: /social|vinculo|relaci/, varId: 'SOCIAL_OK' },
    { pattern: /orden|entorno/, varId: 'ENV_ORDER' },
  ];

  for (const candidate of candidates) {
    if (candidate.pattern.test(text) && variableById.has(candidate.varId)) {
      return candidate.varId;
    }
  }

  if (variableById.has('BREATHING')) return 'BREATHING';
  if (variableById.has('MEDITATION')) return 'MEDITATION';
  return null;
}

/**
 * Returns true for physical/hormetic events whose cortisol is anabolic (eustress).
 * Exercise, breathing, meditation, cold exposure → hormetic.
 * Conflict, financial pressure, social rejection → distress.
 */
function isEustressEvent(event: Event, variable: Variable | undefined): boolean {
  const text = `${event.var_id} ${event.contexto || ''} ${variable?.var_nombre || ''}`.toLowerCase();
  const area = (variable?.area_id || '').toUpperCase();
  const isHormetic = (
    /ejercic|entreno|running|corr(?:er|iendo)|gym|natac|deporte|cardio|yoga|ciclism|biciclet|pesas|fuerza|aerobic|pilates|camina|walk|ducha.*fr|cold|sauna|respira|medit/.test(text) ||
    area.includes('SALUD_FIS') ||
    variable?.tipo === 'Física' ||
    variable?.tipo === 'FÃ­sica'
  );
  return isHormetic && ((variable?.polaridad ?? 1) > 0 || event.tipo === 'Protocolo');
}

function buildCollectionSignature<T>(items: T[] | null | undefined, projector: (item: T) => string): string {
  if (!items || items.length === 0) return 'none';
  return items.map(projector).sort().join('||');
}

const CIRCADIAN_PHASES: Record<string, { peakHour: number; amplitude: number }> = {
  CORTISOL: { peakHour: 8, amplitude: 0.16 },
  DOPAMINA: { peakHour: 11, amplitude: 0.08 },
  SEROTONINA: { peakHour: 13, amplitude: 0.1 },
  ENERGY: { peakHour: 14, amplitude: 0.1 },
  FOCUS: { peakHour: 11, amplitude: 0.08 },
  MELATONINA: { peakHour: 2, amplitude: 0.22 },
  OXITOCINA: { peakHour: 20, amplitude: 0.06 },
  DOPA_LOAD: { peakHour: 23, amplitude: 0.12 },
};

const MIN_WRITE_INTERVAL = 1000 * 60 * 5;
const AUTO_CALIBRATION_INTERVAL_MS = 1000 * 60 * 60 * 24;
const MIN_CALIBRATION_TRANSITIONS = 10;
const SLEEP_KEY = 'sueno';
const FORCE_ENABLE_CLINICAL_V2 = true;

const clamp = (value: number, min = 0, max = 100) => {
  // Neutraliza NaN/Infinity: un único valor no finito aguas arriba (fecha mal
  // formada, división 0/0, monto undefined) contaminaría todos los stats y el score.
  const v = Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, v));
};
const tanhNorm = (value: number, scale = 1) => {
  const v = Number.isFinite(value) ? value : 0;
  return Math.tanh(v / Math.max(0.0001, scale));
};

function circadianMultiplier(hormoneId: string, currentHour: number): number {
  const phase = CIRCADIAN_PHASES[hormoneId];
  if (!phase) return 1;
  const angle = ((currentHour - phase.peakHour) / 24) * Math.PI * 2;
  return 1 + (Math.cos(angle) * phase.amplitude);
}

function variableCurveResponse(variable: Variable | undefined, intensity: number): number {
  const x = clamp(intensity / 5, 0, 1);
  if (!variable) return x;

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

function getSensitivity(profile: PlayerProfile) {
  return {
    stress: clamp(profile.sensitivity_stress || 1, 0.6, 1.8),
    dopamine: clamp(profile.sensitivity_dopamine || 1, 0.6, 1.8),
    sleep: clamp(profile.sensitivity_sleep || 1, 0.6, 1.8),
    emotional: clamp(profile.sensitivity_emotional || 1, 0.6, 1.8),
    pressure: clamp(profile.sensitivity_pressure || 1, 0.6, 1.8),
    environmental: clamp(profile.sensitivity_environmental || 1, 0.6, 1.8),
  };
}

function applySensitivity(statKey: string, effect: number, sensitivity: ReturnType<typeof getSensitivity>): number {
  if (statKey === 'cortisol') return effect * sensitivity.stress;
  if (statKey === 'carga_dopaminergica') return effect * sensitivity.dopamine;
  if (statKey === SLEEP_KEY) return effect * sensitivity.sleep;
  if (statKey === 'serotonina') return effect * sensitivity.emotional;
  if (statKey === 'foco' || statKey === 'energia') return effect * sensitivity.pressure;
  return effect * ((sensitivity.pressure + sensitivity.environmental) / 2);
}

type SensitivitySet = ReturnType<typeof getSensitivity>;

function computeCalibrationLoads(events: Event[], variableById: Map<string, Variable>) {
  const byDay: Record<string, Record<keyof SensitivitySet, number>> = {};

  const emptyLoads = (): Record<keyof SensitivitySet, number> => ({
    stress: 0,
    dopamine: 0,
    sleep: 0,
    emotional: 0,
    pressure: 0,
    environmental: 0,
  });

  for (const event of events) {
    const day = event.fecha.slice(0, 10);
    if (!byDay[day]) byDay[day] = emptyLoads();
    const loads = byDay[day];
    const variable = variableById.get(event.var_id);
    if (!variable) continue;

    const signedImpact = variable.polaridad * variable.impacto_base * (event.intensidad / 5);
    const neg = Math.max(0, -signedImpact);
    const pos = Math.max(0, signedImpact);

    const tipo = (variable.tipo || '').toLowerCase();
    const area = (variable.area_id || '').toUpperCase();
    const descriptor = `${variable.var_id} ${variable.var_nombre}`.toLowerCase();

    if (tipo.includes('mental') || tipo.includes('emocional') || descriptor.includes('estres') || descriptor.includes('cortisol')) {
      loads.stress += neg;
    }
    if (area.includes('DOPAMINA') || descriptor.includes('dopam') || descriptor.includes('scroll') || descriptor.includes('porno') || descriptor.includes('impuls')) {
      loads.dopamine += neg + (event.impulsivo ? 1 : 0);
    }
    if (descriptor.includes('sue') || descriptor.includes('sleep') || descriptor.includes('insom')) {
      loads.sleep += neg;
      loads.sleep -= pos * 0.5;
    }
    if (tipo.includes('emocional') || tipo.includes('social')) {
      loads.emotional += neg;
    }
    if (tipo.includes('entorno')) {
      loads.environmental += neg;
    }
    if (tipo.includes('conductual') || tipo.includes('mental') || tipo.includes('financier')) {
      loads.pressure += neg;
    }
    if (event.impulsivo) {
      loads.dopamine += 0.8;
      loads.pressure += 0.4;
    }
  }

  return byDay;
}

/**
 * Derives chronotype score from personality facets.
 * Returns -1 (extreme night owl) to +1 (extreme morning bird).
 * Judging (structured, disciplined) → morning; Turbulent (reactive) → evening.
 */
function computeChronotype(profile: PlayerProfile): number {
  const judging    = (profile.facet_tactics_judging    ?? 50) / 100; // 0–1
  const turbulent  = (profile.facet_identity_turbulent ?? 50) / 100; // 0–1
  // judging → morning signal (+); turbulent → evening signal (-)
  const raw = (judging - 0.5) * 0.65 - (turbulent - 0.5) * 0.35;
  return clamp(raw * 2, -1, 1); // ×2 to stretch the range; clamp to [-1,1]
}

function calibrateSensitivityFromHistory(
  base: SensitivitySet,
  events: Event[],
  scores: ComputedDailyScore[],
  variableById: Map<string, Variable>,
) {
  const orderedScores = [...scores].sort((a, b) => parseISO(a.fecha).getTime() - parseISO(b.fecha).getTime());
  if (orderedScores.length < MIN_CALIBRATION_TRANSITIONS + 1) {
    return { values: base, confidence: 0, transitions: 0 };
  }

  const loadsByDay = computeCalibrationLoads(events, variableById);
  const accum: Record<keyof SensitivitySet, number> = {
    stress: 0,
    dopamine: 0,
    sleep: 0,
    emotional: 0,
    pressure: 0,
    environmental: 0,
  };
  const weight: Record<keyof SensitivitySet, number> = {
    stress: 0,
    dopamine: 0,
    sleep: 0,
    emotional: 0,
    pressure: 0,
    environmental: 0,
  };

  let transitions = 0;
  for (let i = 1; i < orderedScores.length; i += 1) {
    const prev = orderedScores[i - 1];
    const curr = orderedScores[i];
    const dayLoads = loadsByDay[prev.fecha.slice(0, 10)];
    if (!dayLoads) continue;

    const delta = curr.score_total - prev.score_total;
    const outcomeSignal = clamp((-delta) / 20, -1, 1);
    transitions += 1;

    (Object.keys(dayLoads) as Array<keyof SensitivitySet>).forEach((k) => {
      const normalizedLoad = clamp(dayLoads[k] / 12, 0, 1);
      if (normalizedLoad <= 0) return;
      accum[k] += outcomeSignal * normalizedLoad;
      weight[k] += normalizedLoad;
    });
  }

  if (transitions < MIN_CALIBRATION_TRANSITIONS) {
    return { values: base, confidence: 0, transitions };
  }

  const confidence = clamp(transitions / 45, 0, 1);
  const tuned: SensitivitySet = { ...base };
  (Object.keys(tuned) as Array<keyof SensitivitySet>).forEach((k) => {
    if (weight[k] <= 0) return;
    const signal = clamp(accum[k] / weight[k], -1, 1);
    const adjustment = 1 + (0.08 * signal * confidence);
    tuned[k] = clamp(base[k] * adjustment, 0.6, 1.8);
  });

  return { values: tuned, confidence, transitions };
}

// Data that can be pre-fetched by use-user-data to avoid duplicate Firestore listeners.
export interface WriterPrefetch {
  playerProfile:       PlayerProfile | null | undefined;
  areas:               Area[];
  hormones:            Hormone[];
  impactMatrix:        ImpactMatrix[];
  variables:           Variable[];
  allEvents:           Event[];           // unfiltered; writer slices to 7d / 60d in-memory
  allInteractions:     Interaction[];
  relations:           Relation[];
  allTransactions:     Transaction[];
  protocols:           Protocol[];
  milestones:          Milestone[];
  computedDailyScores: ComputedDailyScore[];
  lastGlobalState:     ComputedGlobalState | null | undefined;
}

export function useComputedDataWriter(ext?: WriterPrefetch) {
  const { uid } = useUser();
  const active = !!uid && !ext; // Only fetch when ext is NOT provided

  // Fallback SWR listeners — only active when writerPrefetch is not provided by the dashboard
  const { data: _playerProfile }      = useDoc<PlayerProfile>(active ? 'playerProfile' : null, active ? 'main-profile' : null);
  const { data: _areas }              = useCollection<Area>(active ? 'areas' : null);
  const { data: _hormones }           = useCollection<Hormone>(active ? 'hormones' : null);
  const { data: _impactMatrix }       = useCollection<ImpactMatrix>(active ? 'impactMatrix' : null);
  const { data: _variables }          = useCollection<Variable>(active ? 'variables' : null);
  const { data: _events }             = useCollection<Event>(active ? 'events' : null, { orderBy: 'fecha', direction: 'desc', limit: 300 });
  const { data: _interactions }       = useCollection<Interaction>(active ? 'interactions' : null, { orderBy: 'fecha', direction: 'desc', limit: 150 });
  const { data: _relations }          = useCollection<Relation>(active ? 'relations' : null);
  const { data: _transactions }       = useCollection<Transaction>(active ? 'transactions' : null, { orderBy: 'fecha', direction: 'desc', limit: 300 });
  const { data: _protocols }          = useCollection<Protocol>(active ? 'protocols' : null);
  const { data: _milestones }         = useCollection<Milestone>(active ? 'milestones' : null);
  const { data: _calibrationScores }  = useCollection<ComputedDailyScore>(active ? 'computed_daily_score' : null, { orderBy: 'fecha', direction: 'desc', limit: 50 });
  const { data: _lastGlobalState }    = useDoc<ComputedGlobalState>(active ? 'computed_global_state' : null, active ? 'latest' : null);

  // These two are unique to the writer — always fetch them (not in writerPrefetch)
  const { data: calibrationMeta } = useDoc<DashboardConfig>(uid ? 'dashboardConfig' : null, uid ? 'bio_auto_calibration' : null);
  const { data: modelFlags }      = useDoc<DashboardConfig>(uid ? 'dashboardConfig' : null, uid ? 'model_flags' : null);

  // Resolve: use pre-fetched data when available, otherwise fall back to own SWR listeners.
  const cutoff7d  = subDays(new Date(), 7).toISOString();
  const cutoff60d = subDays(new Date(), 60).toISOString();
  const playerProfile    = ext?.playerProfile  ?? _playerProfile;
  const areas            = ext?.areas          ?? _areas          ?? [];
  const hormones         = ext?.hormones       ?? _hormones       ?? [];
  const impactMatrix     = ext?.impactMatrix   ?? _impactMatrix   ?? [];
  const variables        = ext?.variables      ?? _variables      ?? [];
  const events           = ext ? ext.allEvents.filter(e => e.fecha >= cutoff7d)           : ((_events           ?? []).filter(e => e.fecha >= cutoff7d));
  const interactions     = ext ? ext.allInteractions.filter(i => i.fecha >= cutoff7d)     : ((_interactions     ?? []).filter(i => i.fecha >= cutoff7d));
  const relations        = ext?.relations      ?? _relations      ?? [];
  const transactions     = ext ? ext.allTransactions.filter(t => t.fecha >= cutoff7d)     : ((_transactions     ?? []).filter(t => t.fecha >= cutoff7d));
  const historicalEvents = ext ? ext.allEvents.filter(e => e.fecha >= cutoff60d)          : ((_events           ?? []).filter(e => e.fecha >= cutoff60d));
  const protocols        = ext?.protocols      ?? _protocols      ?? [];
  const milestones       = ext?.milestones     ?? _milestones     ?? [];
  const calibrationScores = ext?.computedDailyScores ?? _calibrationScores ?? [];
  const lastGlobalState  = ext?.lastGlobalState ?? _lastGlobalState;

  const lastProcessedSignature = useRef<string | null>(null);
  // Firma de los DATOS reales (eventos/interacciones/...). A diferencia de
  // lastProcessedSignature, el timer NO la anula: nos permite distinguir un
  // recálculo por datos nuevos de uno por simple paso del tiempo.
  const lastDataSignature = useRef<string | null>(null);
  const lastWriteTime = useRef<number>(0);

  // Recompute every 15 min so pharmacokinetic decay updates the HUD even when
  // no new events are logged. Clears the signature so both guards are bypassed.
  const [timerKey, setTimerKey] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      lastProcessedSignature.current = null;
      setTimerKey(k => k + 1);
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const playerProfileSig = useMemo(
    () => (playerProfile ? `${playerProfile.id}:${playerProfile.sensitivity_stress}:${playerProfile.sensitivity_dopamine}:${playerProfile.sensitivity_sleep}:${playerProfile.sensitivity_emotional}:${playerProfile.sensitivity_environmental}:${playerProfile.sensitivity_pressure}` : 'none'),
    [playerProfile],
  );
  const areasSig = useMemo(
    () => (areas ? `${areas.length}:${areas[0]?.id ?? ''}:${areas[areas.length - 1]?.id ?? ''}` : 'none'),
    [areas],
  );
  const hormonesSig = useMemo(
    () => (hormones ? `${hormones.length}:${hormones[0]?.id ?? ''}:${hormones[hormones.length - 1]?.id ?? ''}` : 'none'),
    [hormones],
  );
  const impactMatrixSig = useMemo(
    () => buildCollectionSignature(impactMatrix, (im) => `${im.id}|${im.var_id}|${im.hormone_id}|${im.effect_size}|${im.duration_hours}`),
    [impactMatrix],
  );
  const variablesSig = useMemo(
    () => buildCollectionSignature(variables, (v) => `${v.id}|${v.var_id}|${v.area_id}|${v.impacto_base}|${v.polaridad}|${v.curva}|${v.delay_dias}|${v.duracion_dias}`),
    [variables],
  );
  const eventsSig = useMemo(
    () => buildCollectionSignature(events, (e) => `${e.id}|${e.var_id}|${e.tipo}|${e.intensidad}|${e.impulsivo ? 1 : 0}|${e.fecha}`),
    [events],
  );
  const interactionsSig = useMemo(
    () => buildCollectionSignature(interactions, (i) => `${i.id}|${i.persona_id}|${i.energia_resultante}|${i.respeto_percibido}|${i.fecha}`),
    [interactions],
  );
  const relationsSig = useMemo(
    () => (relations ? `${relations.length}:${relations[0]?.id ?? ''}:${relations[relations.length - 1]?.id ?? ''}` : 'none'),
    [relations],
  );
  const transactionsSig = useMemo(
    () => buildCollectionSignature(transactions, (t) => `${t.id}|${t.tipo}|${t.categoria}|${t.monto}|${t.impulsivo ? 1 : 0}|${t.fecha}`),
    [transactions],
  );
  const historicalEventsSig = useMemo(
    () => buildCollectionSignature(historicalEvents, (e) => `${e.id}|${e.var_id}|${e.tipo}|${e.intensidad}|${e.impulsivo ? 1 : 0}|${e.fecha}`),
    [historicalEvents],
  );
  const protocolsSig = useMemo(
    () => (protocols ? `${protocols.length}:${protocols[0]?.id ?? ''}:${protocols[protocols.length - 1]?.id ?? ''}` : 'none'),
    [protocols],
  );
  const calibrationScoresSig = useMemo(
    () => (calibrationScores ? `${calibrationScores.length}:${calibrationScores[0]?.id ?? ''}:${calibrationScores[calibrationScores.length - 1]?.id ?? ''}` : 'none'),
    [calibrationScores],
  );
  const lastGlobalStateSig = useMemo(
    () => (lastGlobalState ? `${lastGlobalState.id}:${lastGlobalState.estado_global}:${lastGlobalState.rpg_stats?.player_score ?? 0}` : 'none'),
    [lastGlobalState],
  );
  const calibrationMetaSig = useMemo(
    () => (calibrationMeta ? `${calibrationMeta.id}:${calibrationMeta.value ?? ''}` : 'none'),
    [calibrationMeta],
  );
  const modelFlagsSig = useMemo(
    () => (modelFlags ? `${modelFlags.id}:${modelFlags.value ?? ''}` : 'none'),
    [modelFlags],
  );
  const milestonesSig = useMemo(
    () => (milestones ? `${milestones.length}:${milestones.map(m => `${m.milestone_id}:${m.estado}:${m.fecha_objetivo}`).join('|')}` : 'none'),
    [milestones],
  );

  useEffect(() => {
    if (!uid || !playerProfile || !areas || !hormones || !impactMatrix || !variables) {
      return;
    }

    // Validez de fecha en origen: un único filtro aquí evita que cualquier
    // parseISO/differenceIn* aguas abajo produzca NaN (que se colaba por guards
    // como `dt < 0` y contaminaba efectos, deltas y promedios). Lo dañino se
    // descarta una sola vez en vez de defenderlo en ~15 sitios.
    const hasValidDate = (d?: string) => !!d && !Number.isNaN(parseISO(d).getTime());
    const safeEvents = (events ?? []).filter(e => hasValidDate(e.fecha));
    const safeInteractions = (interactions ?? []).filter(i => hasValidDate(i.fecha));
    const safeRelations = relations ?? [];
    const safeTransactions = (transactions ?? []).filter(t => hasValidDate(t.fecha));
    const safeHistoricalEvents = (historicalEvents ?? []).filter(e => hasValidDate(e.fecha));
    const safeCalibrationScores = (calibrationScores ?? []).filter(s => hasValidDate(s.fecha));
    const safeMilestones = milestones ?? [];
    const protocolById = new Map<string, { nombre?: string; pasos?: string }>();
    [...(protocols ?? []), ...(protocolPresets as any[])].forEach((p: any) => {
      const id = p?.protocolo_id || p?.id;
      if (!id) return;
      protocolById.set(id, { nombre: p?.nombre, pasos: p?.pasos });
    });
    const variableById = new Map(variables.map(v => [v.var_id, v]));

    const resolveEventVarId = (event: Event): string | null => {
      if (variableById.has(event.var_id)) return event.var_id;
      if (event.tipo === 'Protocolo') {
        const inferred = inferProtocolProxyVarId(event, protocolById, variableById);
        if (inferred) return inferred;
      }
      return null;
    };

    const effectiveImpactMatrix: ImpactMatrix[] = (() => {
      const map = new Map<string, ImpactMatrix>();
      (impactMatrix ?? []).forEach((im) => {
        map.set(`${im.var_id}::${im.hormone_id}`, im);
      });
      impactMatrixPresets.forEach((preset) => {
        const key = `${preset.var_id}::${preset.hormone_id}`;
        if (map.has(key)) return;
        map.set(key, {
          id: `preset_${preset.matrix_id}`,
          matrix_id: preset.matrix_id,
          var_id: preset.var_id,
          hormone_id: preset.hormone_id,
          effect_size: preset.effect_size,
          duration_hours: preset.duration_hours,
        });
      });

      // Safety net: every known variable should have at least one hormonal impact.
      variables.forEach((variable) => {
        const hasAnyImpact = [...map.values()].some((im) => im.var_id === variable.var_id);
        if (hasAnyImpact) return;
        buildHeuristicImpactsForVariable(variable).forEach((heur) => {
          map.set(`${heur.var_id}::${heur.hormone_id}`, heur);
        });
      });

      // Safety net: unknown event var_ids also receive hormonal effects.
      safeEvents.forEach((event) => {
        if (resolveEventVarId(event)) return;
        const hasAnyImpact = [...map.values()].some((im) => im.var_id === event.var_id);
        if (hasAnyImpact) return;
        const virtualVariable = buildVirtualVariableFromEvent(event);
        buildHeuristicImpactsForVariable(virtualVariable).forEach((heur) => {
          map.set(`${heur.var_id}::${heur.hormone_id}`, heur);
        });
      });

      return [...map.values()];
    })();
    const normalizedEvents = safeEvents.map((event) => ({
      ...event,
      effective_var_id: resolveEventVarId(event) || event.var_id,
    }));

    const currentDataSignature = JSON.stringify({
      events: buildCollectionSignature(normalizedEvents, (e) => `${e.id}|${e.var_id}|${e.effective_var_id}|${e.tipo}|${e.intensidad}|${e.impulsivo ? 1 : 0}|${e.fecha}`),
      interactions: buildCollectionSignature(safeInteractions, (i) => `${i.id}|${i.persona_id}|${i.energia_resultante}|${i.respeto_percibido}|${i.fecha}`),
      transactions: buildCollectionSignature(safeTransactions, (t) => `${t.id}|${t.tipo}|${t.categoria}|${t.monto}|${t.impulsivo ? 1 : 0}|${t.fecha}`),
      matrix: buildCollectionSignature(effectiveImpactMatrix, (im) => `${im.var_id}|${im.hormone_id}|${im.effect_size}|${im.duration_hours}`),
      hormones: buildCollectionSignature(hormones, (h) => `${h.id}|${h.hormone_id}|${h.baseline}`),
      areas: buildCollectionSignature(areas, (a) => `${a.id}|${a.area_id}|${a.umbral_critico}|${a.umbral_riesgo}`),
    });

    const now = new Date();
    const timeSinceLastWrite = now.getTime() - lastWriteTime.current;
    if (currentDataSignature === lastProcessedSignature.current && timeSinceLastWrite < MIN_WRITE_INTERVAL) {
      return;
    }
    // ¿Recálculo por datos nuevos o solo por paso del tiempo (timer/decay)?
    // En el segundo caso suavizamos más el score y no dejamos que la deriva
    // circadiana/farmacocinética lo arrastre cruzando umbrales de estado.
    const isDataUnchanged = lastDataSignature.current !== null && currentDataSignature === lastDataSignature.current;

    const baseSensitivity = getSensitivity(playerProfile);
    const calibration = calibrateSensitivityFromHistory(baseSensitivity, safeHistoricalEvents, safeCalibrationScores, variableById);
    const sensitivity = calibration.values;
    let clinicalV2Enabled = FORCE_ENABLE_CLINICAL_V2;
    if (modelFlags?.value) {
      try {
        const parsed = JSON.parse(modelFlags.value) as { clinical_v2_enabled?: boolean };
        if (!FORCE_ENABLE_CLINICAL_V2 && typeof parsed.clinical_v2_enabled === 'boolean') {
          clinicalV2Enabled = parsed.clinical_v2_enabled;
        }
      } catch {
        // Keep defaults when config payload is invalid.
      }
    }
    const variableContrib = new Map<string, { name: string; total: number; hoursRemaining: number }>();

    // ── Cronotipo circadiano ──────────────────────────────────────────────────
    // El cronotipo desplaza todos los picos hormonales: matutino (-2.5h) o
    // nocturno (+2.5h). Esto afecta la línea base circadiana y la amplificación
    // de eventos en función del momento del día.
    const chronotype = computeChronotype(playerProfile); // -1 nocturno · +1 matutino
    const chronoShiftHours = chronotype * 2.5; // matutino → picos más tempranos
    const nowHour = now.getHours();
    // Hora circadiana efectiva: desplaza la fase del reloj interno del usuario
    const circadianHour = ((nowHour + chronoShiftHours) % 24 + 24) % 24;

    // ── Adaptación hedónica ───────────────────────────────────────────────────
    // El cerebro desensibiliza la respuesta dopaminérgica al mismo estímulo
    // repetido. La 5ª sesión de doomscrolling vale menos que la 1ª; la misma
    // recompensa repite con potencia decreciente. Construimos un ranking
    // cronológico de ocurrencias por var_id y aplicamos tolerancia exponencial
    // solo a los canales de recompensa (DOPAMINA, SEROTONINA). El cortisol y
    // los efectos físicos no se adaptan — el daño es el daño.
    const eventOccurrenceRank = new Map<string, number>(); // eventId → rank (1-based)
    const varOccurrenceCount  = new Map<string, number>(); // var_id → total 7d
    [...normalizedEvents]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .forEach(event => {
        const key = event.effective_var_id || event.var_id;
        const prev = varOccurrenceCount.get(key) ?? 0;
        eventOccurrenceRank.set(event.id, prev + 1);
        varOccurrenceCount.set(key, prev + 1);
      });
    // Top-tolerance var for explanation modifiers
    let maxToleranceRank = 1;
    let maxToleranceVar  = '';
    varOccurrenceCount.forEach((rank, varId) => {
      if (rank > maxToleranceRank) { maxToleranceRank = rank; maxToleranceVar = varId; }
    });

    // Accumulated writes — sent as a batch to /api/data/computed at the end
    const writes: Array<{ collection: string; docId: string; data: Record<string, unknown> }> = [];

    const statsValues: Record<string, number> = {
      dopamina: 50,
      serotonina: 50,
      cortisol: 20,
      foco: 50,
      energia: 50,
      sueno: 50,
      conexion_social: 50,
      carga_dopaminergica: 10,
      player_score: 50,
    };

    hormones.forEach(h => {
      const hId = h.hormone_id;
      const statKey = HORMONE_TO_STATS_MAP[hId];
      const k = DECAY_K[String(statKey || '')] || 0.2;
      let totalEffect = 0;

      const relevantImpacts = effectiveImpactMatrix.filter(im => im.hormone_id === hId);
      const hEvents = normalizedEvents.filter(e => relevantImpacts.some(im => im.var_id === e.effective_var_id));

      hEvents.forEach(event => {
        const impact = relevantImpacts.find(im => im.var_id === event.effective_var_id);
        if (!impact) return;

        const variable = variableById.get(event.effective_var_id) || buildVirtualVariableFromEvent(event);
        const eventDate = parseISO(event.fecha);
        const dt = differenceInHours(now, eventDate);
        // `!(dt >= 0)` atrapa también NaN (fecha corrupta): `NaN < 0` es false y
        // dejaba pasar un NaN que contaminaba totalEffect y delta_24h.
        if (!(dt >= 0)) return;

        const delayHours = Math.max(0, (variable?.delay_dias || 0) * 24);
        if (dt < delayHours) return;

        const effectiveDt = dt - delayHours;
        const curveFactor = variableCurveResponse(variable, event.intensidad);
        const basePeak = impact.effect_size * curveFactor;
        const sensitivePeak = applySensitivity(String(statKey || ''), basePeak, sensitivity);
        const effectiveDuration = Math.max(1, impact.duration_hours, (variable?.duracion_dias || 0) * 24);

        // Plateau instantáneo + decaimiento exponencial.
        // El modelo de absorción con tMax causaba que los eventos recién registrados
        // tuvieran efecto ~0 (ya que dt=0 en el momento de logging), desconectando
        // visualmente los eventos de los KPIs del panel de control.
        let effectAtTime: number;
        if (effectiveDt <= effectiveDuration) {
          effectAtTime = sensitivePeak;
        } else {
          const timeAfterPeak = effectiveDt - effectiveDuration;
          effectAtTime = sensitivePeak * Math.exp(-k * timeAfterPeak);
        }

        // Circadiano aplicado a MEDIA fuerza sobre el efecto del evento. Antes se
        // aplicaba a tope aquí Y en el baseline (atenuado 0.35) → doble conteo que
        // hinchaba el vaivén intradía. Ahora una sola filosofía coherente.
        effectAtTime *= 1 + (circadianMultiplier(hId, circadianHour) - 1) * 0.5;

        // Tolerancia hedónica: los canales de recompensa se adaptan al estímulo repetido.
        // Dopamina: tasa alta (novedad efímera). Serotonina: tasa baja (contentamiento estable).
        // Efectos negativos o fisiológicos (cortisol, energía) NO se adaptan.
        if ((hId === 'DOPAMINA' || hId === 'SEROTONINA') && effectAtTime > 0) {
          const rank = eventOccurrenceRank.get(event.id) ?? 1;
          const adaptRate = hId === 'DOPAMINA' ? 0.18 : 0.08;
          effectAtTime *= Math.exp(-adaptRate * (rank - 1));
        }

        totalEffect += effectAtTime;

        const contribKey = event.effective_var_id || event.var_id;
        const prev = variableContrib.get(contribKey) || {
          name: variable?.var_nombre || contribKey,
          total: 0,
          hoursRemaining: 0,
        };
        const remaining = Math.max(0, effectiveDuration - effectiveDt);
        variableContrib.set(contribKey, {
          name: prev.name,
          total: prev.total + effectAtTime,
          hoursRemaining: Math.max(prev.hoursRemaining, remaining),
        });
      });

      const baseline = h.baseline || 50;
      const circadianBaseline = baseline * (1 + ((circadianMultiplier(hId, circadianHour) - 1) * 0.35));
      const finalLevel = clamp(Math.round(circadianBaseline + totalEffect));

      if (statKey && statKey in statsValues) {
        statsValues[statKey] = finalLevel;
      }

      writes.push({ collection: 'computed_hormones', docId: hId, data: {
        hormone_id: hId,
        current_level: finalLevel,
        delta_24h: Math.round(Number.isFinite(totalEffect) ? totalEffect : 0),
      } });
    });

    const s = statsValues;

    // ── Líneas Base Adaptativas ───────────────────────────────────────────────
    // El "neutro" de cada persona no es un humano hipotético con 50/50 en todo.
    // Es su propia historia de 30 días: quien lleva un mes con media=35 tiene el
    // eje HPA crónicamente activado y sus recursos cognitivos estructuralmente
    // deprimidos. Esta corrección sitúa todos los cascades posteriores en relación
    // al estado real del usuario, no a una referencia universal artificial.
    //
    // Coeficientes pequeños (máx ±14 pts a desviación extrema) para estabilidad:
    // los efectos de eventos dominan; el baseline contextualiza sin distorsionar.
    const scores30d = (calibrationScores ?? []).filter(ds => {
      const daysAgo = differenceInDays(now, parseISO(ds.fecha));
      return daysAgo >= 1 && daysAgo <= 30;
    });
    // Ponderación exponencial: días recientes pesan más (τ = 10 días)
    let wSum = 0; let wScoreSum = 0;
    scores30d.forEach(ds => {
      const daysAgo = differenceInDays(now, parseISO(ds.fecha));
      const w = Math.exp(-0.07 * (daysAgo - 1)); // día-1=1.0 · día-30≈0.12
      wSum += w;
      wScoreSum += (ds.score_total ?? 50) * w;
    });
    const mean30dScore = scores30d.length >= 5 ? wScoreSum / wSum : null;
    let dispositionalDeviation = 0; // expuesto como modifier

    if (mean30dScore !== null) {
      const dev = mean30dScore - 50; // −50 → debilitado crónico · +50 → sistema robusto
      dispositionalDeviation = dev;
      // Cortisol: inversamente proporcional (media baja → HPA elevado)
      // Resto de recursos: directamente proporcional
      s.cortisol            = clamp(s.cortisol            + dev * -0.35);
      s.serotonina          = clamp(s.serotonina          + dev *  0.28);
      s.dopamina            = clamp(s.dopamina            + dev *  0.22);
      s.energia             = clamp(s.energia             + dev *  0.20);
      s.foco                = clamp(s.foco                + dev *  0.20);
      s.conexion_social     = clamp(s.conexion_social     + dev *  0.15);
      s.carga_dopaminergica = clamp(s.carga_dopaminergica + dev * -0.18);
    }

    // ── Eustress vs Distress ──────────────────────────────────────────────────
    // El cortisol del ejercicio (eustress) es hormético: activa BDNF, endorfinas
    // y recuperación anabólica. El cortisol del conflicto (distress) suprime
    // serotonina, foco e inmunidad. Mismo biomarcador, mecanismos opuestos.
    // Hacemos un pase separado para cuantificar cada contribución.
    let eustressCortisolGain = 0;
    normalizedEvents.forEach(event => {
      const variable = variableById.get(event.effective_var_id) || variableById.get(event.var_id);
      if (!isEustressEvent(event, variable)) return;
      const cortisolImpacts = effectiveImpactMatrix.filter(
        im => im.var_id === event.effective_var_id && im.hormone_id === 'CORTISOL' && im.effect_size > 0,
      );
      cortisolImpacts.forEach(impact => {
        const dt = differenceInHours(now, parseISO(event.fecha));
        if (dt < 0) return;
        const effectiveDuration = Math.max(1, impact.duration_hours);
        const curveFactor = variableCurveResponse(variable, event.intensidad);
        const peakEffect = impact.effect_size * curveFactor;
        const eff = dt <= effectiveDuration
          ? peakEffect
          : peakEffect * Math.exp(-0.3 * (dt - effectiveDuration));
        if (eff > 0.5) eustressCortisolGain += eff;
      });
    });
    // Cap: el eustress puede explicar como máximo 75% del cortisol total
    eustressCortisolGain = Math.min(eustressCortisolGain, s.cortisol * 0.75);
    const distressCortisol = Math.max(0, s.cortisol - eustressCortisolGain);

    // Cascade de distress: solo el cortisol tóxico suprime los recursos cognitivos
    if (distressCortisol > 65) {
      const overload = distressCortisol - 65;
      s.serotonina = clamp(s.serotonina - (overload * 0.45));
      s.foco = clamp(s.foco - (overload * 0.55));
      s.energia = clamp(s.energia - (overload * 0.4));
    }
    // Recuperación anabólica del eustress: activa endorfinas, BDNF y neuroplasticidad
    if (eustressCortisolGain > 5) {
      const anabolicSignal = Math.tanh(eustressCortisolGain / 22);
      s.energia    = clamp(s.energia    + anabolicSignal * 9);
      s.serotonina = clamp(s.serotonina + anabolicSignal * 6);
      s.foco       = clamp(s.foco       + anabolicSignal * 5);
      s.dopamina   = clamp(s.dopamina   + anabolicSignal * 4);
    }
    if (s.dopamina > 75 && s.serotonina < 45) {
      const dysregulation = ((s.dopamina - 75) * (45 - s.serotonina)) / 100;
      s.carga_dopaminergica = clamp(s.carga_dopaminergica + (dysregulation * 1.4));
    }
    if (s[SLEEP_KEY] < 25) {
      const sleepDebt = 25 - s[SLEEP_KEY];
      s.cortisol = clamp(s.cortisol + (sleepDebt * 0.22));
      s.foco = clamp(s.foco - (sleepDebt * 0.28));
      s.energia = clamp(s.energia - (sleepDebt * 0.12));
    }

    // ── Deuda de sueño acumulada (7 noches) ──────────────────────────────────
    // Una sola noche mala se capta arriba. Esto detecta supresión crónica leve
    // que el modelo agudo ignora (ej. 7 noches con sueno=55 → deuda real).
    const sleepHormoneIds = new Set(['MELATONINA']);
    const sleepVarIds = new Set(
      effectiveImpactMatrix
        .filter(m => sleepHormoneIds.has(m.hormone_id))
        .map(m => m.var_id),
    );
    const NIGHTLY_IDEAL = 75;
    const NIGHTLY_BASELINE = 65; // punto de partida al estimar una noche CON datos
    let debtNumerator = 0;
    let debtDenominator = 0;
    for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
      const targetDate = format(subDays(now, daysAgo), 'yyyy-MM-dd');
      const dayEvents = safeEvents.filter(e => e.fecha.startsWith(targetDate));
      const nightEvents = dayEvents.filter(e => sleepVarIds.has(e.var_id));
      // "Sin datos = desconocido", NO "déficit". Antes una noche sin registro
      // contaba como deuda de 10 (75-65), penalizando a quien simplemente no
      // trackea el sueño (Van Dongen mide deuda sobre sueño REAL, no ausencia).
      if (nightEvents.length === 0) continue;
      const sleepImpact = nightEvents.reduce((acc, e) => {
        const matrix = effectiveImpactMatrix.find(
          m => m.var_id === e.var_id && sleepHormoneIds.has(m.hormone_id),
        );
        if (!matrix) return acc;
        const variable = variableById.get(e.var_id);
        const polarity = variable?.polaridad ?? 1;
        const x = Math.min(e.intensidad / 5, 1);
        const curveFactor = variable?.curva === 'Exponencial' ? x * x : x;
        return acc + (polarity * matrix.effect_size * curveFactor);
      }, 0);
      const nightSueno = clamp(NIGHTLY_BASELINE + sleepImpact * 12);
      const nightlyDeficit = Math.max(0, NIGHTLY_IDEAL - nightSueno);
      const ageWeight = Math.exp(-0.12 * (daysAgo - 1)); // noche-1=1.0, noche-7≈0.48
      debtNumerator += nightlyDeficit * ageWeight;
      debtDenominator += ageWeight;
    }
    const sleepDebtScore = clamp(debtDenominator > 0 ? debtNumerator / debtDenominator : 0);
    // Cascade crónica — adicional al cascade agudo (no duplicado)
    if (sleepDebtScore > 15) {
      const debtIntensity = (sleepDebtScore - 15) / 55; // 0 en umbral, 1 en máximo
      s.cortisol = clamp(s.cortisol + (debtIntensity * 7));
      s.foco = clamp(s.foco - (debtIntensity * 9));
      s.energia = clamp(s.energia - (debtIntensity * 6));
      s.serotonina = clamp(s.serotonina - (debtIntensity * 4));
    }
    (s as any).sleep_debt_score = Math.round(sleepDebtScore);

    // ── Ciclos Ultradianos de Foco (BRAC ~90 min) ────────────────────────────
    // El cerebro alterna naturalmente entre ventanas de alta arousal cognitivo
    // y valles de recuperación cada ~90 minutos. Forzar trabajo durante el valle
    // activa el eje HPA (cortisol de esfuerzo) y degrada el output cognitivo.
    // Respetar el valle → recarga pasiva. La posición en el ciclo se estima
    // desde la hora de despertar probable según el cronotipo.
    const estimatedWakeHour = 7.5 - chronotype * 1.5; // matutino≈6h · nocturno≈9h
    const nowMinutes = nowHour * 60 + now.getMinutes();
    const minutesSinceWake = Math.max(0, nowMinutes - estimatedWakeHour * 60);
    const bracCycleMin = minutesSinceWake % 90;
    const bracPhase = bracCycleMin / 90; // 0→1 dentro del ciclo actual

    // Activo = eventos recientes (últimas 2h) que no sean de sueño
    const recentlyActiveCount = safeEvents.filter(e => {
      const dt = differenceInHours(now, parseISO(e.fecha));
      if (dt < 0 || dt > 2) return false;
      return !/sue[ñn]|sleep|insom|melatonin|descanso nocturno/.test(
        `${e.var_id} ${e.contexto || ''}`.toLowerCase(),
      );
    }).length;
    const isCurrentlyActive = recentlyActiveCount > 0;

    // Amplitudes REDUCIDAS: la evidencia del BRAC en vigilia (vs sueño) es modesta
    // y la auditoría mostró que ±15 pts de foco cada 90 min eran demasiado. Fase de
    // pico extendida a 0.66 (~60 de 90 min) para casar con "primeros 60-70 min de
    // mayor alerta" (Kleitman).
    let bracFocusEffect  = 0;
    let bracEnergyEffect = 0;
    let bracCortisolEffect = 0;
    if (bracPhase <= 0.66) {
      // Ventana de pico: recursos cognitivos en ascenso/máximo
      const peakStrength = Math.sin((bracPhase / 0.66) * Math.PI);
      bracFocusEffect  = peakStrength * 4;
      bracEnergyEffect = peakStrength * 2.5;
    } else if (bracPhase >= 0.78) {
      // Valle de recuperación
      const troughDepth = (bracPhase - 0.78) / 0.22;
      if (isCurrentlyActive) {
        // Trabajar contra el ritmo → cortisol de esfuerzo
        bracFocusEffect    = -(troughDepth * 4);
        bracEnergyEffect   = -(troughDepth * 3);
        bracCortisolEffect =   troughDepth * 3;
      } else {
        // Respetando el valle → recarga pasiva
        bracFocusEffect  = troughDepth * 2;
        bracEnergyEffect = troughDepth * 2.5;
      }
    }
    if (bracFocusEffect   !== 0) s.foco    = clamp(s.foco    + bracFocusEffect);
    if (bracEnergyEffect  !== 0) s.energia = clamp(s.energia + bracEnergyEffect);
    if (bracCortisolEffect > 0)  s.cortisol = clamp(s.cortisol + bracCortisolEffect);

    // ── Jet Lag Social (SJL) ──────────────────────────────────────────────────
    // Cuando la hora actual está lejos del pico óptimo del cronotipo, el eje
    // HPA activa cortisol de alarma. Solo penaliza si el cronotipo es marcado
    // (|chronotype| > 0.25). Onset SUAVE (rampa desde ~5h) en vez de un escalón
    // en 6h que activaba la penalización de golpe.
    // NOTA: el SJL clínico (Roenneberg) se mide como diferencia del punto medio
    // del sueño entre días laborables/libres. Aquí lo aproximamos por hora-vs-pico
    // del cronotipo — es un proxy; lo ideal sería derivarlo de horas de sueño reales.
    const chronoOptimalPeak = 12 - chronotype * 3; // matutino=9h · neutro=12h · nocturno=15h
    const hoursFromOptimal = Math.min(
      Math.abs(nowHour - chronoOptimalPeak),
      24 - Math.abs(nowHour - chronoOptimalPeak),
    ); // distancia circular
    const sjlMagnitude = Math.abs(chronotype);
    const sjlRamp = Math.max(0, Math.min(1, (hoursFromOptimal - 5) / 8)); // 5h→0 … 13h→1
    const sjlIntensity = sjlMagnitude > 0.25 ? sjlRamp * sjlMagnitude : 0;
    const sjlActive = sjlIntensity > 0;
    if (sjlActive) {
      s.cortisol  = clamp(s.cortisol  + (sjlIntensity * 6));
      s.foco      = clamp(s.foco      - (sjlIntensity * 7));
      s.energia   = clamp(s.energia   - (sjlIntensity * 5));
      variableContrib.set('SJL_DRAIN', {
        name: `Jet lag circadiano (${chronotype > 0 ? 'matutino forzado tarde' : 'nocturno forzado temprano'})`,
        total: -(sjlIntensity * 7),
        hoursRemaining: 12,
      });
    }

    // Acoplamiento social (saturado): evita sobreescalado por volumen y centra respeto en neutral=5.
    const relationsByPersona = new Map(safeRelations.map(r => [r.persona_id, r]));
    let socialRaw = 0;
    safeInteractions.forEach((interaction) => {
      const relation = relationsByPersona.get(interaction.persona_id);
      const relationEnergyBias = (relation?.energia_neta ?? 0) * 0.45;
      const relationRespectBias = ((relation?.respeto ?? 5) - 5) * 0.6;
      const interactionEffect =
        (interaction.energia_resultante * 7) +
        (interaction.respeto_percibido * 5) +
        relationEnergyBias +
        relationRespectBias;
      socialRaw += interactionEffect;
    });

    const socialScale = Math.max(6, safeInteractions.length * 2.2);
    const socialSignal = tanhNorm(socialRaw, socialScale); // [-1,1]
    const socialNet = socialSignal * 12;
    if (socialNet !== 0) {
      s.conexion_social = clamp(s.conexion_social + (socialSignal * 18));
      s.serotonina = clamp(s.serotonina + (socialSignal * 10));
      s.cortisol = clamp(s.cortisol - (socialSignal * 8));
      if (socialNet < 0) {
        s.foco = clamp(s.foco + (socialSignal * 4));
      }
      variableContrib.set('SOCIAL_NET', {
        name: 'Energía social neta',
        total: socialNet,
        hoursRemaining: 24,
      });
    }

    // ── Soledad acumulativa ───────────────────────────────────────────────────
    // El modelo social captura interacciones registradas. Esto detecta la
    // AUSENCIA de contacto positivo — silencio prolongado que se acumula como
    // aislamiento aunque no haya eventos negativos explícitos.
    const lastPositiveInteraction = safeInteractions
      .filter(i => i.energia_resultante > 0)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const isColdStart = safeEvents.length < 15;
    const rawDaysSinceContact = lastPositiveInteraction
      ? Math.max(0, differenceInHours(now, parseISO(lastPositiveInteraction.fecha)) / 24)
      : isColdStart ? 0 : 7; // nuevos usuarios sin historial → no penalizar aislamiento

    // "Aislado" ≠ "no usa la app". Si el usuario no registra NADA (eventos,
    // interacciones, transacciones) desde hace >2 días, no inventamos aislamiento
    // durante su ausencia: congelamos la soledad en el nivel que tenía en su última
    // actividad. Solo acumula soledad nueva mientras está activo pero sin contacto
    // social positivo.
    const lastActivityMs = [
      ...safeEvents.map(e => e.fecha),
      ...safeInteractions.map(i => i.fecha),
      ...safeTransactions.map(t => t.fecha),
    ].reduce((max, d) => Math.max(max, parseISO(d).getTime()), 0);
    const daysSinceAnyActivity = lastActivityMs > 0
      ? Math.max(0, (now.getTime() - lastActivityMs) / (1000 * 60 * 60 * 24))
      : Infinity;
    const daysSincePositiveContact = daysSinceAnyActivity > 2
      ? Math.max(0, rawDaysSinceContact - daysSinceAnyActivity) // congelado en la última actividad
      : rawDaysSinceContact;                                     // activo → soledad en vivo
    if (daysSincePositiveContact > 2) {
      const lonelinessFactor = Math.min(1, (daysSincePositiveContact - 2) / 6); // 0 en día 2, 1 en día 8+
      const lonelinessDrain = tanhNorm(lonelinessFactor, 0.7) * lonelinessFactor;
      s.conexion_social = clamp(s.conexion_social - (lonelinessDrain * 22));
      s.serotonina = clamp(s.serotonina - (lonelinessDrain * 9));
      s.cortisol = clamp(s.cortisol + (lonelinessDrain * 5));
      if (lonelinessFactor > 0.3) {
        variableContrib.set('LONELINESS_DRAIN', {
          name: 'Aislamiento acumulado',
          total: -(lonelinessDrain * 22),
          hoursRemaining: 24,
        });
      }
    }

    // ── Red Social Tóxica y Anclajes Relacionales ────────────────────────────
    // La calidad estructural de la red importa más que el volumen de contacto.
    // Un "anclaje tóxico" (interacción frecuente + energía crónicamente negativa)
    // activa el HPA de forma sostenida incluso sin conflictos agudos explícitos.
    // La "deuda social" detecta cuando el presupuesto de contacto se gasta en
    // fuentes de drenaje — oportunidad perdida de conexión nutritiva.
    //
    // Requiere ≥2 interacciones con la misma persona para considerar patrón.
    const interactionSumByPersona = new Map<string, { totalEnergy: number; count: number }>();
    safeInteractions.forEach(interaction => {
      const prev = interactionSumByPersona.get(interaction.persona_id) ?? { totalEnergy: 0, count: 0 };
      interactionSumByPersona.set(interaction.persona_id, {
        totalEnergy: prev.totalEnergy + interaction.energia_resultante,
        count: prev.count + 1,
      });
    });

    let toxicAnchorLoad    = 0;
    let positiveAnchorLoad = 0;
    let toxicAnchorCount   = 0;
    let positiveAnchorCount = 0;
    let toxicInteractionCount = 0;

    interactionSumByPersona.forEach(({ totalEnergy, count }, personaId) => {
      if (count < 2) return;
      const relation = relationsByPersona.get(personaId);
      const relationBias = relation ? (relation.energia_neta ?? 0) * 0.3 : 0;
      const netEnergy = totalEnergy + relationBias;

      if (netEnergy < -3) {
        // Anclaje tóxico: intensidad × frecuencia (más contacto = mayor daño crónico)
        const toxicIntensity = Math.tanh((-netEnergy - 3) / 5);
        toxicAnchorLoad += toxicIntensity * (1 + count * 0.15);
        toxicAnchorCount++;
        toxicInteractionCount += count;
      } else if (netEnergy > 3) {
        const positiveIntensity = Math.tanh((netEnergy - 3) / 5);
        positiveAnchorLoad += positiveIntensity * (1 + count * 0.1);
        positiveAnchorCount++;
      }
    });

    // Deuda social: fracción del tiempo de contacto invertido en fuentes tóxicas
    const socialDebtRatio = safeInteractions.length > 0
      ? toxicInteractionCount / safeInteractions.length
      : 0;

    const toxicNetEffect    = toxicAnchorLoad    > 0 ? Math.tanh(toxicAnchorLoad    / 2) * (1 + socialDebtRatio * 0.5) : 0;
    const positiveNetEffect = positiveAnchorLoad > 0 ? Math.tanh(positiveAnchorLoad / 2) : 0;

    if (toxicNetEffect > 0.1) {
      s.cortisol        = clamp(s.cortisol        + toxicNetEffect * 7);
      s.serotonina      = clamp(s.serotonina      - toxicNetEffect * 5);
      s.conexion_social = clamp(s.conexion_social - toxicNetEffect * 8);
      variableContrib.set('TOXIC_ANCHOR', {
        name: `Anclaje tóxico relacional (${toxicAnchorCount} persona${toxicAnchorCount !== 1 ? 's' : ''})`,
        total: -(toxicNetEffect * 8),
        hoursRemaining: 48,
      });
    }

    if (positiveNetEffect > 0.1) {
      s.serotonina      = clamp(s.serotonina      + positiveNetEffect * 5);
      s.conexion_social = clamp(s.conexion_social + positiveNetEffect * 6);
      s.cortisol        = clamp(s.cortisol        - positiveNetEffect * 3);
      variableContrib.set('POSITIVE_ANCHOR', {
        name: `Anclaje relacional positivo (${positiveAnchorCount} persona${positiveAnchorCount !== 1 ? 's' : ''})`,
        total: positiveNetEffect * 6,
        hoursRemaining: 48,
      });
    }

    // Acoplamiento financiero (normalizado): usa ratios para mantener estabilidad entre perfiles.
    const income7d = safeTransactions
      .filter(t => t.tipo === 'Ingreso')
      .reduce((acc, t) => acc + Math.abs(Number(t.monto) || 0), 0);
    const expenses7d = safeTransactions
      .filter(t => t.tipo === 'Gasto')
      .reduce((acc, t) => acc + Math.abs(Number(t.monto) || 0), 0);
    const impulsiveSpend7d = safeTransactions
      .filter(t => t.tipo === 'Gasto' && t.impulsivo)
      .reduce((acc, t) => acc + Math.abs(Number(t.monto) || 0), 0);
    const debtPayments7d = safeTransactions
      .filter(t => t.tipo === 'Gasto' && t.categoria === 'Deudas')
      .reduce((acc, t) => acc + Math.abs(Number(t.monto) || 0), 0);
    const netCashflow7d = income7d - expenses7d;

    const expenseBase = Math.max(1, expenses7d);
    const flowBase = Math.max(1, Math.max(income7d, expenses7d));
    const impulsiveRatio = clamp(impulsiveSpend7d / expenseBase, 0, 2.5);
    const debtCommitmentRatio = clamp(debtPayments7d / expenseBase, 0, 2.5);
    const cashflowRatio = clamp(netCashflow7d / flowBase, -2.5, 2.5);

    const stressFromImpulsive = tanhNorm(impulsiveRatio, 0.65) * 12;
    const reliefFromDebtCommitment = tanhNorm(debtCommitmentRatio, 0.8) * 6;
    const stressFromNegativeFlow = netCashflow7d < 0 ? tanhNorm(Math.abs(cashflowRatio), 0.7) * 10 : 0;
    const reliefFromPositiveFlow = netCashflow7d > 0 ? tanhNorm(cashflowRatio, 0.7) * 8 : 0;

    s.carga_dopaminergica = clamp(s.carga_dopaminergica + stressFromImpulsive - (reliefFromPositiveFlow * 0.5));
    s.cortisol = clamp(s.cortisol + stressFromNegativeFlow + (stressFromImpulsive * 0.6) - (reliefFromDebtCommitment * 0.4) - (reliefFromPositiveFlow * 0.6));
    s.serotonina = clamp(s.serotonina + (reliefFromPositiveFlow * 0.5) + (reliefFromDebtCommitment * 0.35) - (stressFromNegativeFlow * 0.35));
    s.energia = clamp(s.energia - (stressFromNegativeFlow * 0.25) + (reliefFromPositiveFlow * 0.2));
    s.foco = clamp(s.foco - (stressFromImpulsive * 0.2) + (reliefFromPositiveFlow * 0.15));

    if (impulsiveSpend7d > 0) {
      variableContrib.set('FINANCE_IMPULSE', {
        name: 'Impulsividad financiera',
        total: -(stressFromImpulsive * 2.2),
        hoursRemaining: 36,
      });
    }
    if (netCashflow7d < 0) {
      variableContrib.set('FINANCE_FLOW', {
        name: 'Flujo de caja negativo',
        total: -(stressFromNegativeFlow * 2),
        hoursRemaining: 24,
      });
    } else if (netCashflow7d > 0) {
      variableContrib.set('FINANCE_FLOW', {
        name: 'Flujo de caja positivo',
        total: (reliefFromPositiveFlow * 1.6),
        hoursRemaining: 24,
      });
    }

    // ── Estrés Anticipatorio ─────────────────────────────────────────────────
    // Milestones próximos o vencidos crean cortisol anticipatorio. El cerebro
    // activa el eje HPA ante amenazas futuras igual que ante amenazas presentes.
    // Milestones completados recientemente generan dopamina de logro.
    let rawAnticipatoryLoad = 0;
    let rawCompletionBoost = 0;
    safeMilestones.forEach(m => {
      if (!m.fecha_objetivo) return;
      const daysUntil = differenceInDays(parseISO(m.fecha_objetivo), now);
      if (m.estado === 'Pendiente') {
        if (daysUntil >= 0 && daysUntil <= 14) {
          // Próximo: cortisol crece con la proximidad (cuadrático para simular urgencia)
          const proximity = 1 - daysUntil / 14;
          rawAnticipatoryLoad += proximity * proximity * 7;        // → 7 en el deadline
        } else if (daysUntil < 0 && daysUntil >= -10) {
          // Vencido sin completar: la culpa decae SUAVE hasta ~10 días. Antes había
          // un escalón (7→2 al cruzar el deadline) y un acantilado (10→0 a los -5/-6
          // días). Ahora es continuo con el pico anticipatorio y se desvanece gradual.
          const overdueFade = Math.max(0, 1 + daysUntil / 10);     // 1 justo vencido → 0 a -10d
          rawAnticipatoryLoad += overdueFade * 7.5;                // ligero exceso (culpa) sobre el pico
        }
      } else if (m.estado === 'Completado' && m.fecha_completado) {
        const daysSince = differenceInDays(now, parseISO(m.fecha_completado));
        if (daysSince >= 0 && daysSince <= 3) {
          // Completado reciente: dopamina de logro con decaimiento rápido
          rawCompletionBoost += (1 - daysSince / 4) * 5;
        }
      }
    });
    const anticipatoryCortisolEffect = Math.tanh(rawAnticipatoryLoad / 12) * 14;
    const completionDopamineEffect = Math.tanh(rawCompletionBoost / 8) * 10;
    if (anticipatoryCortisolEffect > 0) {
      s.cortisol = clamp(s.cortisol + anticipatoryCortisolEffect);
      s.foco = clamp(s.foco - anticipatoryCortisolEffect * 0.25);
      variableContrib.set('ANTICIPATORY_STRESS', {
        name: 'Estrés anticipatorio (milestones)',
        total: -anticipatoryCortisolEffect,
        hoursRemaining: 24,
      });
    }
    if (completionDopamineEffect > 0) {
      s.dopamina = clamp(s.dopamina + completionDopamineEffect);
      s.serotonina = clamp(s.serotonina + completionDopamineEffect * 0.4);
      variableContrib.set('COMPLETION_BOOST', {
        name: 'Dopamina de logro (milestone)',
        total: completionDopamineEffect,
        hoursRemaining: 48,
      });
    }

    // ── Carga cognitiva acumulada ────────────────────────────────────────────
    // NOTA: antes era "fatiga de decisiones" basada en ego depletion / "glucosa
    // prefrontal". Ese modelo FALLÓ la replicación (RRR Hagger 2016, 23 labs,
    // N=2141, d=0.04 IC[-0.07,0.15] — incluye el cero). Lo conservamos solo como
    // proxy descriptivo de "has hecho muchas cosas exigentes hoy", con peso
    // reducido, sin afirmar depleción de fuerza de voluntad.
    let totalDecisionLoad = 0;
    const eventsByHour = new Map<number, number>();

    normalizedEvents.forEach(event => {
      const dt = differenceInHours(now, parseISO(event.fecha));
      if (dt < 0 || dt > 24) return;
      const variable = variableById.get(event.effective_var_id) || variableById.get(event.var_id);
      const tipo = (variable?.tipo || '').toLowerCase();
      const area = (variable?.area_id || '').toUpperCase();
      const recencyWeight = Math.exp(-0.08 * dt); // más reciente = más fatigante
      let eventCost = 0.5;
      if (event.impulsivo)                                      eventCost += 1.5; // fallo de autocontrol = coste máximo
      if (tipo.includes('mental') || tipo.includes('financier')) eventCost += 1.0;
      if (tipo.includes('emocional') || tipo.includes('social')) eventCost += 0.8;
      if (area.includes('FINANZAS'))                            eventCost += 0.7;
      const intensityMult = 0.5 + (event.intensidad / 5) * 0.8;
      totalDecisionLoad += eventCost * intensityMult * recencyWeight;
      // Tracking para penalización de context-switching
      const hourBucket = Math.floor(dt);
      eventsByHour.set(hourBucket, (eventsByHour.get(hourBucket) ?? 0) + 1);
    });

    // Transacciones financieras del día (decisiones de dinero = alto coste prefrontal)
    safeTransactions.forEach(t => {
      const dt = differenceInHours(now, parseISO(t.fecha));
      if (dt < 0 || dt > 24) return;
      totalDecisionLoad += (t.impulsivo ? 2.0 : 1.0) * Math.exp(-0.08 * dt);
    });

    // Context switching: >2 eventos en la misma hora = coste adicional por cambio de tarea
    eventsByHour.forEach(count => {
      if (count > 2) totalDecisionLoad += (count - 2) * 0.4;
    });

    const decisionFatigueScore = Math.tanh(totalDecisionLoad / 15) * 100; // 0–100
    if (decisionFatigueScore > 10) {
      const fatigueIntensity = (decisionFatigueScore - 10) / 90;
      // Pesos muy reducidos (antes 14/6/8) por la débil evidencia del mecanismo.
      s.foco                = clamp(s.foco                - fatigueIntensity * 5);
      s.serotonina          = clamp(s.serotonina          - fatigueIntensity * 2);
      s.carga_dopaminergica = clamp(s.carga_dopaminergica + fatigueIntensity * 3);
      variableContrib.set('DECISION_FATIGUE', {
        name: 'Carga cognitiva acumulada',
        total: -(fatigueIntensity * 5),
        hoursRemaining: 12,
      });
    }

    // ── Regulación Emocional Adaptativa ──────────────────────────────────────
    // El eje HPA aprende por exposición: el mismo estresor repetido activa una
    // respuesta atenuada (habituación). Un estresor NUEVO sin historial previo
    // esquiva los circuitos de regulación y golpea con plena intensidad.
    const emotionalNegVarIds = new Set(
      variables
        .filter(v => (v.tipo === 'Emocional' || v.tipo === 'Social') && (v.polaridad ?? 1) < 0)
        .map(v => v.var_id),
    );
    // Ocurrencias de cada estresor emocional en los últimos 7 días
    const stressorOccurrences = new Map<string, number>();
    safeEvents.forEach(e => {
      if (!emotionalNegVarIds.has(e.var_id)) return;
      stressorOccurrences.set(e.var_id, (stressorOccurrences.get(e.var_id) ?? 0) + 1);
    });
    // Habituación: estresores vistos ≥2 veces → el eje HPA ya los "esperaba"
    let totalHabituationLoad = 0;
    stressorOccurrences.forEach(count => {
      if (count >= 2) totalHabituationLoad += Math.min(1, (count - 1) / 5);
    });
    const habituationEffect = Math.tanh(totalHabituationLoad / 2) * 10; // 0-10 pts
    // Novedad: estresores en últimas 72h que NO aparecen en el historial 4-30 días atrás
    const recentStressorIds = new Set(
      safeEvents
        .filter(e => emotionalNegVarIds.has(e.var_id) && differenceInHours(now, parseISO(e.fecha)) <= 72)
        .map(e => e.var_id),
    );
    const historicalStressorIds = new Set(
      safeHistoricalEvents.filter(e => {
        const dt = differenceInHours(now, parseISO(e.fecha));
        return dt > 72 && dt <= 720 && emotionalNegVarIds.has(e.var_id);
      }).map(e => e.var_id),
    );
    let novelStressorCount = 0;
    recentStressorIds.forEach(varId => { if (!historicalStressorIds.has(varId)) novelStressorCount++; });
    const noveltyEffect = Math.tanh(novelStressorCount / 3) * 8; // 0-8 pts
    // Aplicar: habituación alivia HPA; novedad lo amplifica
    if (habituationEffect > 0.5) {
      s.cortisol   = clamp(s.cortisol   - habituationEffect);
      s.serotonina = clamp(s.serotonina + habituationEffect * 0.4);
      variableContrib.set('HABITUATION_RELIEF', {
        name: 'Habituación emocional (estresores repetidos)',
        total: habituationEffect * 0.4,
        hoursRemaining: 24,
      });
    }
    if (noveltyEffect > 0.5) {
      s.cortisol   = clamp(s.cortisol   + noveltyEffect);
      s.serotonina = clamp(s.serotonina - noveltyEffect * 0.5);
      variableContrib.set('NOVELTY_STRESS', {
        name: 'Estrés de novedad (nuevo estresor emocional)',
        total: -(noveltyEffect),
        hoursRemaining: 36,
      });
    }

    // ── Momentum Conductual ───────────────────────────────────────────────────
    // Las rachas de hábitos crean momentum dopaminérgico anticipatorio.
    // Romper una racha genera una caída asimétrica: el crash supera la ganancia
    // acumulada día a día — replicando la asimetría de pérdida conductual (loss aversion).
    const habitVarSet = new Set(
      variables
        .filter(v => (v.tipo === 'Física' || (v.tipo as string) === 'FÃ­sica' || v.tipo === 'Mental') && (v.polaridad ?? 1) > 0)
        .map(v => v.var_id),
    );
    const isHabitEvent = (e: Event) => e.tipo === 'Protocolo' || habitVarSet.has(e.var_id);
    const allHabitSrc = [...safeEvents, ...safeHistoricalEvents];

    // Racha activa: días consecutivos hacia atrás desde ayer
    let activeStreak = 0;
    for (let d = 1; d <= 30; d++) {
      const target = format(subDays(now, d), 'yyyy-MM-dd');
      if (allHabitSrc.some(e => e.fecha.startsWith(target) && isHabitEvent(e))) activeStreak++;
      else break;
    }

    // ¿Se rompió la racha ayer?
    const yesterdayStr  = format(subDays(now, 1), 'yyyy-MM-dd');
    const dayBeforeStr  = format(subDays(now, 2), 'yyyy-MM-dd');
    const hadYesterday  = allHabitSrc.some(e => e.fecha.startsWith(yesterdayStr) && isHabitEvent(e));
    const hadDayBefore  = allHabitSrc.some(e => e.fecha.startsWith(dayBeforeStr) && isHabitEvent(e));

    let brokenStreakLength = 0;
    if (!hadYesterday && hadDayBefore) {
      for (let d = 2; d <= 30; d++) {
        const target = format(subDays(now, d), 'yyyy-MM-dd');
        if (allHabitSrc.some(e => e.fecha.startsWith(target) && isHabitEvent(e))) brokenStreakLength++;
        else break;
      }
    }

    // Racha activa ≥ 3 días → bonus dopaminérgico anticipatorio (satura en ~21 días)
    if (activeStreak >= 3) {
      const momentumStrength = Math.tanh(activeStreak / 7);
      s.dopamina   = clamp(s.dopamina   + momentumStrength * 8);
      s.serotonina = clamp(s.serotonina + momentumStrength * 4);
      variableContrib.set('STREAK_MOMENTUM', {
        name: `Momentum de racha (${activeStreak} días)`,
        total: momentumStrength * 8,
        hoursRemaining: 24,
      });
    }

    // Racha rota ≥ 3 días → crash asimétrico (1.6× amplificador de pérdida)
    if (brokenStreakLength >= 3) {
      const crashIntensity = Math.tanh(brokenStreakLength / 5) * 1.6;
      s.dopamina             = clamp(s.dopamina             - crashIntensity * 10);
      s.serotonina           = clamp(s.serotonina           - crashIntensity *  6);
      s.carga_dopaminergica  = clamp(s.carga_dopaminergica  + crashIntensity *  5);
      variableContrib.set('STREAK_BREAK', {
        name: `Racha rota (${brokenStreakLength} días perdidos)`,
        total: -(crashIntensity * 10),
        hoursRemaining: 48,
      });
    }

    // ── Carga Alostática Acumulada (crónica) ──────────────────────────────────
    // Operacionalización tipo Seeman et al. (2001): la carga alostática es el
    // CONTEO de biomarcadores en zona de riesgo. La carga CRÓNICA es ese conteo
    // sostenido en el tiempo. Antes esto leía `score_total` del historial → bucle
    // de retroalimentación (el score que el motor escribe se releía y se penalizaba
    // a sí mismo, pudiendo re-bloquear CRITICO). Ahora lee el `allostatic_index`
    // (conteo objetivo de biomarcadores), que NO deriva del player_score.
    const safeDailyScores = safeCalibrationScores;
    const HIGH_LOAD_THRESHOLD = 4; // ≥4 de 8 ejes en riesgo = día de carga alta
    let chronicLoadDays = 0;
    const recentByDate = [...safeDailyScores]
      .filter(ds => {
        const daysAgo = differenceInDays(now, parseISO(ds.fecha));
        return daysAgo >= 0 && daysAgo < 28;
      })
      .sort((a, b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime());
    // Cuenta días recientes consecutivos con índice de carga alto.
    for (const ds of recentByDate) {
      if ((ds.allostatic_index ?? 0) >= HIGH_LOAD_THRESHOLD) chronicLoadDays++;
      else break;
    }
    // 0 días = sin carga crónica · 14+ días sostenidos = saturación máxima
    const allostaticAccumulationScore = Math.min(1, chronicLoadDays / 14);
    if (allostaticAccumulationScore > 0) {
      s.cortisol   = clamp(s.cortisol   + allostaticAccumulationScore * 8); // HPA hiperreactivado
      s.serotonina = clamp(s.serotonina - allostaticAccumulationScore * 7); // depleción crónica
      s.energia    = clamp(s.energia    - allostaticAccumulationScore * 5); // fatiga estructural
      variableContrib.set('ALLOSTATIC_ACCUMULATION', {
        name: `Carga alostática crónica (${chronicLoadDays}d sostenidos)`,
        total: -(allostaticAccumulationScore * 8),
        hoursRemaining: 168,
      });
    }

    // ── Resiliencia Alocostática (buffer de 14 días) ─────────────────────────
    // Un historial consistente de hábitos positivos eleva el tono serotonérgico
    // basal, amplía la reserva mitocondrial y reduce la reactividad del eje HPA.
    // El buffer crece con días de acción positiva y se erosiona sin ellos.
    let positiveHabitDays = 0;
    for (let d = 1; d <= 14; d++) {
      const targetDate = format(subDays(now, d), 'yyyy-MM-dd');
      const dayEvents = safeHistoricalEvents.filter(e => e.fecha.startsWith(targetDate));
      const hasPositiveHabit = dayEvents.some(e => {
        const variable = variableById.get(e.var_id);
        const isPositive = (variable?.polaridad ?? 1) > 0;
        const isHabitType = (
          e.tipo === 'Protocolo' ||
          variable?.tipo === 'Física' || variable?.tipo === 'FÃ­sica' ||
          variable?.tipo === 'Mental'
        );
        return isPositive && isHabitType;
      });
      if (hasPositiveHabit) positiveHabitDays++;
    }
    // 0 días = sin buffer · 14 días = reserva máxima
    const resilienceBufferScore = positiveHabitDays / 14;
    if (resilienceBufferScore > 0.15) {
      const bufferIntensity = (resilienceBufferScore - 0.15) / 0.85;
      s.serotonina = clamp(s.serotonina + bufferIntensity * 7); // tono serotonérgico basal elevado
      s.energia    = clamp(s.energia    + bufferIntensity * 5); // reserva mitocondrial acumulada
      variableContrib.set('RESILIENCE_BUFFER', {
        name: `Buffer de resiliencia (${positiveHabitDays}/14 días)`,
        total: bufferIntensity * 7,
        hoursRemaining: 48,
      });
    }

    // ── Entropía Conductual y Variabilidad del Ritmo Vital ───────────────────
    // El cerebro usa la predictibilidad del entorno para calibrar el eje HPA.
    // Un patrón de vida caótico (alta varianza diaria en hábitos) es interpretado
    // como amenaza latente → cortisol basal elevado aunque no haya eventos negativos.
    // La monotonía extrema agota el sistema dopaminérgico por ausencia de novedad.
    // El ritmo óptimo es regular con varianza moderada: el "groove" conductual.
    //
    // Métricas:
    //   · SD > 2.5 → caos conductual: HPA activado por imprevisibilidad
    //   · SD < 0.5 (con media > 0) → monotonía rígida: depleción dopaminérgica
    //   · SD 0.5–2 → ritmo óptimo: serotonina estable, foco liberado
    const rhythmDailyCounts: number[] = [];
    for (let d = 1; d <= 14; d++) {
      const targetDate = format(subDays(now, d), 'yyyy-MM-dd');
      const dayPositive = safeHistoricalEvents.filter(e => {
        if (!e.fecha.startsWith(targetDate)) return false;
        const variable = variableById.get(e.var_id);
        const isPositive = (variable?.polaridad ?? 1) > 0;
        const isTracked  = e.tipo === 'Protocolo' || variable?.tipo === 'Física' || (variable?.tipo as string) === 'FÃ­sica' || variable?.tipo === 'Mental' || variable?.tipo === 'Conductual';
        return isPositive && isTracked;
      }).length;
      rhythmDailyCounts.push(dayPositive);
    }
    const rhythmMean = rhythmDailyCounts.reduce((s, c) => s + c, 0) / rhythmDailyCounts.length;
    const rhythmVariance = rhythmDailyCounts.reduce((s, c) => s + Math.pow(c - rhythmMean, 2), 0) / rhythmDailyCounts.length;
    const rhythmSD = Math.sqrt(rhythmVariance);

    let rhythmCortisolDelta  = 0;
    let rhythmSerotoninDelta = 0;
    let rhythmDopaminaDelta  = 0;
    let rhythmFocoDelta      = 0;
    let rhythmLabel          = 'neutro';

    if (rhythmSD > 2.5) {
      // Caos conductual: el eje HPA interpreta la imprevisibilidad como amenaza
      const chaosIntensity = Math.tanh((rhythmSD - 2.5) / 2);
      rhythmCortisolDelta  =  chaosIntensity * 7;
      rhythmSerotoninDelta = -chaosIntensity * 5;
      rhythmLabel = 'caótico';
      variableContrib.set('RHYTHM_CHAOS', {
        name: 'Caos conductual (ritmo vital irregular)',
        total: -(chaosIntensity * 7),
        hoursRemaining: 24,
      });
    } else if (rhythmSD < 0.5 && rhythmMean > 0.5) {
      // Monotonía rígida: mismos estímulos, misma hora → habituación dopaminérgica
      const rigidityIntensity = Math.tanh((0.5 - rhythmSD) * 4);
      rhythmDopaminaDelta = -rigidityIntensity * 4;
      rhythmLabel = 'monótono';
    } else if (rhythmSD >= 0.5 && rhythmSD <= 2.0 && rhythmMean >= 1) {
      // Ritmo óptimo: regularidad predecible con variedad saludable
      const grooveStrength = Math.tanh((rhythmMean - 1) / 2) * (1 - Math.abs(rhythmSD - 1.25) / 1.25);
      rhythmSerotoninDelta = Math.max(0, grooveStrength) * 5;
      rhythmFocoDelta      = Math.max(0, grooveStrength) * 4;
      rhythmLabel = 'óptimo';
      if (rhythmSerotoninDelta > 0.5) {
        variableContrib.set('RHYTHM_GROOVE', {
          name: 'Ritmo vital óptimo (regularidad conductual)',
          total: rhythmSerotoninDelta + rhythmFocoDelta,
          hoursRemaining: 24,
        });
      }
    }

    if (rhythmCortisolDelta  !== 0) s.cortisol   = clamp(s.cortisol   + rhythmCortisolDelta);
    if (rhythmSerotoninDelta !== 0) s.serotonina = clamp(s.serotonina + rhythmSerotoninDelta);
    if (rhythmDopaminaDelta  !== 0) s.dopamina   = clamp(s.dopamina   + rhythmDopaminaDelta);
    if (rhythmFocoDelta      !== 0) s.foco       = clamp(s.foco       + rhythmFocoDelta);

    // ── Acoplamiento Neuroquímico Bidireccional ───────────────────────────────
    // Los ejes biológicos no son canales paralelos independientes: se modulan
    // entre sí de forma no lineal. Este pase lee el estado post-cascada y aplica
    // las interacciones cruzadas de forma SIMULTÁNEA (no secuencial) para evitar
    // artefactos de orden. Cada delta se calcula del estado actual, luego se aplica todo a la vez.
    //
    //  · Cortisol crónico → suprime síntesis de serotonina (TPH2 inhibición)
    //  · Serotonina baja  → desinhibición dopaminérgica impulsiva (↑ carga)
    //  · Dopamina baja    → cortisol compensatorio anhedónico (alarma sin recompensa)
    //  · Conexión social  → tampón HPA (oxitocina atenúa reactividad de amígdala)
    //  · Carga dopa alta  → supresión PFC adicional (downregulation de receptores D1)
    //  · Energía colapso  → cortisol de emergencia (arousal de supervivencia)
    let ncΔcortisol = 0; let ncΔserotonina = 0; let ncΔfoco = 0; let ncΔcarga = 0;

    // 1. Cortisol crónico suprime síntesis de serotonina (TPH2 — umbral 55)
    if (s.cortisol > 55)       ncΔserotonina -= (s.cortisol - 55) * 0.18;
    // 2. Serotonina baja → desinhibición dopaminérgica impulsiva (umbral 40)
    if (s.serotonina < 40)     ncΔcarga      += (40 - s.serotonina) * 0.15;
    // 3. Dopamina baja → cortisol compensatorio anhedónico (umbral 35)
    if (s.dopamina < 35)       ncΔcortisol   += (35 - s.dopamina) * 0.12;
    // 4. Conexión social alta → tampón HPA por oxitocina (umbral 60)
    if (s.conexion_social > 60) ncΔcortisol  -= (s.conexion_social - 60) * 0.10;
    // 5. Carga dopaminérgica alta → downregulation D1/PFC (umbral 60)
    if (s.carga_dopaminergica > 60) ncΔfoco  -= (s.carga_dopaminergica - 60) * 0.12;
    // 6. Colapso energético → cortisol de emergencia/arousal (umbral 30)
    if (s.energia < 30)        ncΔcortisol   += (30 - s.energia) * 0.10;

    // Aplicar todos los deltas simultáneamente (estado pre-acoplamiento como referencia)
    s.cortisol            = clamp(s.cortisol            + ncΔcortisol);
    s.serotonina          = clamp(s.serotonina          + ncΔserotonina);
    s.foco                = clamp(s.foco                + ncΔfoco);
    s.carga_dopaminergica = clamp(s.carga_dopaminergica + ncΔcarga);

    const ncMagnitude = Math.abs(ncΔcortisol) + Math.abs(ncΔserotonina) + Math.abs(ncΔfoco) + Math.abs(ncΔcarga);
    if (ncMagnitude > 1) {
      variableContrib.set('NEURO_COUPLING', {
        name: 'Acoplamiento neuroquímico cruzado',
        total: -(ncΔcortisol + Math.abs(ncΔserotonina) * 0.5),
        hoursRemaining: 12,
      });
    }

    // ── Farmacocinética: Cascadas Metabólicas Secundarias ────────────────────
    // Los eventos generan metabolitos y señales secundarias con delay biológico
    // propio — independientes del efecto primario ya procesado en el bucle hormonal.
    // Tres cascadas clave modeladas con ventanas gaussianas (pico + σ):
    //
    //  1. Dopamina pico → activación noradrenérgica (foco +6, ventana 2-4h post)
    //     Neurobiología: DA→NE via DBH; NE activa corteza prefrontal y locus coeruleus.
    //
    //  2. Estrés agudo → supresión serotoninérgica tardía (serotonina -5, ventana 6-14h post)
    //     Neurobiología: cortisol crónico inhibe TPH2 (síntesis 5-HT); el efecto es retardado
    //     porque depende de la concentración acumulada, no del pico agudo.
    //
    //  3. Ejercicio hormético → BDNF/endorfinas (energía +5, serotonina +3, ventana 1-3h post)
    //     Neurobiología: el BDNF se sintetiza 60-90 min post-esfuerzo; endorfinas duran ~2h.
    let pkFocusBoost     = 0;
    let pkSerotoninDrain = 0;
    let pkExerciseBoost  = 0;

    normalizedEvents.forEach(event => {
      const dt = differenceInHours(now, parseISO(event.fecha));
      if (dt < 0 || dt > 24) return;
      const variable = variableById.get(event.effective_var_id) || variableById.get(event.var_id);
      const intensityScale = clamp(event.intensidad / 5, 0.2, 1);

      // Cascada 1: evento de alta dopamina → noradrenalina retardada (pico 3h, σ=1.5h)
      const hasDopamineSpike = effectiveImpactMatrix.some(
        im => im.var_id === event.effective_var_id && im.hormone_id === 'DOPAMINA' && im.effect_size > 6,
      );
      if (hasDopamineSpike && dt >= 1.5 && dt <= 7) {
        const gaussianPeak = Math.exp(-0.5 * Math.pow((dt - 3) / 1.5, 2));
        pkFocusBoost += gaussianPeak * intensityScale * 5;
      }

      // Cascada 2: estrés agudo distress → supresión serotoninérgica tardía (pico 9h, σ=2.5h)
      const isAcuteDistressEvent = !isEustressEvent(event, variable) &&
        effectiveImpactMatrix.some(
          im => im.var_id === event.effective_var_id && im.hormone_id === 'CORTISOL' && im.effect_size > 0,
        );
      if (isAcuteDistressEvent && dt >= 4 && dt <= 16) {
        const gaussianPeak = Math.exp(-0.5 * Math.pow((dt - 9) / 2.5, 2));
        pkSerotoninDrain += gaussianPeak * intensityScale * 4;
      }

      // Cascada 3: ejercicio hormético → BDNF/endorfinas (pico 1.5h, σ=1h)
      if (isEustressEvent(event, variable) && dt >= 0.5 && dt <= 5) {
        const gaussianPeak = Math.exp(-0.5 * Math.pow((dt - 1.5) / 1, 2));
        pkExerciseBoost += gaussianPeak * intensityScale * 4;
      }
    });

    const pkFocusFinal     = pkFocusBoost     > 0.3 ? Math.tanh(pkFocusBoost / 3)     * 6 : 0;
    const pkSerotoninFinal = pkSerotoninDrain > 0.3 ? Math.tanh(pkSerotoninDrain / 3)  * 5 : 0;
    const pkExerciseFinal  = pkExerciseBoost  > 0.3 ? Math.tanh(pkExerciseBoost / 2)   * 5 : 0;

    if (pkFocusFinal > 0)     s.foco       = clamp(s.foco       + pkFocusFinal);
    if (pkSerotoninFinal > 0) s.serotonina = clamp(s.serotonina - pkSerotoninFinal);
    if (pkExerciseFinal > 0) {
      s.energia    = clamp(s.energia    + pkExerciseFinal);
      s.serotonina = clamp(s.serotonina + pkExerciseFinal * 0.6);
    }

    const pkTotalMagnitude = pkFocusFinal + pkSerotoninFinal + pkExerciseFinal;
    if (pkTotalMagnitude > 0.5) {
      variableContrib.set('PK_METABOLITES', {
        name: 'Cascadas metabólicas secundarias',
        total: pkFocusFinal - pkSerotoninFinal + pkExerciseFinal,
        hoursRemaining: 6,
      });
    }

    // ── Ritmo Circadiano de Cortisol (CAR) ───────────────────────────────────
    // El cortisol tiene un pico fisiológico al despertar (Cortisol Awakening Response)
    // de ~20-40 puntos sobre el resting baseline. Es funcional, no patológico.
    // El mismo nivel a las 11pm es una señal de desregulación del eje HPA.
    // Este bloque: (a) exime el CAR matutino del cascade de distress,
    //             (b) amplifica el exceso de cortisol nocturno.
    const hoursAwakeCAR = Math.max(0, nowHour - (7.5 - chronotype * 1.5));
    // CAR clínico (Pruessner/Wüst): NO es una exención que decae toda la mañana,
    // es un PICO que sube tras despertar, alcanza el máximo a los ~30-45 min y
    // vuelve a baseline hacia las 2h. Modelado como gaussiana centrada en +0.5h
    // (σ≈0.6h, amplitud ~28 ≈ aumento medio del 50% reportado). Esto elimina el
    // "acantilado matutino" que la exención exponencial de 14h provocaba.
    const physioCortisolContrib = 28 * Math.exp(-Math.pow(hoursAwakeCAR - 0.5, 2) / (2 * 0.6 * 0.6));
    // Amplificador nocturno: cortisol elevado de noche → desregulación HPA.
    // Ventana SUAVE (rampa 22→23.5 de entrada, 3.5→5 de salida) en vez de un
    // escalón duro a las 23:00 que movía el cortisol de golpe al cambiar la hora
    // (uno de los "cambios bruscos" reportados).
    const nightWindow = (() => {
      if (nowHour >= 22) return Math.min(1, (nowHour - 22) / 1.5);     // 22→0 … 23.5→1
      if (nowHour <= 5)  return Math.min(1, Math.max(0, (5 - nowHour) / 1.5)); // 3.5→1 … 5→0
      return 0;
    })();
    let nightAmplifierActive = false;
    if (nightWindow > 0 && s.cortisol > 45) {
      const nightExcess = s.cortisol - 45;
      s.cortisol   = clamp(s.cortisol   + nightExcess * 0.25 * nightWindow); // amplifica el exceso
      s.serotonina = clamp(s.serotonina - nightExcess * 0.15 * nightWindow); // desregulación melatonina/serotonina
      nightAmplifierActive = true;
    }

    // ── Resonancia Sistémica ──────────────────────────────────────────────────
    // Cuando múltiples ejes biológicos colapsan simultáneamente, el daño es
    // sinérgico (no aditivo). Captura patrones que las métricas individuales pierden.
    //
    // 4 ejes (0=sano, 1=colapsado):
    //   Amenaza   : cortisol + carga_dopaminergica
    //   Recuperación: serotonina + sueno + energia
    //   Cognitivo : foco + dopamina
    //   Social    : conexion_social
    //
    // Acoplamiento pairwise multiplicativo → solo es severo cuando AMBOS están mal.
    // Multiplicador de sinergia escala el acoplamiento según cuántos ejes están en crisis.
    // Distress cortisol = total cortisol minus physiological exemptions:
    //   - eustressCortisolGain: beneficial cortisol from exercise/hormetic stress
    //   - physioCortisolContrib: expected morning CAR peak (functional, not pathological)
    const finalDistressCortisol = Math.max(0, s.cortisol - eustressCortisolGain - physioCortisolContrib);
    const threatStress    = (finalDistressCortisol / 100) * 0.6 + (s.carga_dopaminergica / 100) * 0.4;
    const recoveryStress  = 1 - ((s.serotonina / 100) * 0.35 + (s[SLEEP_KEY] / 100) * 0.35 + (s.energia / 100) * 0.3);
    const cognitiveStress = 1 - ((s.foco / 100) * 0.55 + (s.dopamina / 100) * 0.45);
    const socialStress    = 1 - (s.conexion_social / 100);

    const baseResonance =
      (threatStress * recoveryStress  * 0.40) +
      (threatStress * cognitiveStress * 0.25) +
      (recoveryStress * socialStress  * 0.20) +
      (cognitiveStress * socialStress * 0.15);

    const axesOverloaded = [threatStress, recoveryStress, cognitiveStress, socialStress]
      .filter(v => v > 0.62).length;
    // 0-1 ejes: sin sinergia · 2: +40% · 3: +80% · 4: +120%
    const SYNERGY_MULT = [1.0, 1.0, 1.4, 1.8, 2.2];
    const synergyMult = SYNERGY_MULT[Math.min(axesOverloaded, 4)];

    const systemicResonance = clamp(baseResonance * synergyMult * 100);
    (s as any).systemic_resonance = Math.round(systemicResonance);

    // Penalización directa al score (máx -15 pts a resonancia plena)
    const resonancePenalty = systemicResonance > 25
      ? ((systemicResonance - 25) / 75) * 15
      : 0;

    const resources =
      (s.dopamina * 0.18) +
      (s.serotonina * 0.18) +
      (s.foco * 0.18) +
      (s.energia * 0.18) +
      (s[SLEEP_KEY] * 0.18) +
      (s.conexion_social * 0.1);

    const load =
      (s.cortisol * 0.65) +
      (s.carga_dopaminergica * 0.35);

    // Índice de carga alostática (operacionalización tipo Seeman et al. 2001):
    // CONTEO de biomarcadores en zona de riesgo (cuartil de mayor riesgo), 0–8.
    // Discreto e interpretable ("X de 8 ejes en riesgo") en vez de un continuo.
    const allostaticRiskFlags = [
      finalDistressCortisol > 70,        // cortisol de distress alto
      s.carga_dopaminergica > 65,        // saturación dopaminérgica
      s[SLEEP_KEY] < 35,                 // sueño deficiente
      s.serotonina < 35,                 // tono serotonérgico bajo
      s.energia < 35,                    // energía baja
      s.dopamina < 35,                   // motivación baja
      s.foco < 35,                       // control ejecutivo bajo
      s.conexion_social < 35,            // buffer social bajo
    ];
    const allostaticLoadIndex = allostaticRiskFlags.filter(Boolean).length; // 0–8
    // Penalización al score: ~2.75 pts por eje en riesgo (máx 22 a 8 ejes),
    // atenuada por el buffer de resiliencia (un baseline sano absorbe mejor).
    const allostaticLoad = allostaticLoadIndex * 2.75 * (1 - resilienceBufferScore * 0.4);

    const recoveryReserveRaw =
      (Math.max(0, s.serotonina - 55) * 0.22) +
      (Math.max(0, s.energia - 55) * 0.24) +
      (Math.max(0, s.conexion_social - 55) * 0.16);
    // Resilience buffer expands the recovery ceiling; chronic accumulation compresses it
    const recoveryReserve = Math.min(14 * (1 + resilienceBufferScore * 0.6), recoveryReserveRaw)
      * (1 - allostaticAccumulationScore * 0.55);

    // ── Modelo Clínico V2 (segunda opinión → modula rawPlayerScore) ──────────
    // Calcula antes de rawPlayerScore para que su riesgo retroalimente el score.
    // Usa los mismos stats post-cascada; no depende de player_score.
    const clinicalV2 = computeClinicalModelV2({
      enabled: clinicalV2Enabled,
      stats: s as unknown as RPGStats,
      events7d: safeEvents.length,
      interactions7d: safeInteractions.length,
      transactions7d: safeTransactions.length,
      calibrationConfidence: calibration.confidence,
    });

    // Fuente ÚNICA de verdad del modo aprendizaje: pocos eventos O baja calidad
    // de datos. Se persiste en el doc (is_learning_mode) y la UI lo consume tal
    // cual, en vez de re-derivarlo con un criterio distinto que podría discrepar.
    const isLearningMode = isColdStart || (clinicalV2?.data_quality ?? 0) < 0.2;

    // Penalización clínica: activa cuando riskScore > 55 con confianza suficiente.
    // Máx -10 pts. Confianza parcial reduce el efecto proporcionalmente.
    const clinicalPenalty = (() => {
      if (!clinicalV2?.enabled) return 0;
      const { risk_score, confidence } = clinicalV2;
      if (risk_score <= 55 || confidence < 0.4) return 0;
      const raw = ((risk_score - 55) / 45) * 10;
      return raw * Math.min(1, confidence / 0.7);
    })();

    const rawPlayerScore = clamp(Math.round(resources - load - allostaticLoad - resonancePenalty - clinicalPenalty + recoveryReserve + 50));
    const storedPrevScore = lastGlobalState?.rpg_stats?.player_score;
    // `?? ` no atrapa NaN: un score corrupto guardado por un run anterior se
    // autoperpetuaría a través del EMA. Exigimos un número finito.
    const previousScore = Number.isFinite(storedPrevScore) ? (storedPrevScore as number) : rawPlayerScore;
    const hasPriorState = Number.isFinite(storedPrevScore);

    // ── Bucle de retroalimentación conductual ────────────────────────────────
    // Un sistema ya debilitado enfrenta mayor resistencia para recuperarse:
    // la fatiga reduce adherencia a hábitos → espiral descendente autocumplida.
    // Un sistema robusto amplifica los mismos inputs → compounding positivo.
    // Opera sobre rawScore antes del EMA (máx ±5 pts) para capturar inercia
    // sin dominar sobre los datos reales del período actual.
    const prevScoreNorm  = (previousScore - 50) / 50; // -1 a +1
    // Sin estado previo real, previousScore == rawPlayerScore: no hay inercia que
    // capturar y dispararía un falso castigo/bonus en el primer cálculo.
    const downwardSpiral = hasPriorState && prevScoreNorm < -0.1 && rawPlayerScore < 50;
    const upwardSpiral   = hasPriorState && prevScoreNorm >  0.2 && rawPlayerScore > 60;
    let feedbackAdjustment = 0;
    if (downwardSpiral) {
      const spiralIntensity = Math.abs(prevScoreNorm) * ((50 - rawPlayerScore) / 50);
      feedbackAdjustment = -(spiralIntensity * 5); // máx -5 pts
    } else if (upwardSpiral) {
      const momentumIntensity = prevScoreNorm * ((rawPlayerScore - 60) / 40);
      feedbackAdjustment = Math.max(0, momentumIntensity * 4); // máx +4 pts
    }
    const adjustedRawScore = clamp(rawPlayerScore + feedbackAdjustment);

    // Sin datos nuevos (tick del timer / decay), el EMA es mucho más conservador:
    // 0.85·previo + 0.15·raw evita que la deriva temporal mueva el score lo
    // suficiente para cruzar umbrales y provocar parpadeo de estado y escrituras.
    const emaPrevWeight = isDataUnchanged ? 0.85 : 0.55;
    const player_score = clamp(Math.round((previousScore * emaPrevWeight) + (adjustedRawScore * (1 - emaPrevWeight))));
    // Velocity proxy: single-step EMA delta as a rapid-fall signal
    const velocityProxy = player_score - previousScore;
    const velocityWarningRaw = !isLearningMode && velocityProxy <= -5 && player_score >= 40 && player_score < 57;
    // Exige confirmación: solo escala a RIESGO si la señal de caída rápida persiste
    // en DOS recálculos consecutivos. Un único bajón puntual (ruido del EMA / deriva)
    // arma la señal pero no cambia el estado hasta confirmarse.
    const isVelocityWarning = velocityWarningRaw && (lastGlobalState?.velocity_warning ?? false);
    // Clinical V2 state escalation
    const clinicalEscalation = !!(clinicalV2?.enabled &&
      (clinicalV2.confidence ?? 0) >= 0.5 &&
      (clinicalV2.risk_band === 'HIGH' || clinicalV2.risk_band === 'SEVERE'));
    s.player_score = player_score;

    let is_locked = false;
    let lock_reason = '';
    let force_critical = false;

    if (finalDistressCortisol >= 85 && s.energia <= 22) {
      force_critical = true;
      lock_reason = 'CORTISOL_OVERLOAD_ENERGY_COLLAPSE';
    } else if (s[SLEEP_KEY] <= 12 && s.foco <= 20) {
      force_critical = true;
      lock_reason = 'SLEEP_DEPRIVATION_COLLAPSE';
    } else if (sleepDebtScore >= 55 && s.energia <= 28) {
      force_critical = true;
      lock_reason = 'CHRONIC_SLEEP_DEBT_COLLAPSE';
    } else if (s.carga_dopaminergica >= 85 && s.dopamina <= 35) {
      force_critical = true;
      lock_reason = 'DOPAMINE_SATURATION_COLLAPSE';
    } else if (s.serotonina <= 25 && s.cortisol >= 70) {
      force_critical = true;
      lock_reason = 'AFFECTIVE_INSTABILITY_COLLAPSE';
    } else if (systemicResonance >= 72) {
      force_critical = true;
      lock_reason = 'SYSTEMIC_RESONANCE_COLLAPSE';
    } else if (clinicalV2?.risk_band === 'SEVERE' && (clinicalV2.confidence ?? 0) >= 0.6) {
      force_critical = true;
      lock_reason = 'CLINICAL_V2_SEVERE_RISK';
    } else if (allostaticAccumulationScore >= 0.75 && s.serotonina <= 30) {
      force_critical = true;
      lock_reason = 'CHRONIC_ALLOSTATIC_OVERLOAD';
    } else {
      const lowResources = [s.dopamina, s.serotonina, s.foco, s.energia, s[SLEEP_KEY]].filter(v => v <= 30).length;
      if (lowResources >= 3) {
        force_critical = true;
        lock_reason = 'MULTIVARIABLE_RESOURCE_COLLAPSE';
      }
    }

    const lastStoredScore = lastGlobalState?.rpg_stats?.player_score || 0;
    const currentGlobalState = lastGlobalState?.estado_global || 'OK';
    let nextState: OverallState = 'OK';

    // Máquina de estados con histéresis real (banda muerta 62↔70) para evitar
    // parpadeo en el límite. La estructura por estado-actual garantiza que las
    // bandas de entrada/salida no se solapen:
    //   · entra a RIESGO desde OK    cuando score < 62 (o señal de alerta)
    //   · sale  de RIESGO hacia OK   solo cuando score >= 70 y sin alertas
    //   · CRITICO de-escala a RIESGO cuando score > 48 y sin colapso forzado
    const escalationSignal = isVelocityWarning || clinicalEscalation;

    if (player_score < 40 || force_critical) {
      nextState = 'CRITICO';
    } else if (currentGlobalState === 'CRITICO') {
      nextState = player_score > 48 ? 'RIESGO' : 'CRITICO';
    } else if (currentGlobalState === 'RIESGO') {
      nextState = (player_score >= 70 && !escalationSignal) ? 'OK' : 'RIESGO';
    } else {
      // currentGlobalState === 'OK'
      nextState = (player_score < 62 || escalationSignal) ? 'RIESGO' : 'OK';
    }

    // Modo aprendizaje: doc internamente consistente — sin colapso ni lock.
    if (isLearningMode) {
      nextState = 'OK';
      force_critical = false;
      lock_reason = '';
    }
    if (nextState === 'CRITICO') is_locked = true;

    const scoreDiff = Math.abs(player_score - lastStoredScore);

    // Si los datos no han cambiado (tick del timer / decay), suprimimos la
    // escritura salvo que el estado cambie o la deriva sea ≥3 pts. Antes este
    // guard miraba lastProcessedSignature, que el timer anula → nunca suprimía,
    // y cada tick de 15 min persistía la deriva circadiana (el "cambia solo").
    if (isDataUnchanged) {
      if (scoreDiff < 3 && nextState === currentGlobalState) {
        return;
      }
    }

    const estimated_unlock_hours = Math.round(
      (Math.max(0, s.cortisol - 65) * 0.5) +
      (Math.max(0, 30 - s[SLEEP_KEY]) * 0.4) +
      (Math.max(0, s.carga_dopaminergica - 70) * 0.3),
    );

    const variableEntries = [...variableContrib.entries()].map(([var_id, value]) => ({ var_id, ...value }));
    const dominant_drain_vars_7d: DominantVariableInfo[] = variableEntries
      .filter(v => v.total < 0)
      .sort((a, b) => a.total - b.total)
      .slice(0, 5)
      .map(v => ({
        var_id: v.var_id,
        nombre: v.name,
        hours_remaining: Math.round(v.hoursRemaining),
        total_impact: Math.round(v.total),
      }));

    const dominant_gain_vars_7d = variableEntries
      .filter(v => v.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(v => v.name);

    const primaryCause = isLearningMode
      ? 'LEARNING_MODE'
      : lock_reason ||
        (dominant_drain_vars_7d[0] ? `DRIVER_DRAIN:${dominant_drain_vars_7d[0].nombre}` : 'BIO_BALANCE');

    // Las ~25 cascadas posteriores al loop hormonal reescriben los stats con
    // clamp() (que no redondea), dejando flotantes como serotonina:29.7695...
    // Redondeamos los 8 stats núcleo justo antes de persistir.
    (['dopamina', 'serotonina', 'cortisol', 'foco', 'energia', 'sueno', 'conexion_social', 'carga_dopaminergica'] as const)
      .forEach(k => { if (k in s) s[k] = clamp(Math.round(s[k])); });

    const globalStateDoc: ComputedGlobalState = {
      id: 'latest',
      estado_global: nextState,
      reason_codes: force_critical ? ['SYSTEM_COLLAPSE_DETECTED'] : (dominant_drain_vars_7d.length > 0 ? ['HIGH_DRAIN_DRIVERS'] : []),
      dominant_drain_vars_7d,
      dominant_gain_vars_7d,
      explanation: {
        primary_cause: primaryCause,
        secondary_causes: [],
        modifiers: [
          `SENS_STRESS:${sensitivity.stress.toFixed(2)}`,
          `SENS_DOPA:${sensitivity.dopamine.toFixed(2)}`,
          `SENS_SLEEP:${sensitivity.sleep.toFixed(2)}`,
          `CALIB_CONF:${calibration.confidence.toFixed(2)}`,
          `CALIB_TRANSITIONS:${calibration.transitions}`,
          `RESOURCES:${resources.toFixed(1)}`,
          `LOAD:${load.toFixed(1)}`,
          `ALLO_LOAD:${allostaticLoad.toFixed(1)}`,
          `RECOVERY:${recoveryReserve.toFixed(1)}`,
          `RAW_SCORE:${rawPlayerScore}`,
          `FEEDBACK_ADJ:${feedbackAdjustment.toFixed(1)}`,
          `VELOCITY_PROXY:${velocityProxy}`,
          `SLEEP_DEBT:${Math.round(sleepDebtScore)}`,
          `RESONANCE:${Math.round(systemicResonance)}`,
          `RESONANCE_AXES:${axesOverloaded}`,
          `CLINICAL_RISK:${clinicalV2?.risk_score?.toFixed(1) ?? 'N/A'}`,
          `CLINICAL_BAND:${clinicalV2?.risk_band ?? 'N/A'}`,
          `CLINICAL_CONF:${clinicalV2?.confidence?.toFixed(2) ?? 'N/A'}`,
          `CLINICAL_PENALTY:${clinicalPenalty.toFixed(1)}`,
          ...(isVelocityWarning ? ['VELOCITY_WARNING:RAPID_FALL'] : []),
          ...(clinicalEscalation ? ['CLINICAL_ESCALATION:ACTIVE'] : []),
          `DECISION_FATIGUE:${decisionFatigueScore.toFixed(1)}`,
          ...(mean30dScore !== null ? [`DISPOSITIONAL_BASELINE:${mean30dScore.toFixed(1)}`, `DISPOSITIONAL_DEV:${dispositionalDeviation >= 0 ? '+' : ''}${dispositionalDeviation.toFixed(1)}`] : []),
          ...(ncMagnitude > 1 ? [`NEURO_COUPLING:${ncMagnitude.toFixed(1)}`] : []),
          `CAR_CONTRIB:${physioCortisolContrib.toFixed(1)}`,
          ...(nightAmplifierActive ? ['NIGHT_CORTISOL:AMPLIFIED'] : []),
          ...(activeStreak >= 3 ? [`STREAK_ACTIVE:${activeStreak}`] : []),
          ...(brokenStreakLength >= 3 ? [`STREAK_BROKEN:${brokenStreakLength}`] : []),
          ...(habituationEffect > 0.5 ? [`HABITUATION:${habituationEffect.toFixed(1)}`] : []),
          ...(noveltyEffect > 0.5 ? [`NOVELTY_STRESS:${noveltyEffect.toFixed(1)}`] : []),
          `ALLOSTATIC_INDEX:${allostaticLoadIndex}/8`,
          ...(chronicLoadDays > 0 ? [`ALLOSTATIC_CHRONIC:${chronicLoadDays}d`] : []),
          ...(positiveHabitDays > 0 ? [`RESILIENCE_BUFFER:${positiveHabitDays}d`] : []),
          `LONELINESS_DAYS:${daysSincePositiveContact.toFixed(1)}`,
          `ANTICIPATORY_LOAD:${anticipatoryCortisolEffect.toFixed(1)}`,
          `COMPLETION_BOOST:${completionDopamineEffect.toFixed(1)}`,
          `BRAC_PHASE:${bracPhase.toFixed(2)}`,
          ...(bracCortisolEffect > 0 ? [`BRAC_TROUGH_PENALTY:${bracCortisolEffect.toFixed(1)}`] : []),
          ...(bracFocusEffect > 0 && bracPhase < 0.55 ? [`BRAC_PEAK_BONUS:${bracFocusEffect.toFixed(1)}`] : []),
          `EUSTRESS_CORTISOL:${eustressCortisolGain.toFixed(1)}`,
          `DISTRESS_CORTISOL:${distressCortisol.toFixed(1)}`,
          `CHRONOTYPE:${chronotype.toFixed(2)}`,
          `CIRCADIAN_HOUR:${circadianHour.toFixed(1)}`,
          ...(sjlActive ? [`SJL_INTENSITY:${sjlIntensity.toFixed(2)}`] : []),
          ...(maxToleranceRank > 2 ? [`TOLERANCE_TOP:${maxToleranceVar}:x${maxToleranceRank}`] : []),
          ...(toxicAnchorCount > 0 ? [`TOXIC_ANCHORS:${toxicAnchorCount}`] : []),
          ...(positiveAnchorCount > 0 ? [`POSITIVE_ANCHORS:${positiveAnchorCount}`] : []),
          ...(socialDebtRatio > 0.2 ? [`SOCIAL_DEBT:${(socialDebtRatio * 100).toFixed(0)}%`] : []),
          `RHYTHM_SD:${rhythmSD.toFixed(2)}`,
          `RHYTHM_MEAN:${rhythmMean.toFixed(1)}`,
          `RHYTHM_LABEL:${rhythmLabel}`,
          ...(pkFocusFinal > 0 ? [`PK_FOCUS_BOOST:${pkFocusFinal.toFixed(1)}`] : []),
          ...(pkSerotoninFinal > 0 ? [`PK_SEROTONIN_DRAIN:${pkSerotoninFinal.toFixed(1)}`] : []),
          ...(pkExerciseFinal > 0 ? [`PK_EXERCISE_BOOST:${pkExerciseFinal.toFixed(1)}`] : []),
        ],
      },
      updatedAt: new Date().toISOString(),
      rpg_stats: s as any,
      is_locked,
      lock_reason,
      // Al desbloquear (is_locked false) reseteamos lock_started_at; antes se
      // preservaba el valor antiguo → el lock parecía no liberarse nunca.
      lock_started_at: is_locked
        ? (currentGlobalState !== 'CRITICO' ? now.toISOString() : (lastGlobalState?.lock_started_at || null))
        : null,
      estimated_unlock_time: is_locked ? estimated_unlock_hours : 0,
      model_version: 'kairos-v3.9',
      clinical_v2: clinicalV2,
      data_quality: clinicalV2?.data_quality ?? null,
      is_learning_mode: isLearningMode,
      velocity_warning: velocityWarningRaw, // señal cruda; se confirma al siguiente recálculo
    };

    writes.push({ collection: 'computed_global_state', docId: 'latest', data: globalStateDoc as unknown as Record<string, unknown> });

    const lastCalibrationAtRaw = calibrationMeta?.value ? (() => {
      try { return JSON.parse(calibrationMeta.value).last_calibrated_at as string | undefined; } catch { return undefined; }
    })() : undefined;
    const lastCalibrationAt = lastCalibrationAtRaw ? new Date(lastCalibrationAtRaw).getTime() : 0;
    const canPersistCalibration = calibration.transitions >= MIN_CALIBRATION_TRANSITIONS && (now.getTime() - lastCalibrationAt >= AUTO_CALIBRATION_INTERVAL_MS);

    if (canPersistCalibration) {
      writes.push({ collection: 'playerProfile', docId: 'main-profile', data: {
        sensitivity_stress: sensitivity.stress,
        sensitivity_dopamine: sensitivity.dopamine,
        sensitivity_sleep: sensitivity.sleep,
        sensitivity_emotional: sensitivity.emotional,
        sensitivity_environmental: sensitivity.environmental,
        sensitivity_pressure: sensitivity.pressure,
      } });

      writes.push({ collection: 'dashboardConfig', docId: 'bio_auto_calibration', data: {
        key: 'bio_auto_calibration',
        value: JSON.stringify({
          last_calibrated_at: now.toISOString(),
          confidence: calibration.confidence,
          transitions: calibration.transitions,
        }),
      } });
    }

    areas.forEach(area => {
      const areaVars = variables.filter(v => v.area_id === area.area_id);
      const areaVarIds = new Set(areaVars.map(v => v.var_id));
      const areaEvents = safeEvents.filter(e => areaVarIds.has(e.var_id));
      const areaCalc = computeAreaScoreAtTime({
        area,
        events: areaEvents,
        variableById,
        at: now,
        globalState: nextState,
      });

      writes.push({ collection: 'computed_areas', docId: area.area_id, data: {
        id: area.area_id,
        area_id: area.area_id,
        score_7d: areaCalc.score,
        estado: areaCalc.state,
      } });
    });

    const todayStr = format(now, 'yyyy-MM-dd');
    writes.push({ collection: 'computed_daily_score', docId: todayStr, data: {
      fecha: todayStr,
      score_total: player_score,
      allostatic_index: allostaticLoadIndex, // conteo de biomarcadores en riesgo (0–8)
    } });

    // Mark as processed BEFORE the async write so any re-render during the round-trip
    // finds the signature already consumed and bails out.
    lastProcessedSignature.current = currentDataSignature;
    // lastDataSignature persiste entre ticks del timer (no se anula) para poder
    // distinguir "datos nuevos" de "solo pasó el tiempo" en el próximo recálculo.
    lastDataSignature.current = currentDataSignature;
    lastWriteTime.current = now.getTime();

    fetch('/api/data/computed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
    }).catch(err => {
      console.error('Axiom Core: write failed, will retry on next data change.', err);
      lastProcessedSignature.current = null; // reset so next genuine change retries
    });
  }, [
    uid,
    playerProfileSig,
    areasSig,
    hormonesSig,
    impactMatrixSig,
    variablesSig,
    eventsSig,
    interactionsSig,
    relationsSig,
    transactionsSig,
    historicalEventsSig,
    protocolsSig,
    // Omitted — these are collections we WRITE to; including them causes a write loop:
    // calibrationScoresSig  → computed_daily_score
    // lastGlobalStateSig    → computed_global_state/latest
    // calibrationMetaSig    → dashboardConfig/bio_auto_calibration
    modelFlagsSig,
    milestonesSig,
    timerKey, // forces refresh every 15 min for pharmacokinetic decay
  ]);
}





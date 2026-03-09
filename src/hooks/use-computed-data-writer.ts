'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, writeBatch, serverTimestamp, orderBy, limit } from 'firebase/firestore';
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
} from '@/lib/types';
import { computeClinicalModelV2 } from '@/lib/model-v2-clinical';
import { subDays, parseISO, differenceInHours, format } from 'date-fns';

const DECAY_K: Record<string, number> = {
  cortisol: 0.2,
  dopamina: 0.5,
  serotonina: 0.1,
  energia: 0.15,
  foco: 0.3,
  sueño: 0.08,
  conexion_social: 0.2,
  carga_dopaminergica: 0.4,
};

const HORMONE_TO_STATS_MAP: Record<string, string | null> = {
  DOPAMINA: 'dopamina',
  SEROTONINA: 'serotonina',
  CORTISOL: 'cortisol',
  FOCUS: 'foco',
  ENERGY: 'energia',
  MELATONINA: 'sueño',
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
const SLEEP_KEY = 'sueño';
const FORCE_ENABLE_CLINICAL_V2 = true;

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const tanhNorm = (value: number, scale = 1) => Math.tanh(value / Math.max(0.0001, scale));

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

export function useComputedDataWriter() {
  const { user } = useUser();
  const firestore = useFirestore();

  const playerProfileRef = useMemoFirebase(() => (user ? doc(firestore, `users/${user.uid}/playerProfile/main-profile`) : null), [user, firestore]);
  const { data: playerProfile } = useDoc<PlayerProfile>(playerProfileRef);

  const areasRef = useMemoFirebase(() => (user ? collection(firestore, `users/${user.uid}/areas`) : null), [user, firestore]);
  const { data: areas } = useCollection<Area>(areasRef);

  const hormonesRef = useMemoFirebase(() => (user ? collection(firestore, `users/${user.uid}/hormones`) : null), [user, firestore]);
  const { data: hormones } = useCollection<Hormone>(hormonesRef);

  const impactMatrixRef = useMemoFirebase(() => (user ? collection(firestore, `users/${user.uid}/impactMatrix`) : null), [user, firestore]);
  const { data: impactMatrix } = useCollection<ImpactMatrix>(impactMatrixRef);

  const variablesRef = useMemoFirebase(() => (user ? collection(firestore, `users/${user.uid}/variables`) : null), [user, firestore]);
  const { data: variables } = useCollection<Variable>(variablesRef);

  const eventsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/events`), where('fecha', '>=', subDays(new Date(), 7).toISOString())) : null),
    [user, firestore],
  );
  const { data: events } = useCollection<Event>(eventsQuery);

  const interactionsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/interactions`), where('fecha', '>=', subDays(new Date(), 7).toISOString())) : null),
    [user, firestore],
  );
  const { data: interactions } = useCollection<Interaction>(interactionsQuery);

  const relationsRef = useMemoFirebase(() => (user ? collection(firestore, `users/${user.uid}/relations`) : null), [user, firestore]);
  const { data: relations } = useCollection<Relation>(relationsRef);

  const transactionsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/transactions`), where('fecha', '>=', subDays(new Date(), 7).toISOString())) : null),
    [user, firestore],
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const historicalEventsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/events`), where('fecha', '>=', subDays(new Date(), 60).toISOString())) : null),
    [user, firestore],
  );
  const { data: historicalEvents } = useCollection<Event>(historicalEventsQuery);

  const calibrationScoresQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/computed_daily_score`), orderBy('fecha', 'desc'), limit(50)) : null),
    [user, firestore],
  );
  const { data: calibrationScores } = useCollection<ComputedDailyScore>(calibrationScoresQuery);

  const globalStateRef = useMemoFirebase(() => (user ? doc(firestore, `users/${user.uid}/computed_global_state/latest`) : null), [user, firestore]);
  const { data: lastGlobalState } = useDoc<ComputedGlobalState>(globalStateRef);

  const calibrationMetaRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/dashboardConfig/bio_auto_calibration`) : null),
    [user, firestore],
  );
  const { data: calibrationMeta } = useDoc<DashboardConfig>(calibrationMetaRef);

  const modelFlagsRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/dashboardConfig/model_flags`) : null),
    [user, firestore],
  );
  const { data: modelFlags } = useDoc<DashboardConfig>(modelFlagsRef);

  const lastProcessedSignature = useRef<string | null>(null);
  const lastWriteTime = useRef<number>(0);

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
    () => (impactMatrix ? `${impactMatrix.length}:${impactMatrix[0]?.id ?? ''}:${impactMatrix[impactMatrix.length - 1]?.id ?? ''}` : 'none'),
    [impactMatrix],
  );
  const variablesSig = useMemo(
    () => (variables ? `${variables.length}:${variables[0]?.id ?? ''}:${variables[variables.length - 1]?.id ?? ''}` : 'none'),
    [variables],
  );
  const eventsSig = useMemo(
    () => (events ? `${events.length}:${events[0]?.id ?? ''}:${events[events.length - 1]?.id ?? ''}` : 'none'),
    [events],
  );
  const interactionsSig = useMemo(
    () => (interactions ? `${interactions.length}:${interactions[0]?.id ?? ''}:${interactions[interactions.length - 1]?.id ?? ''}` : 'none'),
    [interactions],
  );
  const relationsSig = useMemo(
    () => (relations ? `${relations.length}:${relations[0]?.id ?? ''}:${relations[relations.length - 1]?.id ?? ''}` : 'none'),
    [relations],
  );
  const transactionsSig = useMemo(
    () => (transactions ? `${transactions.length}:${transactions[0]?.id ?? ''}:${transactions[transactions.length - 1]?.id ?? ''}` : 'none'),
    [transactions],
  );
  const historicalEventsSig = useMemo(
    () => (historicalEvents ? `${historicalEvents.length}:${historicalEvents[0]?.id ?? ''}:${historicalEvents[historicalEvents.length - 1]?.id ?? ''}` : 'none'),
    [historicalEvents],
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

  useEffect(() => {
    if (!user || !firestore || !playerProfile || !areas || !hormones || !impactMatrix || !variables) {
      return;
    }

    const safeEvents = events ?? [];
    const safeInteractions = interactions ?? [];
    const safeRelations = relations ?? [];
    const safeTransactions = transactions ?? [];
    const safeHistoricalEvents = historicalEvents ?? [];
    const safeCalibrationScores = calibrationScores ?? [];

    const currentDataSignature = JSON.stringify({
      evtCount: safeEvents.length,
      intCount: safeInteractions.length,
      txCount: safeTransactions.length,
      hormoneCount: hormones.length,
      areaCount: areas.length,
      lastEvent: safeEvents.length > 0 ? safeEvents[safeEvents.length - 1].evento_id : null,
    });

    const now = new Date();
    const timeSinceLastWrite = now.getTime() - lastWriteTime.current;
    if (currentDataSignature === lastProcessedSignature.current && timeSinceLastWrite < MIN_WRITE_INTERVAL) {
      return;
    }

    const baseSensitivity = getSensitivity(playerProfile);
    const variableById = new Map(variables.map(v => [v.var_id, v]));
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

    const batch = writeBatch(firestore);

    const statsValues: Record<string, number> = {
      dopamina: 50,
      serotonina: 50,
      cortisol: 20,
      foco: 50,
      energia: 50,
      sueño: 50,
      conexion_social: 50,
      carga_dopaminergica: 10,
      player_score: 50,
    };

    hormones.forEach(h => {
      const hId = h.hormone_id;
      const statKey = HORMONE_TO_STATS_MAP[hId];
      const k = DECAY_K[String(statKey || '')] || 0.2;
      const nowHour = now.getHours();
      let totalEffect = 0;

      const relevantImpacts = impactMatrix.filter(im => im.hormone_id === hId);
      const hEvents = safeEvents.filter(e => relevantImpacts.some(im => im.var_id === e.var_id));

      hEvents.forEach(event => {
        const impact = relevantImpacts.find(im => im.var_id === event.var_id);
        if (!impact) return;

        const variable = variableById.get(event.var_id);
        const eventDate = parseISO(event.fecha);
        const dt = differenceInHours(now, eventDate);
        if (dt < 0) return;

        const delayHours = Math.max(0, (variable?.delay_dias || 0) * 24);
        if (dt < delayHours) return;

        const effectiveDt = dt - delayHours;
        const curveFactor = variableCurveResponse(variable, event.intensidad);
        const basePeak = impact.effect_size * curveFactor;
        const sensitivePeak = applySensitivity(String(statKey || ''), basePeak, sensitivity);
        const effectiveDuration = Math.max(1, impact.duration_hours, (variable?.duracion_dias || 0) * 24);

        let effectAtTime = 0;
        if (effectiveDt <= effectiveDuration) {
          effectAtTime = sensitivePeak;
        } else {
          const timeAfterPeak = effectiveDt - effectiveDuration;
          effectAtTime = sensitivePeak * Math.exp(-k * timeAfterPeak);
        }

        effectAtTime *= circadianMultiplier(hId, nowHour);
        totalEffect += effectAtTime;

        const prev = variableContrib.get(event.var_id) || {
          name: variable?.var_nombre || event.var_id,
          total: 0,
          hoursRemaining: 0,
        };
        const remaining = Math.max(0, effectiveDuration - effectiveDt);
        variableContrib.set(event.var_id, {
          name: prev.name,
          total: prev.total + effectAtTime,
          hoursRemaining: Math.max(prev.hoursRemaining, remaining),
        });
      });

      const baseline = h.baseline || 50;
      const circadianBaseline = baseline * (1 + ((circadianMultiplier(hId, nowHour) - 1) * 0.35));
      const finalLevel = clamp(Math.round(circadianBaseline + totalEffect));

      if (statKey && statKey in statsValues) {
        statsValues[statKey] = finalLevel;
      }

      batch.set(doc(firestore, `users/${user.uid}/computed_hormones`, hId), {
        hormone_id: hId,
        current_level: finalLevel,
        delta_24h: totalEffect,
      });
    });

    const s = statsValues;

    if (s.cortisol > 65) {
      const overload = s.cortisol - 65;
      s.serotonina = clamp(s.serotonina - (overload * 0.45));
      s.foco = clamp(s.foco - (overload * 0.55));
      s.energia = clamp(s.energia - (overload * 0.4));
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

    // Acoplamiento financiero (normalizado): usa ratios para mantener estabilidad entre perfiles.
    const income7d = safeTransactions
      .filter(t => t.tipo === 'Ingreso')
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
    const expenses7d = safeTransactions
      .filter(t => t.tipo === 'Gasto')
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
    const impulsiveSpend7d = safeTransactions
      .filter(t => t.tipo === 'Gasto' && t.impulsivo)
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
    const debtPayments7d = safeTransactions
      .filter(t => t.tipo === 'Gasto' && t.categoria === 'Deudas')
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
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

    const allostaticLoadRaw =
      (Math.max(0, s.cortisol - 62) * 0.18) +
      (Math.max(0, s.carga_dopaminergica - 52) * 0.16) +
      (Math.max(0, 30 - s[SLEEP_KEY]) * 0.14);
    const allostaticLoad = Math.min(22, allostaticLoadRaw);

    const recoveryReserveRaw =
      (Math.max(0, s.serotonina - 55) * 0.22) +
      (Math.max(0, s.energia - 55) * 0.24) +
      (Math.max(0, s.conexion_social - 55) * 0.16);
    const recoveryReserve = Math.min(14, recoveryReserveRaw);

    const rawPlayerScore = clamp(Math.round(resources - load - allostaticLoad + recoveryReserve + 50));
    const previousScore = lastGlobalState?.rpg_stats?.player_score ?? rawPlayerScore;
    const player_score = clamp(Math.round((previousScore * 0.55) + (rawPlayerScore * 0.45)));
    s.player_score = player_score;
    const clinicalV2 = computeClinicalModelV2({
      enabled: clinicalV2Enabled,
      stats: s as unknown as RPGStats,
      events7d: safeEvents.length,
      interactions7d: safeInteractions.length,
      transactions7d: safeTransactions.length,
      calibrationConfidence: calibration.confidence,
    });

    let is_locked = false;
    let lock_reason = '';
    let force_critical = false;

    if (s.cortisol >= 85 && s.energia <= 22) {
      force_critical = true;
      lock_reason = 'CORTISOL_OVERLOAD_ENERGY_COLLAPSE';
    } else if (s[SLEEP_KEY] <= 12 && s.foco <= 20) {
      force_critical = true;
      lock_reason = 'SLEEP_DEPRIVATION_COLLAPSE';
    } else if (s.carga_dopaminergica >= 85 && s.dopamina <= 35) {
      force_critical = true;
      lock_reason = 'DOPAMINE_SATURATION_COLLAPSE';
    } else if (s.serotonina <= 25 && s.cortisol >= 70) {
      force_critical = true;
      lock_reason = 'AFFECTIVE_INSTABILITY_COLLAPSE';
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

    if (player_score < 40 || force_critical) {
      nextState = 'CRITICO';
    } else if (player_score < 70) {
      if (currentGlobalState === 'CRITICO') {
        nextState = player_score > 48 ? 'RIESGO' : 'CRITICO';
      } else {
        nextState = 'RIESGO';
      }
    } else {
      if (currentGlobalState === 'RIESGO') {
        nextState = player_score >= 70 ? 'OK' : 'RIESGO';
      } else if (currentGlobalState === 'OK') {
        nextState = player_score < 62 ? 'RIESGO' : 'OK';
      } else {
        nextState = 'OK';
      }
    }

    if (nextState === 'CRITICO') is_locked = true;

    const hasSignificantChange = Math.abs(player_score - lastStoredScore) >= 1 || nextState !== currentGlobalState;
    if (!hasSignificantChange && currentDataSignature === lastProcessedSignature.current) {
      return;
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

    const primaryCause =
      lock_reason ||
      (dominant_drain_vars_7d[0] ? `DRIVER_DRAIN:${dominant_drain_vars_7d[0].nombre}` : 'BIO_BALANCE');

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
        ],
      },
      updatedAt: serverTimestamp() as any,
      rpg_stats: s as any,
      is_locked,
      lock_reason,
      lock_started_at: is_locked && currentGlobalState !== 'CRITICO' ? now.toISOString() : (lastGlobalState?.lock_started_at || null),
      estimated_unlock_time: estimated_unlock_hours,
      model_version: 'bio-engine-v2.1',
      clinical_v2: clinicalV2,
      data_quality: clinicalV2?.data_quality ?? null,
    };

    batch.set(doc(firestore, `users/${user.uid}/computed_global_state/latest`), globalStateDoc);

    const lastCalibrationAtRaw = calibrationMeta?.value ? (() => {
      try { return JSON.parse(calibrationMeta.value).last_calibrated_at as string | undefined; } catch { return undefined; }
    })() : undefined;
    const lastCalibrationAt = lastCalibrationAtRaw ? new Date(lastCalibrationAtRaw).getTime() : 0;
    const canPersistCalibration = calibration.transitions >= MIN_CALIBRATION_TRANSITIONS && (now.getTime() - lastCalibrationAt >= AUTO_CALIBRATION_INTERVAL_MS);

    if (canPersistCalibration) {
      const profileRef = doc(firestore, `users/${user.uid}/playerProfile/main-profile`);
      batch.set(profileRef, {
        sensitivity_stress: sensitivity.stress,
        sensitivity_dopamine: sensitivity.dopamine,
        sensitivity_sleep: sensitivity.sleep,
        sensitivity_emotional: sensitivity.emotional,
        sensitivity_environmental: sensitivity.environmental,
        sensitivity_pressure: sensitivity.pressure,
      }, { merge: true });

      const calibrationMetaRefWrite = doc(firestore, `users/${user.uid}/dashboardConfig`, 'bio_auto_calibration');
      batch.set(calibrationMetaRefWrite, {
        key: 'bio_auto_calibration',
        value: JSON.stringify({
          last_calibrated_at: now.toISOString(),
          confidence: calibration.confidence,
          transitions: calibration.transitions,
        }),
      }, { merge: true });
    }

    areas.forEach(area => {
      const areaVars = variables.filter(v => v.area_id === area.area_id);
      const areaVarIds = new Set(areaVars.map(v => v.var_id));
      const areaEvents = safeEvents.filter(e => areaVarIds.has(e.var_id));

      const weightedImpact = areaEvents.reduce((acc, event) => {
        const variable = variableById.get(event.var_id);
        if (!variable) return acc;
        const hoursAgo = Math.max(0, differenceInHours(now, parseISO(event.fecha)));
        const recencyWeight = Math.exp(-0.08 * (hoursAgo / 24));
        const impact = variable.polaridad * variable.impacto_base * (event.intensidad / 5);
        return acc + (impact * recencyWeight);
      }, 0);

      let areaScore = Math.round(clamp(70 + (weightedImpact * 2)));
      if (nextState === 'CRITICO') areaScore = Math.min(areaScore, 49);
      if (nextState === 'RIESGO') areaScore = Math.min(areaScore, 74);

      const riskThreshold = (area.umbral_riesgo ?? 7) * 10;
      const criticalThreshold = (area.umbral_critico ?? 4) * 10;
      const areaState: OverallState =
        areaScore < criticalThreshold ? 'CRITICO' :
        areaScore < riskThreshold ? 'RIESGO' :
        'OK';

      batch.set(doc(firestore, `users/${user.uid}/computed_areas`, area.area_id), {
        id: area.area_id,
        area_id: area.area_id,
        score_7d: areaScore,
        estado: areaState,
      });
    });

    const todayStr = format(now, 'yyyy-MM-dd');
    batch.set(doc(firestore, `users/${user.uid}/computed_daily_score`, todayStr), {
      fecha: todayStr,
      score_total: player_score,
    });

    batch
      .commit()
      .then(() => {
        lastProcessedSignature.current = currentDataSignature;
        lastWriteTime.current = now.getTime();
      })
      .catch(err => {
        console.error('Axiom Core: Error writing computed data. Quota might be low.', err);
      });
  }, [
    user?.uid,
    firestore,
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
    calibrationScoresSig,
    lastGlobalStateSig,
    calibrationMetaSig,
    modelFlagsSig,
  ]);
}




/**
 * Client-side demo seeder.
 * Called when demo@axiom.app doesn't exist yet — creates all demo data
 * directly in the Firestore emulator using the client SDK.
 */

import {
  Firestore,
  writeBatch,
  doc,
  collection,
  setDoc,
} from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _evt = 0, _tx = 0, _int = 0;
const nextEvtId = () => `EVT_${String(++_evt).padStart(4, '0')}`;
const nextTxId  = () => `TX_${String(++_tx).padStart(4, '0')}`;
const nextIntId = () => `INT_${String(++_int).padStart(4, '0')}`;

function isoAt(daysAgo: number, hour = 8, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const r    = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const ch   = (p: number) => Math.random() < p;
const pick = <T>(arr: T[]): T => arr[r(0, arr.length - 1)];

// 60-day arc: struggle → awakening → crisis → recovery → current
function getPhase(daysAgo: number): string {
  if (daysAgo >= 46) return 'struggle';
  if (daysAgo >= 31) return 'awakening';
  if (daysAgo >= 16) return 'crisis';
  if (daysAgo >= 3)  return 'recovery';
  return 'current';
}

function getDow(daysAgo: number): number {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.getDay();
}

// ─── Batch writer ─────────────────────────────────────────────────────────────

async function writeBatched(
  firestore: Firestore,
  items: Array<{ path: string; data: Record<string, unknown> }>
): Promise<void> {
  const CHUNK = 450;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(firestore);
    items.slice(i, i + CHUNK).forEach(({ path, data }) => {
      batch.set(doc(firestore, path), data);
    });
    await batch.commit();
  }
}

// ─── Event generation ─────────────────────────────────────────────────────────

interface SeedEvent {
  path: string;
  data: Record<string, unknown>;
}

function makeEvent(
  uid: string,
  daysAgo: number,
  var_id: string,
  intensidad: number,
  duracion_min: number,
  contexto: string,
  hour: number,
  opts: { impulsivo?: boolean; persona_id?: string } = {}
): SeedEvent {
  const id = nextEvtId();
  return {
    path: `users/${uid}/events/${id}`,
    data: {
      evento_id: id,
      fecha: isoAt(daysAgo, hour, r(0, 55)),
      var_id,
      intensidad,
      duracion_min,
      contexto,
      impulsivo: opts.impulsivo ?? false,
      persona_id: opts.persona_id ?? '',
      monto: 0,
      tipo: 'Variable',
      milestone_id: '',
    },
  };
}

function generateDayEvents(uid: string, daysAgo: number): SeedEvent[] {
  const events: SeedEvent[] = [];
  const phase = getPhase(daysAgo);
  const dow = getDow(daysAgo);
  const isWeekend = dow === 0 || dow === 6;
  const isWorkday = !isWeekend;

  type PhaseMap = { struggle: number; awakening: number; crisis: number; recovery: number; current: number };

  const P: Record<string, PhaseMap> = {
    sleep_good:  { struggle: 0.15, awakening: 0.58, crisis: 0.20, recovery: 0.88, current: 0.72 },
    exercise:    { struggle: 0.20, awakening: 0.52, crisis: 0.22, recovery: 0.68, current: 0.55 },
    meditation:  { struggle: 0.04, awakening: 0.55, crisis: 0.12, recovery: 0.85, current: 0.70 },
    deep_work:   { struggle: 0.12, awakening: 0.48, crisis: 0.18, recovery: 0.78, current: 0.65 },
    healthy_meal:{ struggle: 0.30, awakening: 0.62, crisis: 0.32, recovery: 0.80, current: 0.65 },
    work_stress: { struggle: 0.68, awakening: 0.38, crisis: 0.88, recovery: 0.18, current: 0.32 },
    doomscroll:  { struggle: 0.70, awakening: 0.28, crisis: 0.62, recovery: 0.08, current: 0.20 },
    gratitude:   { struggle: 0.02, awakening: 0.25, crisis: 0.08, recovery: 0.78, current: 0.65 },
    purpose:     { struggle: 0.04, awakening: 0.20, crisis: 0.06, recovery: 0.48, current: 0.42 },
    learning:    { struggle: 0.08, awakening: 0.40, crisis: 0.10, recovery: 0.52, current: 0.48 },
    env_order:   { struggle: 0.15, awakening: 0.40, crisis: 0.18, recovery: 0.68, current: 0.55 },
    social_ok:   { struggle: 0.12, awakening: 0.30, crisis: 0.08, recovery: 0.45, current: 0.35 },
    frustration: { struggle: 0.38, awakening: 0.15, crisis: 0.52, recovery: 0.08, current: 0.15 },
    procrastinate:{ struggle: 0.50, awakening: 0.18, crisis: 0.40, recovery: 0.06, current: 0.14 },
    sugar:       { struggle: 0.28, awakening: 0.10, crisis: 0.30, recovery: 0.05, current: 0.10 },
  };

  const p = (key: string) => P[key][phase as keyof PhaseMap];

  // Sleep (every day)
  const goodSleep = ch(p('sleep_good'));
  const sleepInt = goodSleep ? r(phase === 'recovery' ? 4 : 3, 5) : r(2, 3);
  const sleepH = ((goodSleep ? r(74, 87) : r(54, 70)) / 10).toFixed(1);
  events.push(makeEvent(uid, daysAgo,
    goodSleep ? 'SUEÑO_PROF' : 'SUEÑO_BAJO', sleepInt, 60,
    goodSleep ? `${sleepH}h sueño — descansé bien` : `${sleepH}h sueño — noche fragmentada`,
    7
  ));

  if (ch(p('exercise'))) {
    const type = ch(0.55) ? 'FUERZA' : 'CARDIO';
    events.push(makeEvent(uid, daysAgo, type, r(3, 5), r(35, 65),
      type === 'FUERZA'
        ? pick(['Gym — press + sentadillas', 'Calistenia en casa', 'Entrenamiento fuerza'])
        : pick(['Carrera matutina 5km', 'Bici 35min', 'HIIT 20min']),
      isWeekend ? r(10, 12) : r(7, 9)
    ));
  }

  if (ch(p('meditation'))) {
    events.push(makeEvent(uid, daysAgo, 'MEDITATION', r(3, 5), r(10, 20),
      pick(['Respiración 4-7-8', 'Body scan 15min', 'Meditación guiada', 'Silencio activo']),
      r(7, 9)
    ));
  }

  if (isWorkday && ch(p('deep_work'))) {
    events.push(makeEvent(uid, daysAgo, 'DEEP_WORK', r(3, 5), r(50, 90),
      pick(['Bloque matinal 60min — sin interrupciones', 'Sesión deep work', 'Modo avión 90min']),
      r(9, 11)
    ));
  }

  if (ch(p('healthy_meal'))) {
    events.push(makeEvent(uid, daysAgo, 'HEALTHY_MEAL', r(3, 4), 30,
      pick(['Menú equilibrado — proteína + vegetales', 'Ensalada completa + pollo', 'Comida sencilla sin procesados']),
      r(13, 15)
    ));
  }

  if (isWorkday && ch(p('work_stress'))) {
    const si = phase === 'crisis' ? r(4, 5) : phase === 'struggle' ? r(3, 4) : r(2, 3);
    events.push(makeEvent(uid, daysAgo, 'WORK_STRESS', si, r(60, 240),
      pick(['Reunión sin resultado — 2h perdidas', 'Deadline ajustado — presión alta', 'Feedback negativo', 'Múltiples interrupciones']),
      r(10, 17)
    ));
  }

  if (ch(p('doomscroll'))) {
    const di = (phase === 'crisis' || phase === 'struggle') ? r(3, 5) : r(1, 3);
    events.push(makeEvent(uid, daysAgo, 'DOOMSCROLLING', di, r(20, 80),
      pick(['Instagram antes de dormir', 'Noticias en bucle', 'YouTube autopilot', 'Twitter compulsivo']),
      r(21, 23), { impulsivo: true }
    ));
  }

  if (ch(p('gratitude'))) {
    events.push(makeEvent(uid, daysAgo, 'GRATITUDE', r(3, 5), 10,
      pick(['3 cosas positivas del día', 'Diario de agradecimiento', 'Reflexión nocturna']),
      r(21, 22)
    ));
  }

  if (ch(p('purpose'))) {
    events.push(makeEvent(uid, daysAgo, 'PURPOSE_SENSE', r(3, 5), 20,
      pick(['Revisión de objetivos — alineación alta', 'Sentido de avance real hoy', 'Claridad sobre mi dirección']),
      r(20, 22)
    ));
  }

  if (ch(p('learning'))) {
    events.push(makeEvent(uid, daysAgo, 'LEARNING', r(3, 4), r(20, 45),
      pick(['Lectura técnica 30min', 'Curso online — 1 módulo', 'Podcast educativo']),
      r(18, 20)
    ));
  }

  if (isWeekend && ch(p('env_order'))) {
    events.push(makeEvent(uid, daysAgo, 'ENV_ORDER', r(3, 4), r(20, 45),
      pick(['Limpieza semanal', 'Orden escritorio + cuentas', 'Organicé habitación']),
      r(11, 14)
    ));
  }

  if ((isWeekend || ch(0.12)) && ch(p('social_ok'))) {
    events.push(makeEvent(uid, daysAgo, 'SOCIAL_OK', r(3, 5), r(60, 180),
      pick(['Tarde con Marcos — conversación genuina', 'Cena familiar — buena energía', 'Quedada — me recargó']),
      r(16, 20)
    ));
  }

  if (ch(p('frustration'))) {
    events.push(makeEvent(uid, daysAgo, 'FRUSTRATION', r(2, 4), 30,
      pick(['Sin avance en tarea principal', 'Expectativa no cumplida', 'Errores repetidos']),
      r(15, 19)
    ));
  }

  if (isWorkday && ch(p('procrastinate'))) {
    events.push(makeEvent(uid, daysAgo, 'PROCRAST', r(2, 4), r(30, 90),
      pick(['2h de distracción', 'Evité la tarea difícil', 'Revisé email en bucle']),
      r(14, 18), { impulsivo: true }
    ));
  }

  if (ch(p('sugar'))) {
    events.push(makeEvent(uid, daysAgo, 'AZUCAR', r(2, 4), 30,
      pick(['Atracón dulces por estrés', 'Merienda azucarada — impulso', 'Chocolate tarde difícil']),
      r(16, 18), { impulsivo: true }
    ));
  }

  // Fixed crisis: arguments with Lucía
  if (daysAgo === 28) {
    events.push(makeEvent(uid, daysAgo, 'ARGUMENT', 5, 60,
      'Discusión fuerte con Lucía — sin resolución, nos fuimos a dormir en silencio',
      21, { persona_id: 'FAM_1' }
    ));
  }
  if (daysAgo === 23) {
    events.push(makeEvent(uid, daysAgo, 'ARGUMENT', 3, 30,
      'Primera conversación honesta con Lucía — progreso lento pero necesario',
      21, { persona_id: 'FAM_1' }
    ));
  }

  return events;
}

// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDemoUserFirestore(uid: string, firestore: Firestore): Promise<void> {
  const nowIso = new Date().toISOString();

  // 1. User document
  await setDoc(doc(firestore, `users/${uid}`), {
    uid,
    email: 'demo@axiom.app',
    displayName: 'Alex Demo',
    photoURL: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    isDemo: true,
  });

  // 2. Player profile (so onboarding is skipped)
  await setDoc(doc(firestore, `users/${uid}/playerProfile/main-profile`), {
    age: 28, weight_kg: 75, height_cm: 179,
    mbti_type: 'INTJ', enneagram_type: 'Tipo 5',
    facet_mind_introverted: 76, facet_mind_extraverted: 24,
    facet_energy_intuitive: 72, facet_energy_observant: 28,
    facet_nature_thinking: 68, facet_nature_feeling: 32,
    facet_tactics_judging: 74, facet_tactics_prospecting: 26,
    facet_identity_assertive: 60, facet_identity_turbulent: 40,
    personality_openness: 80, personality_conscientiousness: 75,
    personality_extraversion: 35, personality_agreeableness: 58,
    personality_neuroticism: 42,
    sensitivity_stress: 1.14, sensitivity_dopamine: 1.22,
    sensitivity_sleep: 1.18, sensitivity_emotional: 1.08,
    sensitivity_environmental: 1.11, sensitivity_pressure: 1.16,
  });

  // 3. Static collections
  const staticItems: Array<{ path: string; data: Record<string, unknown> }> = [];

  const areas = [
    ['SALUD_FIS', 'Salud física', 9, 'Alta', 'Optimizar homeostasis', 'Energía/Sueño'],
    ['SALUD_MENT', 'Salud mental', 9, 'Alta', 'Foco y claridad', 'Foco/Dopamina'],
    ['FINANZAS', 'Finanzas', 7, 'Media', 'Control impulsivo', 'Ahorro neto'],
    ['RELACIONES', 'Relaciones', 8, 'Media', 'Vínculos nutritivos', 'Oxitocina/Sem'],
    ['EMOCION', 'Emoción', 8, 'Alta', 'Regulación emocional', 'Estabilidad/Cortisol'],
    ['DOPAMINA', 'Dopamina/Ocio', 8, 'Alta', 'Reset dopamínico', 'Foco/Serotonina'],
    ['CARRERA', 'Carrera', 7, 'Media', 'Productividad', 'Deep Work'],
    ['ENTORNO', 'Entorno', 6, 'Baja', 'Orden y claridad', 'Limpieza/Orden'],
    ['PROPOSITO', 'Propósito', 9, 'Alta', 'Alineación con valores', 'Coherencia/Valores'],
  ];
  areas.forEach(([id, nombre, peso, prioridad, objetivo, kpi]) => {
    staticItems.push({ path: `users/${uid}/areas/${id}`, data: { area_id: id, area_nombre: nombre, peso_estrategico: peso, prioridad, estado: 'OK', objetivo_12s: objetivo, kpi_principal: kpi, umbral_riesgo: 5, umbral_critico: 3, ultima_revision: nowIso, notas: '' } });
  });

  const hormones: [string, string, number, number, string, number][] = [
    ['DOPAMINA', 'Dopamina', 56, 52, '40-70', 1],
    ['SEROTONINA', 'Serotonina', 62, 58, '60-90', 10],
    ['CORTISOL', 'Cortisol', 33, 25, '10-25', 5],
    ['FOCUS', 'Focus', 59, 61, '70-100', 2],
    ['ENERGY', 'Energía', 57, 60, '70-100', 12],
    ['MELATONINA', 'Melatonina', 48, 50, '0-100', 24],
    ['OXITOCINA', 'Oxitocina', 41, 40, '50-90', 2],
    ['DOPA_LOAD', 'Carga Dopaminérgica', 32, 18, '0-30', 4],
    ['ENDORFINAS', 'Endorfinas', 46, 35, '30-80', 3],
    ['NORADRENALINA', 'Noradrenalina', 28, 20, '10-40', 1],
  ];
  hormones.forEach(([id, name, cur, base, range, hl]) => {
    staticItems.push({ path: `users/${uid}/hormones/${id}`, data: { hormone_id: id, name, current_level: cur, baseline: base, optimal_range: range, half_life_hours: hl } });
  });

  const variables: [string, string, string, string, number, number, string, number, number, number, string][] = [
    ['SUEÑO_PROF', 'Sueño profundo', 'SALUD_FIS', 'Física', 1, 10, 'Lineal', 0, 1, 1, 'Media'],
    ['SUEÑO_BAJO', 'Sueño insuficiente', 'SALUD_FIS', 'Física', -1, 10, 'Lineal', 0, 1, 2, 'Media'],
    ['FUERZA', 'Ejercicio fuerza', 'SALUD_FIS', 'Física', 1, 8, 'Lineal', 1, 2, 3, 'Alta'],
    ['CARDIO', 'Ejercicio aeróbico', 'SALUD_FIS', 'Física', 1, 8, 'Lineal', 0, 1, 3, 'Alta'],
    ['HEALTHY_MEAL', 'Comer saludable', 'SALUD_FIS', 'Física', 1, 5, 'Lineal', 0, 1, 2, 'Alta'],
    ['AZUCAR', 'Azúcar alta', 'SALUD_FIS', 'Física', -1, 8, 'Exponencial', 0, 1, 2, 'Alta'],
    ['MEDITATION', 'Meditación', 'SALUD_MENT', 'Conductual', 1, 7, 'Lineal', 0, 1, 1, 'Alta'],
    ['LEARNING', 'Aprendizaje', 'SALUD_MENT', 'Mental', 1, 6, 'Lineal', 0, 1, 2, 'Alta'],
    ['DEEP_WORK', 'Trabajo profundo', 'CARRERA', 'Mental', 1, 9, 'Lineal', 0, 1, 2, 'Alta'],
    ['PROCRAST', 'Procrastinar', 'CARRERA', 'Conductual', -1, 6, 'Lineal', 0, 1, 2, 'Alta'],
    ['WORK_STRESS', 'Estrés laboral', 'CARRERA', 'Mental', -1, 8, 'Lineal', 0, 1, 2, 'Media'],
    ['SOCIAL_OK', 'Social nutritivo', 'RELACIONES', 'Social', 1, 8, 'Lineal', 0, 1, 2, 'Media'],
    ['ARGUMENT', 'Discusión', 'RELACIONES', 'Social', -1, 7, 'Lineal', 0, 1, 1, 'Media'],
    ['GRATITUDE', 'Gratitud', 'EMOCION', 'Conductual', 1, 7, 'Lineal', 0, 2, 1, 'Alta'],
    ['FRUSTRATION', 'Frustración', 'EMOCION', 'Mental', -1, 6, 'Lineal', 0, 1, 2, 'Media'],
    ['DOOMSCROLLING', 'Doomscrolling', 'DOPAMINA', 'Conductual', -1, 9, 'Exponencial', 0, 1, 2, 'Alta'],
    ['PORNO', 'Pornografía', 'DOPAMINA', 'Conductual', -1, 10, 'Exponencial', 0, 2, 1, 'Alta'],
    ['ENV_ORDER', 'Orden entorno', 'ENTORNO', 'Entorno', 1, 6, 'Lineal', 0, 1, 1, 'Alta'],
    ['ENV_CHAOS', 'Caos entorno', 'ENTORNO', 'Entorno', -1, 6, 'Lineal', 0, 1, 1, 'Media'],
    ['PURPOSE_SENSE', 'Sentido propósito', 'PROPOSITO', 'Conductual', 1, 9, 'Lineal', 0, 3, 1, 'Alta'],
  ];
  variables.forEach(([id, nombre, area, tipo, pol, imp, curva, delay, dur, umbral, ctrl]) => {
    staticItems.push({ path: `users/${uid}/variables/${id}`, data: { var_id: id, var_nombre: nombre, area_id: area, tipo, polaridad: pol, impacto_base: imp, curva, delay_dias: delay, duracion_dias: dur, umbral_riesgo: umbral, controlabilidad: ctrl, activo: true } });
  });

  const relations: [string, string, string, number, number, string][] = [
    ['FAM_1', 'Lucía', 'Pareja', 7, 9, 'Diaria'],
    ['AMI_1', 'Marcos', 'Amigo', 5, 8, 'Semanal'],
    ['JOB_1', 'Sofía', 'Trabajo', 1, 7, 'Semanal'],
    ['MEN_1', 'Andrés', 'Mentor', 6, 9, 'Mensual'],
  ];
  relations.forEach(([id, nombre, rol, energia, respeto, freq]) => {
    staticItems.push({ path: `users/${uid}/relations/${id}`, data: { persona_id: id, nombre, rol, energia_neta: energia, respeto, frecuencia: freq } });
  });

  const accounts: [string, string, number][] = [
    ['BANCO_1', 'Banco', 4850],
    ['INV_1', 'Inversion', 7200],
    ['CASH_1', 'Efectivo', 180],
  ];
  accounts.forEach(([id, tipo, saldo]) => {
    staticItems.push({ path: `users/${uid}/accounts/${id}`, data: { cuenta_id: id, tipo, saldo } });
  });

  staticItems.push({ path: `users/${uid}/debts/DEBT_CARD`, data: { debt_id: 'DEBT_CARD', nombre: 'Visa Oro', tipo: 'Tarjeta', principal_inicial: 2200, interes_tae: 21.5, plazo_total_meses: 24, cuota_mensual: 140, saldo_actual: 1260, saldo_pendiente: 1260, fecha_inicio: daysFromNow(-380), tipo_amortizacion: 'Revolving', comision_amortizacion: 0, permite_amortizacion: true, opcion_amortizacion: 'Reducir plazo', prioridad_manual: 'Alta', estres_psicologico: 'Alto', porcentaje_pagado: 43, estado_deuda: 'Activa' } });
  staticItems.push({ path: `users/${uid}/debts/DEBT_LOAN`, data: { debt_id: 'DEBT_LOAN', nombre: 'Préstamo portátil', tipo: 'Préstamo personal', principal_inicial: 1800, interes_tae: 8.9, plazo_total_meses: 18, cuota_mensual: 108, saldo_actual: 740, saldo_pendiente: 740, fecha_inicio: daysFromNow(-220), tipo_amortizacion: 'Francés', comision_amortizacion: 0, permite_amortizacion: true, opcion_amortizacion: 'Reducir plazo', prioridad_manual: 'Media', estres_psicologico: 'Medio', porcentaje_pagado: 59, estado_deuda: 'Activa' } });

  const skills: [string, string, string, number, number, number, string, string][] = [
    ['SKILL_FOCUS', 'Deep Work', 'CARRERA', 5, 8, 640, 'Activa', 'Horas de foco/semana'],
    ['SKILL_FIN', 'Orden financiero', 'FINANZAS', 4, 7, 430, 'Activa', 'Ahorro neto mensual'],
    ['SKILL_REG', 'Autorregulación', 'EMOCION', 6, 8, 720, 'Activa', 'Días estables por semana'],
  ];
  skills.forEach(([id, nombre, area, niv, obj, xp, estado, kpi]) => {
    staticItems.push({ path: `users/${uid}/skills/${id}`, data: { habilidad_id: id, nombre, area_id: area, nivel_actual: niv, nivel_objetivo: obj, xp, estado, kpi } });
  });

  const systems: [string, string, string, string, string, string][] = [
    ['SYS_FOCUS', 'SKILL_FOCUS', '2 bloques de foco al día', 'Diaria', 'Activo', 'P_RESET_5'],
    ['SYS_FIN', 'SKILL_FIN', 'Revisión financiera semanal', 'Semanal', 'Activo', 'P_RESET_5'],
    ['SYS_REG', 'SKILL_REG', 'Higiene emocional diaria', 'Diaria', 'Activo', 'P_DEEP_RECOVERY'],
  ];
  systems.forEach(([id, hab, obj, freq, estado, prot]) => {
    staticItems.push({ path: `users/${uid}/systems/${id}`, data: { sistema_id: id, habilidad_id: hab, objetivo: obj, frecuencia: freq, estado, protocolo_fallo: prot } });
  });

  const habits: [string, string, string, string, number, boolean, string][] = [
    ['HB_1', 'SYS_FOCUS', 'DEEP_WORK', 'Diaria', 50, true, 'Bloque matinal sin interrupciones'],
    ['HB_2', 'SYS_REG', 'MEDITATION', 'Diaria', 10, true, 'Meditación breve al despertar'],
    ['HB_3', 'SYS_REG', 'GRATITUDE', 'Diaria', 5, true, 'Cierre del día con gratitud'],
    ['HB_4', 'SYS_FIN', 'ENV_ORDER', 'Semanal', 30, true, 'Ordenar escritorio y cuentas'],
    ['HB_5', 'SYS_FOCUS', 'HEALTHY_MEAL', 'Diaria', 20, true, 'Comida simple antes del bloque de tarde'],
  ];
  habits.forEach(([id, sys, varId, freq, dur, min, desc]) => {
    staticItems.push({ path: `users/${uid}/habits/${id}`, data: { habito_id: id, sistema_id: sys, var_id: varId, frecuencia: freq, duracion_min: dur, minimo_viable: min, description: desc } });
  });

  staticItems.push({ path: `users/${uid}/milestones/MS_1`, data: { milestone_id: 'MS_1', nombre: 'Completar 20 bloques de foco', skill_id: 'SKILL_FOCUS', system_id: 'SYS_FOCUS', fecha_objetivo: daysFromNow(14), estado: 'Pendiente', fecha_completado: '', notas: 'Crear consistencia operativa', milestone_type: 'recurring', progress_count: 12, target_count: 20 } });
  staticItems.push({ path: `users/${uid}/milestones/MS_2`, data: { milestone_id: 'MS_2', nombre: 'Bajar deuda tarjeta por debajo de 1000', skill_id: 'SKILL_FIN', system_id: 'SYS_FIN', fecha_objetivo: daysFromNow(30), estado: 'Pendiente', fecha_completado: '', notas: 'Reducir carga financiera', milestone_type: 'single', progress_count: 0, target_count: 1 } });
  staticItems.push({ path: `users/${uid}/milestones/MS_3`, data: { milestone_id: 'MS_3', nombre: '14 días seguidos meditando', skill_id: 'SKILL_REG', system_id: 'SYS_REG', fecha_objetivo: daysFromNow(10), estado: 'Pendiente', fecha_completado: '', notas: 'Bajar reactividad', milestone_type: 'recurring', progress_count: 8, target_count: 14 } });

  const matrix: [string, string, string, number, number][] = [
    ['IM1', 'SUEÑO_PROF', 'CORTISOL', -28, 12], ['IM2', 'SUEÑO_PROF', 'FOCUS', 28, 12],
    ['IM3', 'SUEÑO_PROF', 'ENERGY', 30, 12],   ['IM4', 'SUEÑO_BAJO', 'CORTISOL', 30, 12],
    ['IM5', 'SUEÑO_BAJO', 'FOCUS', -24, 12],   ['IM6', 'SUEÑO_BAJO', 'ENERGY', -32, 12],
    ['IM7', 'FUERZA', 'ENDORFINAS', 34, 18],   ['IM8', 'FUERZA', 'DOPAMINA', 18, 18],
    ['IM9', 'CARDIO', 'SEROTONINA', 24, 18],   ['IM10', 'CARDIO', 'ENERGY', 18, 18],
    ['IM11', 'MEDITATION', 'CORTISOL', -24, 8],['IM12', 'MEDITATION', 'SEROTONINA', 18, 8],
    ['IM13', 'DEEP_WORK', 'FOCUS', 35, 4],     ['IM14', 'DEEP_WORK', 'DOPAMINA', 12, 4],
    ['IM15', 'WORK_STRESS', 'CORTISOL', 26, 8],['IM16', 'WORK_STRESS', 'FOCUS', -20, 8],
    ['IM17', 'SOCIAL_OK', 'OXITOCINA', 38, 6], ['IM18', 'SOCIAL_OK', 'SEROTONINA', 16, 6],
    ['IM19', 'ARGUMENT', 'CORTISOL', 18, 5],   ['IM20', 'ARGUMENT', 'OXITOCINA', -12, 5],
    ['IM21', 'DOOMSCROLLING', 'DOPA_LOAD', 55, 4], ['IM22', 'DOOMSCROLLING', 'FOCUS', -30, 4],
    ['IM23', 'PORNO', 'DOPA_LOAD', 75, 6],     ['IM24', 'PORNO', 'SEROTONINA', -26, 6],
    ['IM25', 'GRATITUDE', 'SEROTONINA', 16, 12],['IM26', 'ENV_ORDER', 'FOCUS', 10, 8],
    ['IM27', 'ENV_CHAOS', 'CORTISOL', 12, 8],  ['IM28', 'PURPOSE_SENSE', 'DOPAMINA', 20, 18],
  ];
  matrix.forEach(([id, varId, hormId, eff, dur]) => {
    staticItems.push({ path: `users/${uid}/impactMatrix/${id}`, data: { matrix_id: id, var_id: varId, hormone_id: hormId, effect_size: eff, duration_hours: dur } });
  });

  [
    ['OK', 'Homeostasis equilibrada', 'Ninguna', 'Optimización'],
    ['RIESGO', 'Desviación hormonal detectada', 'Evitar dopamina rápida', 'Estabilización'],
    ['CRITICO', 'Agotamiento de recursos', 'Modo supervivencia', 'Rescate'],
  ].forEach(([id, cond, rest, prio]) => {
    staticItems.push({ path: `users/${uid}/states/${id}`, data: { estado_id: id, condicion: cond, restricciones: rest, prioridad: prio } });
  });

  [
    ['P_RESET_5', 'Reseteo 5 min', 'RIESGO', '1. Beber agua. 2. Respirar 4-7-8. 3. Estirar.', 5],
    ['P_DEEP_RECOVERY', 'Recuperación profunda', 'CRITICO', '1. Silencio. 2. Siesta corta. 3. Paseo suave.', 30],
    ['P_FOCUS_BLOCK', 'Bloque de foco', 'OK', '1. Temporizador 50m. 2. Móvil fuera. 3. Tarea única.', 50],
  ].forEach(([id, nombre, disp, pasos, dur]) => {
    staticItems.push({ path: `users/${uid}/protocols/${id}`, data: { protocolo_id: id, nombre, estado_disparador: disp, pasos, duracion_min: dur } });
  });

  staticItems.push({ path: `users/${uid}/dashboardConfig/debt_strategy`, data: { key: 'debt_strategy', value: 'snowball' } });
  staticItems.push({ path: `users/${uid}/dashboardConfig/model_flags`, data: { key: 'model_flags', value: JSON.stringify({ clinical_v2_enabled: true }) } });

  await writeBatched(firestore, staticItems);

  // 4. Events (60 days)
  const eventItems: Array<{ path: string; data: Record<string, unknown> }> = [];
  for (let d = 60; d >= 0; d--) {
    generateDayEvents(uid, d).forEach(e => eventItems.push(e));
  }
  await writeBatched(firestore, eventItems);

  // 5. Transactions
  const txItems: Array<{ path: string; data: Record<string, unknown> }> = [];
  const makeTx = (tipo: string, cat: string, monto: number, notas: string, daysAgo: number, deuda_id = '', imp = false) => {
    const id = nextTxId();
    txItems.push({ path: `users/${uid}/transactions/${id}`, data: { transaccion_id: id, fecha: isoAt(daysAgo, r(9, 18)), tipo, categoria: cat, monto, impulsivo: imp, var_id: '', cuenta_id: 'BANCO_1', deuda_id, notas } });
  };

  makeTx('Ingreso', 'Nómina', 2800, 'Nómina febrero', 60);
  makeTx('Gasto', 'Vivienda', 900, 'Alquiler', 58);
  makeTx('Gasto', 'Deudas', 140, 'Pago tarjeta Visa', 57, 'DEBT_CARD');
  makeTx('Gasto', 'Deudas', 108, 'Pago préstamo portátil', 57, 'DEBT_LOAN');
  makeTx('Gasto', 'Alimentación', r(160, 200), 'Supermercado', 55);
  makeTx('Gasto', 'Transporte', r(80, 100), 'Transporte', 54);
  makeTx('Gasto', 'Desarrollo Personal', 89, 'Curso online', 50);
  makeTx('Gasto', 'Salud y Bienestar', r(60, 90), 'Gym', 50);
  makeTx('Gasto', 'Ocio y Suscripciones', 35, 'Netflix + Spotify', 49);
  makeTx('Gasto', 'Salud y Bienestar', 450, 'Reparación coche — imprevisto', 32);
  makeTx('Gasto', 'Alimentación', r(30, 55), 'Comida fuera por estrés', 30, '', true);
  makeTx('Gasto', 'Compras', r(40, 80), 'Compra impulsiva', 28, '', true);
  makeTx('Ingreso', 'Nómina', 2800, 'Nómina marzo', 30);
  makeTx('Gasto', 'Vivienda', 900, 'Alquiler', 28);
  makeTx('Gasto', 'Deudas', 140, 'Pago tarjeta Visa', 27, 'DEBT_CARD');
  makeTx('Gasto', 'Deudas', 108, 'Pago préstamo portátil', 27, 'DEBT_LOAN');
  makeTx('Gasto', 'Alimentación', r(150, 185), 'Supermercado', 25);
  makeTx('Gasto', 'Transporte', r(70, 90), 'Transporte', 24);
  makeTx('Gasto', 'Salud y Bienestar', r(60, 80), 'Gym', 23);
  makeTx('Gasto', 'Ocio y Suscripciones', 35, 'Suscripciones', 22);
  makeTx('Gasto', 'Desarrollo Personal', 45, 'Libro técnico', 18);
  makeTx('Gasto', 'Alimentación', r(25, 45), 'Comida con Marcos', 15);
  makeTx('Ingreso', 'Freelance/Negocio', 350, 'Proyecto freelance', 5);
  makeTx('Gasto', 'Alimentación', r(30, 50), 'Compra semanal', 3);
  makeTx('Gasto', 'Deudas', 200, 'Amortización extra tarjeta', 2, 'DEBT_CARD');

  await writeBatched(firestore, txItems);

  // 6. Interactions
  const intItems: Array<{ path: string; data: Record<string, unknown> }> = [];
  const makeInt = (personaId: string, energia: -1 | 0 | 1, respeto: -1 | 0 | 1, ctx: string, daysAgo: number) => {
    const id = nextIntId();
    intItems.push({ path: `users/${uid}/interactions/${id}`, data: { interaccion_id: id, fecha: isoAt(daysAgo, r(17, 22)), persona_id: personaId, energia_resultante: energia, respeto_percibido: respeto, contexto: ctx } });
  };

  makeInt('FAM_1', 0, 1, 'Noche tranquila en casa — poca conexión', 55);
  makeInt('FAM_1', 1, 1, 'Conversación bonita sobre futuros planes', 48);
  makeInt('FAM_1', -1, 0, 'Discusión fuerte — sin resolución', 28);
  makeInt('FAM_1', 0, 1, 'Primera conversación honesta', 23);
  makeInt('FAM_1', 1, 1, 'Reconexión real — conversación honesta', 14);
  makeInt('FAM_1', 1, 1, 'Cena romántica — muy bien', 7);
  makeInt('FAM_1', 1, 1, 'Conversación matutina — conectado', 2);
  makeInt('AMI_1', 1, 1, 'Cañas del viernes — me recargó', 52);
  makeInt('AMI_1', 1, 1, 'Pádel y cena — muy bien', 35);
  makeInt('AMI_1', 1, 1, 'Cumple de Marcos — energía positiva', 21);
  makeInt('AMI_1', 1, 1, 'Comida de la semana', 7);
  makeInt('JOB_1', -1, 0, 'Reunión sin sentido — 2h perdidas', 58);
  makeInt('JOB_1', -1, -1, 'Crítica injusta en público', 29);
  makeInt('JOB_1', 0, 1, 'Reunión técnica — útil', 15);
  makeInt('JOB_1', 1, 1, 'Reconocimiento de mi trabajo', 7);
  makeInt('MEN_1', 1, 1, 'Sesión mensual — claridad estratégica', 35);
  makeInt('MEN_1', 1, 1, 'Check-in sobre proyectos', 5);

  await writeBatched(firestore, intItems);

  // 7. Computed global state
  await setDoc(doc(firestore, `users/${uid}/computed_global_state/latest`), {
    estado_global: 'RIESGO',
    dominant_drain_vars_7d: [],
    dominant_gain_vars_7d: [],
    reason_codes: ['SEEDED_DEMO'],
    explanation: {
      primary_cause: 'Estrés laboral residual + patrón de sueño recuperándose',
      secondary_causes: ['Cortisol ligeramente elevado', 'Dopamina moderada'],
      modifiers: ['Hábitos en mejora sostenida — tendencia positiva'],
    },
    updatedAt: new Date().toISOString(),
    rpg_stats: { dopamina: 62, serotonina: 64, cortisol: 38, foco: 61, energia: 58, sueno: 66, conexion_social: 55, carga_dopaminergica: 28, player_score: 68 },
    is_locked: false,
    lock_reason: '',
    lock_started_at: null,
    estimated_unlock_time: 0,
  });
}

const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

admin.initializeApp({ projectId: 'demo-sandbox' });

const db = admin.firestore();
const auth = admin.auth();

// ─── Demo user config ─────────────────────────────────────────────────────────

const DEMO_EMAIL = 'demo@axiom.app';
const DEMO_PASSWORD = 'axiom-demo-2024';
const DEMO_DISPLAY_NAME = 'Alex Demo';
const SEED_DAYS = 90;

// ─── ID counters ──────────────────────────────────────────────────────────────

let _evt = 0, _tx = 0, _int = 0;
const nextEvtId = () => `EVT_${String(++_evt).padStart(4, '0')}`;
const nextTxId  = () => `TX_${String(++_tx).padStart(4, '0')}`;
const nextIntId = () => `INT_${String(++_int).padStart(4, '0')}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoAt(daysAgo, hour = 8, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const r    = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const ch   = (p)       => Math.random() < p;
const pick = (arr)     => arr[r(0, arr.length - 1)];

// Narrative arc phases:
//   struggle  (days 90–61): baseline stress, poor habits
//   awakening (days 60–46): habits improving, insight
//   crisis    (days 45–31): relationship conflict + work pressure peak
//   recovery  (days 30–8) : consistent good habits, rebuilding
//   current   (days 7–0)  : stable, slight residual stress
function getPhase(daysAgo) {
  if (daysAgo >= 61) return 'struggle';
  if (daysAgo >= 46) return 'awakening';
  if (daysAgo >= 31) return 'crisis';
  if (daysAgo >= 8)  return 'recovery';
  return 'current';
}

function getDow(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.getDay(); // 0=Sun, 6=Sat
}

// ─── Batch writer (chunks of 450 to stay under Firestore 500-doc limit) ──────

async function writeDocs(collectionPath, docs) {
  const CHUNK = 450;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    docs.slice(i, i + CHUNK).forEach(({ id, data }) => {
      batch.set(db.doc(`${collectionPath}/${id}`), data);
    });
    await batch.commit();
  }
}

// ─── Auth: get or create demo user ───────────────────────────────────────────

async function getOrCreateDemoUser() {
  try {
    const user = await auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: DEMO_DISPLAY_NAME,
      emailVerified: true,
    });
    console.log(`  Created Auth user: ${user.uid}`);
    return user;
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const list = await auth.listUsers(1000);
      const existing = list.users.find(u => u.email === DEMO_EMAIL);
      if (!existing) throw new Error('Demo user not found after email-exists error');
      console.log(`  Reusing Auth user: ${existing.uid}`);
      return existing;
    }
    throw err;
  }
}

// ─── Static seed data ─────────────────────────────────────────────────────────

function buildStaticData(uid) {
  const nowIso = new Date().toISOString();

  const areas = [
    ['SALUD_FIS',  'Salud física',    9, 'Alta',  'Optimizar homeostasis',       'Energía/Sueño',         'Base fisiológica'],
    ['SALUD_MENT', 'Salud mental',    9, 'Alta',  'Foco y claridad',             'Foco/Dopamina',         'Capacidad cognitiva'],
    ['FINANZAS',   'Finanzas',        7, 'Media', 'Control impulsivo',           'Ahorro neto',           'Paz financiera'],
    ['RELACIONES', 'Relaciones',      8, 'Media', 'Vínculos nutritivos',         'Oxitocina/Sem',         'Soporte social'],
    ['EMOCION',    'Emoción',         8, 'Alta',  'Regulación emocional',        'Estabilidad/Cortisol',  'Gestión de estados'],
    ['DOPAMINA',   'Dopamina/Ocio',   8, 'Alta',  'Reset dopamínico',            'Foco/Serotonina',       'Gestión de recompensas'],
    ['CARRERA',    'Carrera',         7, 'Media', 'Productividad',               'Deep Work',             'Impacto profesional'],
    ['ENTORNO',    'Entorno',         6, 'Baja',  'Orden y claridad',            'Limpieza/Orden',        'Arquitectura del espacio'],
    ['PROPOSITO',  'Propósito',       9, 'Alta',  'Alineación con valores',      'Coherencia/Valores',    'Sentido de vida'],
  ].map(([area_id, area_nombre, peso_estrategico, prioridad, objetivo_12s, kpi_principal, notas]) => ({
    id: area_id,
    data: { area_id, area_nombre, peso_estrategico, prioridad, estado: 'OK', objetivo_12s, kpi_principal, umbral_riesgo: 5, umbral_critico: 3, ultima_revision: nowIso, notas },
  }));

  const hormones = [
    ['DOPAMINA',      'Dopamina',              56, 52, '40-70',  1],
    ['SEROTONINA',    'Serotonina',            62, 58, '60-90',  10],
    ['CORTISOL',      'Cortisol',              33, 25, '10-25',  5],
    ['FOCUS',         'Focus',                 59, 61, '70-100', 2],
    ['ENERGY',        'Energía',               57, 60, '70-100', 12],
    ['MELATONINA',    'Melatonina',            48, 50, '0-100',  24],
    ['OXITOCINA',     'Oxitocina',             41, 40, '50-90',  2],
    ['DOPA_LOAD',     'Carga Dopaminérgica',   32, 18, '0-30',   4],
    ['ENDORFINAS',    'Endorfinas',            46, 35, '30-80',  3],
    ['NORADRENALINA', 'Noradrenalina',         28, 20, '10-40',  1],
  ].map(([hormone_id, name, current_level, baseline, optimal_range, half_life_hours]) => ({
    id: hormone_id,
    data: { hormone_id, name, current_level, baseline, optimal_range, half_life_hours },
  }));

  const variables = [
    ['SUEÑO_PROF',    'Sueño profundo',       'SALUD_FIS',  'Física',     1,  10, 'Lineal',      0, 1, 1, 'Media'],
    ['SUEÑO_BAJO',    'Sueño insuficiente',   'SALUD_FIS',  'Física',    -1,  10, 'Lineal',      0, 1, 2, 'Media'],
    ['FUERZA',        'Ejercicio fuerza',      'SALUD_FIS',  'Física',     1,   8, 'Lineal',      1, 2, 3, 'Alta'],
    ['CARDIO',        'Ejercicio aeróbico',    'SALUD_FIS',  'Física',     1,   8, 'Lineal',      0, 1, 3, 'Alta'],
    ['HEALTHY_MEAL',  'Comer saludable',       'SALUD_FIS',  'Física',     1,   5, 'Lineal',      0, 1, 2, 'Alta'],
    ['AZUCAR',        'Azúcar alta',           'SALUD_FIS',  'Física',    -1,   8, 'Exponencial', 0, 1, 2, 'Alta'],
    ['MEDITATION',    'Meditación',            'SALUD_MENT', 'Conductual', 1,   7, 'Lineal',      0, 1, 1, 'Alta'],
    ['LEARNING',      'Aprendizaje',           'SALUD_MENT', 'Mental',     1,   6, 'Lineal',      0, 1, 2, 'Alta'],
    ['DEEP_WORK',     'Trabajo profundo',      'CARRERA',    'Mental',     1,   9, 'Lineal',      0, 1, 2, 'Alta'],
    ['PROCRAST',      'Procrastinar',          'CARRERA',    'Conductual',-1,   6, 'Lineal',      0, 1, 2, 'Alta'],
    ['WORK_STRESS',   'Estrés laboral',        'CARRERA',    'Mental',    -1,   8, 'Lineal',      0, 1, 2, 'Media'],
    ['SOCIAL_OK',     'Social nutritivo',      'RELACIONES', 'Social',     1,   8, 'Lineal',      0, 1, 2, 'Media'],
    ['ARGUMENT',      'Discusión',             'RELACIONES', 'Social',    -1,   7, 'Lineal',      0, 1, 1, 'Media'],
    ['GRATITUDE',     'Gratitud',              'EMOCION',    'Conductual', 1,   7, 'Lineal',      0, 2, 1, 'Alta'],
    ['FRUSTRATION',   'Frustración',           'EMOCION',    'Mental',    -1,   6, 'Lineal',      0, 1, 2, 'Media'],
    ['DOOMSCROLLING', 'Doomscrolling',         'DOPAMINA',   'Conductual',-1,   9, 'Exponencial', 0, 1, 2, 'Alta'],
    ['PORNO',         'Pornografía',           'DOPAMINA',   'Conductual',-1,  10, 'Exponencial', 0, 2, 1, 'Alta'],
    ['ENV_ORDER',     'Orden entorno',         'ENTORNO',    'Entorno',    1,   6, 'Lineal',      0, 1, 1, 'Alta'],
    ['ENV_CHAOS',     'Caos entorno',          'ENTORNO',    'Entorno',   -1,   6, 'Lineal',      0, 1, 1, 'Media'],
    ['PURPOSE_SENSE', 'Sentido propósito',     'PROPOSITO',  'Conductual', 1,   9, 'Lineal',      0, 3, 1, 'Alta'],
  ].map(([var_id, var_nombre, area_id, tipo, polaridad, impacto_base, curva, delay_dias, duracion_dias, umbral_riesgo, controlabilidad]) => ({
    id: var_id,
    data: { var_id, var_nombre, area_id, tipo, polaridad, impacto_base, curva, delay_dias, duracion_dias, umbral_riesgo, controlabilidad, activo: true },
  }));

  const states = [
    ['OK',     'Homeostasis equilibrada',      'Ninguna',             'Optimización'],
    ['RIESGO', 'Desviación hormonal detectada','Evitar dopamina rápida','Estabilización'],
    ['CRITICO','Agotamiento de recursos',      'Modo supervivencia',  'Rescate'],
  ].map(([estado_id, condicion, restricciones, prioridad]) => ({
    id: estado_id,
    data: { estado_id, condicion, restricciones, prioridad },
  }));

  const protocols = [
    ['P_RESET_5',     'Reseteo 5 min',         'RIESGO', '1. Beber agua. 2. Respirar 4-7-8. 3. Estirar.',                              5],
    ['P_DEEP_RECOVERY','Recuperación profunda', 'CRITICO','1. Silencio. 2. Dormir siesta corta. 3. Paseo suave. 4. Sin pantallas.',     30],
    ['P_FOCUS_BLOCK', 'Bloque de foco',         'OK',     '1. Temporizador 50m. 2. Móvil fuera. 3. Tarea única.',                      50],
  ].map(([protocolo_id, nombre, estado_disparador, pasos, duracion_min]) => ({
    id: protocolo_id,
    data: { protocolo_id, nombre, estado_disparador, pasos, duracion_min },
  }));

  const relations = [
    ['FAM_1', 'Lucía',  'Pareja',  7, 9, 'Diaria'],
    ['AMI_1', 'Marcos', 'Amigo',   5, 8, 'Semanal'],
    ['JOB_1', 'Sofía',  'Trabajo', 1, 7, 'Semanal'],
    ['MEN_1', 'Andrés', 'Mentor',  6, 9, 'Mensual'],
  ].map(([persona_id, nombre, rol, energia_neta, respeto, frecuencia]) => ({
    id: persona_id,
    data: { persona_id, nombre, rol, energia_neta, respeto, frecuencia },
  }));

  const accounts = [
    ['BANCO_1', 'Banco',    4850],
    ['INV_1',   'Inversion',7200],
    ['CASH_1',  'Efectivo', 180],
  ].map(([cuenta_id, tipo, saldo]) => ({
    id: cuenta_id,
    data: { cuenta_id, tipo, saldo },
  }));

  const debts = [
    ['DEBT_CARD', 'Visa Oro',         'Tarjeta',          2200, 21.5, 24, 140, 1260, 1260, daysFromNow(-380), 'Revolving', 0, true, 'Reducir plazo', 'Alta',  'Alto',  43, 'Activa'],
    ['DEBT_LOAN', 'Préstamo portátil','Préstamo personal', 1800,  8.9, 18, 108,  740,  740, daysFromNow(-220), 'Francés',   0, true, 'Reducir plazo', 'Media', 'Medio', 59, 'Activa'],
  ].map(([debt_id, nombre, tipo, principal_inicial, interes_tae, plazo_total_meses, cuota_mensual, saldo_actual, saldo_pendiente, fecha_inicio, tipo_amortizacion, comision_amortizacion, permite_amortizacion, opcion_amortizacion, prioridad_manual, estres_psicologico, porcentaje_pagado, estado_deuda]) => ({
    id: debt_id,
    data: { debt_id, nombre, tipo, principal_inicial, interes_tae, plazo_total_meses, cuota_mensual, saldo_actual, saldo_pendiente, fecha_inicio, tipo_amortizacion, comision_amortizacion, permite_amortizacion, opcion_amortizacion, prioridad_manual, estres_psicologico, porcentaje_pagado, estado_deuda },
  }));

  const skills = [
    ['SKILL_FOCUS', 'Deep Work',       'CARRERA',  5, 8, 640, 'Activa', 'Horas de foco/semana'],
    ['SKILL_FIN',   'Orden financiero','FINANZAS',  4, 7, 430, 'Activa', 'Ahorro neto mensual'],
    ['SKILL_REG',   'Autorregulación', 'EMOCION',   6, 8, 720, 'Activa', 'Días estables por semana'],
  ].map(([habilidad_id, nombre, area_id, nivel_actual, nivel_objetivo, xp, estado, kpi]) => ({
    id: habilidad_id,
    data: { habilidad_id, nombre, area_id, nivel_actual, nivel_objetivo, xp, estado, kpi },
  }));

  const systems = [
    ['SYS_FOCUS', 'SKILL_FOCUS', '2 bloques de foco al día',       'Diaria',  'Activo', 'P_RESET_5'],
    ['SYS_FIN',   'SKILL_FIN',   'Revisión financiera semanal',    'Semanal', 'Activo', 'P_RESET_5'],
    ['SYS_REG',   'SKILL_REG',   'Higiene emocional diaria',       'Diaria',  'Activo', 'P_DEEP_RECOVERY'],
  ].map(([sistema_id, habilidad_id, objetivo, frecuencia, estado, protocolo_fallo]) => ({
    id: sistema_id,
    data: { sistema_id, habilidad_id, objetivo, frecuencia, estado, protocolo_fallo },
  }));

  const habits = [
    ['HB_1', 'SYS_FOCUS', 'DEEP_WORK',    'Diaria',  50, true,  'Bloque matinal sin interrupciones'],
    ['HB_2', 'SYS_REG',   'MEDITATION',   'Diaria',  10, true,  'Meditación breve al despertar'],
    ['HB_3', 'SYS_REG',   'GRATITUDE',    'Diaria',   5, true,  'Cierre del día con gratitud'],
    ['HB_4', 'SYS_FIN',   'ENV_ORDER',    'Semanal', 30, true,  'Ordenar escritorio y cuentas'],
    ['HB_5', 'SYS_FOCUS', 'HEALTHY_MEAL', 'Diaria',  20, true,  'Comida simple antes del bloque de tarde'],
  ].map(([habito_id, sistema_id, var_id, frecuencia, duracion_min, minimo_viable, description]) => ({
    id: habito_id,
    data: { habito_id, sistema_id, var_id, frecuencia, duracion_min, minimo_viable, description },
  }));

  const milestones = [
    ['MS_1', 'Completar 20 bloques de foco',          'SKILL_FOCUS', 'SYS_FOCUS', daysFromNow(14),  'Pendiente', '', 'Crear consistencia operativa', 'recurring', 12, 20],
    ['MS_2', 'Bajar deuda de tarjeta por debajo de 1000','SKILL_FIN','SYS_FIN',  daysFromNow(30),  'Pendiente', '', 'Reducir carga financiera',     'single',    0,  1],
    ['MS_3', '14 días seguidos meditando',             'SKILL_REG',   'SYS_REG',  daysFromNow(10),  'Pendiente', '', 'Bajar reactividad',            'recurring', 8,  14],
    ['MS_4', 'Correr 5km sin parar',                   'SKILL_FOCUS', 'SYS_FOCUS', daysFromNow(-20), 'Completado', isoAt(20), 'Aerobic base — logrado','single', 1, 1],
  ].map(([milestone_id, nombre, skill_id, system_id, fecha_objetivo, estado, fecha_completado, notas, milestone_type, progress_count, target_count]) => ({
    id: milestone_id,
    data: { milestone_id, nombre, skill_id, system_id, fecha_objetivo, estado, fecha_completado, notas, milestone_type, progress_count, target_count },
  }));

  const impactMatrix = [
    ['IM1',  'SUEÑO_PROF',    'CORTISOL',  -28, 12],
    ['IM2',  'SUEÑO_PROF',    'FOCUS',      28, 12],
    ['IM3',  'SUEÑO_PROF',    'ENERGY',     30, 12],
    ['IM4',  'SUEÑO_BAJO',    'CORTISOL',   30, 12],
    ['IM5',  'SUEÑO_BAJO',    'FOCUS',     -24, 12],
    ['IM6',  'SUEÑO_BAJO',    'ENERGY',    -32, 12],
    ['IM7',  'FUERZA',        'ENDORFINAS', 34, 18],
    ['IM8',  'FUERZA',        'DOPAMINA',   18, 18],
    ['IM9',  'CARDIO',        'SEROTONINA', 24, 18],
    ['IM10', 'CARDIO',        'ENERGY',     18, 18],
    ['IM11', 'MEDITATION',    'CORTISOL',  -24,  8],
    ['IM12', 'MEDITATION',    'SEROTONINA', 18,  8],
    ['IM13', 'DEEP_WORK',     'FOCUS',      35,  4],
    ['IM14', 'DEEP_WORK',     'DOPAMINA',   12,  4],
    ['IM15', 'WORK_STRESS',   'CORTISOL',   26,  8],
    ['IM16', 'WORK_STRESS',   'FOCUS',     -20,  8],
    ['IM17', 'SOCIAL_OK',     'OXITOCINA',  38,  6],
    ['IM18', 'SOCIAL_OK',     'SEROTONINA', 16,  6],
    ['IM19', 'ARGUMENT',      'CORTISOL',   18,  5],
    ['IM20', 'ARGUMENT',      'OXITOCINA', -12,  5],
    ['IM21', 'DOOMSCROLLING', 'DOPA_LOAD',  55,  4],
    ['IM22', 'DOOMSCROLLING', 'FOCUS',     -30,  4],
    ['IM23', 'PORNO',         'DOPA_LOAD',  75,  6],
    ['IM24', 'PORNO',         'SEROTONINA',-26,  6],
    ['IM25', 'GRATITUDE',     'SEROTONINA', 16, 12],
    ['IM26', 'ENV_ORDER',     'FOCUS',      10,  8],
    ['IM27', 'ENV_CHAOS',     'CORTISOL',   12,  8],
    ['IM28', 'PURPOSE_SENSE', 'DOPAMINA',   20, 18],
  ].map(([matrix_id, var_id, hormone_id, effect_size, duration_hours]) => ({
    id: matrix_id,
    data: { matrix_id, var_id, hormone_id, effect_size, duration_hours },
  }));

  const dashboardConfig = [
    ['bio_auto_calibration', JSON.stringify({ last_calibrated_at: nowIso, confidence: 0.74, transitions: 48 })],
    ['debt_strategy', 'snowball'],
    ['financial_pockets', JSON.stringify({
      Deudas: 1200, Vivienda: 900, 'Desarrollo Personal': 250,
      Alimentación: 420, Transporte: 180, 'Salud y Bienestar': 150,
      'Ocio y Suscripciones': 200, Compras: 120,
    })],
    ['model_flags', JSON.stringify({ clinical_v2_enabled: true })],
  ].map(([key, value]) => ({ id: key, data: { key, value } }));

  return { areas, hormones, variables, states, protocols, relations, accounts, debts, skills, systems, habits, milestones, impactMatrix, dashboardConfig };
}

// ─── Historical events (90 days) ─────────────────────────────────────────────

function makeEvent(daysAgo, var_id, intensidad, duracion_min, contexto, hour, opts = {}) {
  const id = nextEvtId();
  return {
    id,
    data: {
      evento_id: id,
      fecha: isoAt(daysAgo, hour, r(0, 55)),
      var_id,
      intensidad,
      duracion_min,
      contexto,
      impulsivo: opts.impulsivo ?? false,
      persona_id: opts.persona_id ?? '',
      monto: opts.monto ?? 0,
      tipo: 'Variable',
      milestone_id: '',
    },
  };
}

function generateDayEvents(daysAgo) {
  const events = [];
  const phase = getPhase(daysAgo);
  const dow = getDow(daysAgo);
  const isWeekend = dow === 0 || dow === 6;
  const isWorkday = !isWeekend;

  const P = {
    //                         struggle awakening crisis recovery current
    sleep_good:    { struggle: 0.15, awakening: 0.58, crisis: 0.20, recovery: 0.88, current: 0.72 },
    exercise:      { struggle: 0.20, awakening: 0.52, crisis: 0.22, recovery: 0.68, current: 0.55 },
    meditation:    { struggle: 0.04, awakening: 0.55, crisis: 0.12, recovery: 0.85, current: 0.70 },
    deep_work:     { struggle: 0.12, awakening: 0.48, crisis: 0.18, recovery: 0.78, current: 0.65 },
    healthy_meal:  { struggle: 0.30, awakening: 0.62, crisis: 0.32, recovery: 0.80, current: 0.65 },
    work_stress:   { struggle: 0.68, awakening: 0.38, crisis: 0.88, recovery: 0.18, current: 0.32 },
    doomscroll:    { struggle: 0.70, awakening: 0.28, crisis: 0.62, recovery: 0.08, current: 0.20 },
    gratitude:     { struggle: 0.02, awakening: 0.25, crisis: 0.08, recovery: 0.78, current: 0.65 },
    purpose:       { struggle: 0.04, awakening: 0.20, crisis: 0.06, recovery: 0.48, current: 0.42 },
    learning:      { struggle: 0.08, awakening: 0.40, crisis: 0.10, recovery: 0.52, current: 0.48 },
    env_order:     { struggle: 0.15, awakening: 0.40, crisis: 0.18, recovery: 0.68, current: 0.55 },
    social_ok:     { struggle: 0.12, awakening: 0.30, crisis: 0.08, recovery: 0.45, current: 0.35 },
    frustration:   { struggle: 0.38, awakening: 0.15, crisis: 0.52, recovery: 0.08, current: 0.15 },
    procrastinate: { struggle: 0.50, awakening: 0.18, crisis: 0.40, recovery: 0.06, current: 0.14 },
    sugar:         { struggle: 0.28, awakening: 0.10, crisis: 0.30, recovery: 0.05, current: 0.10 },
    porno:         { struggle: 0.12, awakening: 0.05, crisis: 0.18, recovery: 0.02, current: 0.04 },
  };
  const p = (key) => P[key][phase];

  // ── SLEEP (every day) ──
  const goodSleep = ch(p('sleep_good'));
  const sleepInt = goodSleep ? r(phase === 'recovery' ? 4 : 3, 5) : r(2, 3);
  const sleepH = (goodSleep ? r(74, 87) : r(54, 70)) / 10;
  events.push(makeEvent(daysAgo,
    goodSleep ? 'SUEÑO_PROF' : 'SUEÑO_BAJO', sleepInt, 60,
    goodSleep ? `${sleepH.toFixed(1)}h sueño — descansé bien` : `${sleepH.toFixed(1)}h sueño — noche fragmentada`,
    7
  ));

  // ── EXERCISE ──
  if (ch(p('exercise'))) {
    const type = ch(0.55) ? 'FUERZA' : 'CARDIO';
    events.push(makeEvent(daysAgo, type, r(3, 5), r(35, 65),
      type === 'FUERZA'
        ? pick(['Gym — press + sentadillas', 'Calistenia — series cortas', 'Entrenamiento fuerza en casa'])
        : pick(['Carrera matutina 5km', 'Bici — 35min', 'HIIT 20min']),
      isWeekend ? r(10, 12) : r(7, 9)
    ));
  }

  // ── MEDITATION ──
  if (ch(p('meditation'))) {
    events.push(makeEvent(daysAgo, 'MEDITATION', r(3, 5), r(10, 20),
      pick(['Respiración 4-7-8 — 10min', 'Body scan 15min', 'Meditación guiada', 'Silencio activo sin pantallas']),
      r(7, 9)
    ));
  }

  // ── DEEP WORK (workdays) ──
  if (isWorkday && ch(p('deep_work'))) {
    events.push(makeEvent(daysAgo, 'DEEP_WORK', r(3, 5), r(50, 90),
      pick(['Bloque matinal 60min — sin interrupciones', 'Sesión deep work — proyecto principal', 'Modo avión 90min — alta producción']),
      r(9, 11)
    ));
  }

  // ── HEALTHY MEAL ──
  if (ch(p('healthy_meal'))) {
    events.push(makeEvent(daysAgo, 'HEALTHY_MEAL', r(3, 4), 30,
      pick(['Menú equilibrado — proteína + vegetales', 'Ensalada completa + pollo', 'Comida sencilla sin procesados']),
      r(13, 15)
    ));
  }

  // ── WORK STRESS (workdays) ──
  if (isWorkday && ch(p('work_stress'))) {
    const si = phase === 'crisis' ? r(4, 5) : phase === 'struggle' ? r(3, 4) : r(2, 3);
    events.push(makeEvent(daysAgo, 'WORK_STRESS', si, r(60, 240),
      pick(['Reunión sin resultado — 2h perdidas', 'Deadline ajustado — presión alta', 'Feedback negativo — mal gestionado', 'Múltiples interrupciones sin foco posible']),
      r(10, 17)
    ));
  }

  // ── DOOMSCROLLING ──
  if (ch(p('doomscroll'))) {
    const di = (phase === 'crisis' || phase === 'struggle') ? r(3, 5) : r(1, 3);
    events.push(makeEvent(daysAgo, 'DOOMSCROLLING', di, r(20, 80),
      pick(['Instagram antes de dormir — 45min sin querer', 'Noticias en bucle — negatividad', 'YouTube autopilot — 1h sin valor', 'Twitter compulsivo antes de dormir']),
      r(21, 23), { impulsivo: true }
    ));
  }

  // ── GRATITUDE ──
  if (ch(p('gratitude'))) {
    events.push(makeEvent(daysAgo, 'GRATITUDE', r(3, 5), 10,
      pick(['3 cosas positivas del día', 'Diario de agradecimiento 10min', 'Reflexión nocturna — qué fue bien']),
      r(21, 22)
    ));
  }

  // ── PURPOSE SENSE ──
  if (ch(p('purpose'))) {
    events.push(makeEvent(daysAgo, 'PURPOSE_SENSE', r(3, 5), 20,
      pick(['Revisión de objetivos — alineación alta', 'Sentido de avance real hoy', 'Momento de claridad sobre mi dirección']),
      r(20, 22)
    ));
  }

  // ── LEARNING ──
  if (ch(p('learning'))) {
    events.push(makeEvent(daysAgo, 'LEARNING', r(3, 4), r(20, 45),
      pick(['Lectura técnica 30min', 'Curso online — 1 módulo completado', 'Podcast educativo en el trayecto']),
      r(18, 20)
    ));
  }

  // ── ENV ORDER (weekends mostly) ──
  if (isWeekend && ch(p('env_order'))) {
    events.push(makeEvent(daysAgo, 'ENV_ORDER', r(3, 4), r(20, 45),
      pick(['Limpieza semanal — espacio despejado', 'Orden escritorio + cuentas revisadas', 'Organicé habitación — mucho mejor']),
      r(11, 14)
    ));
  }

  // ── SOCIAL NUTRITIVO ──
  if ((isWeekend || ch(0.12)) && ch(p('social_ok'))) {
    events.push(makeEvent(daysAgo, 'SOCIAL_OK', r(3, 5), r(60, 180),
      pick(['Tarde con Marcos — conversación genuina', 'Cena familiar — buena energía', 'Quedada espontánea — me recargó']),
      r(16, 20)
    ));
  }

  // ── FRUSTRATION ──
  if (ch(p('frustration'))) {
    events.push(makeEvent(daysAgo, 'FRUSTRATION', r(2, 4), 30,
      pick(['Sin avance en tarea principal — bloqueo', 'Expectativa no cumplida', 'Errores repetidos — frustración acumulada']),
      r(15, 19)
    ));
  }

  // ── PROCRASTINATION (workdays) ──
  if (isWorkday && ch(p('procrastinate'))) {
    events.push(makeEvent(daysAgo, 'PROCRAST', r(2, 4), r(30, 90),
      pick(['2h de distracción sin querer', 'Evité la tarea difícil', 'Revisé email en bucle sin avanzar']),
      r(14, 18), { impulsivo: true }
    ));
  }

  // ── SUGAR ──
  if (ch(p('sugar'))) {
    events.push(makeEvent(daysAgo, 'AZUCAR', r(2, 4), 30,
      pick(['Atracón dulces por estrés', 'Merienda azucarada — impulso', 'Chocolate tarde difícil']),
      r(16, 18), { impulsivo: true }
    ));
  }

  // ── PORNO ──
  if (ch(p('porno'))) {
    events.push(makeEvent(daysAgo, 'PORNO', r(3, 5), r(20, 60),
      'Comportamiento impulsivo — dopamina baja',
      r(22, 23), { impulsivo: true }
    ));
  }

  // ── FIXED CRISIS EVENTS: arguments with Lucía ──
  if (daysAgo === 43) {
    events.push(makeEvent(daysAgo, 'ARGUMENT', 5, 60,
      'Discusión fuerte con Lucía — sin resolución, nos fuimos a dormir en silencio',
      21, { persona_id: 'FAM_1' }
    ));
  }
  if (daysAgo === 38) {
    events.push(makeEvent(daysAgo, 'ARGUMENT', 4, 45,
      'Tensión con Lucía — distancia emocional evidente, no hablamos de lo importante',
      20, { persona_id: 'FAM_1' }
    ));
  }
  if (daysAgo === 33) {
    events.push(makeEvent(daysAgo, 'ARGUMENT', 2, 30,
      'Primera conversación honesta con Lucía — lento pero necesario',
      21, { persona_id: 'FAM_1' }
    ));
  }

  return events;
}

function generateAllEvents() {
  const all = [];
  for (let d = SEED_DAYS; d >= 0; d--) {
    generateDayEvents(d).forEach(e => all.push(e));
  }
  return all;
}

// ─── Transactions (3 months) ──────────────────────────────────────────────────

function makeTx(tipo, categoria, monto, notas, daysAgo, cuenta_id = 'BANCO_1', opts = {}) {
  const id = nextTxId();
  return {
    id,
    data: {
      transaccion_id: id,
      fecha: isoAt(daysAgo, r(9, 18), r(0, 55)),
      tipo,
      categoria,
      monto,
      impulsivo: opts.impulsivo ?? false,
      var_id: opts.var_id ?? '',
      cuenta_id,
      deuda_id: opts.deuda_id ?? '',
      notas,
    },
  };
}

function generateTransactions() {
  const txs = [];
  const G = (t, c, m, n, d, cid, o) => txs.push(makeTx(t, c, m, n, d, cid, o));
  const I = (c, m, n, d, o)          => G('Ingreso', c, m, n, d, 'BANCO_1', o);
  const E = (c, m, n, d, o)          => G('Gasto',   c, m, n, d, 'BANCO_1', o);

  // ── Mes -2 (días 90-61) — El pantano ──
  I('Nómina',                 2800, 'Nómina enero',                  90);
  E('Vivienda',                900, 'Alquiler enero',                 88);
  E('Deudas',                  140, 'Pago tarjeta Visa',              87, { deuda_id: 'DEBT_CARD' });
  E('Deudas',                  108, 'Pago préstamo portátil',         87, { deuda_id: 'DEBT_LOAN' });
  E('Alimentación',       r(180,220),'Supermercado enero',            85);
  E('Transporte',          r(80,120),'Transporte mensual',            84);
  E('Ocio y Suscripciones',    35, 'Netflix + Spotify',               82);
  E('Alimentación',        r(40, 70),'Restaurante fin de semana',     81, { impulsivo: true });
  E('Compras',            r(50,150), 'Compra impulsiva Amazon',       79, { impulsivo: true });
  E('Salud y Bienestar',       45, 'Farmacia',                        75);
  E('Alimentación',        r(30, 55),'Comida fuera entre semana',     73, { impulsivo: true });
  E('Compras',             r(80,120),'Ropa nueva',                    70, { impulsivo: true });
  E('Ocio y Suscripciones', r(20,50),'Salida fin de semana',          68);
  E('Alimentación',        r(25, 45),'Delivery impulsivo',            65, { impulsivo: true });

  // ── Mes -1 (días 60-31) — Despertar → Crisis ──
  I('Nómina',                 2800, 'Nómina febrero',                 60);
  E('Vivienda',                900, 'Alquiler febrero',               58);
  E('Deudas',                  140, 'Pago tarjeta Visa',              57, { deuda_id: 'DEBT_CARD' });
  E('Deudas',                  108, 'Pago préstamo portátil',         57, { deuda_id: 'DEBT_LOAN' });
  E('Alimentación',       r(160,200),'Supermercado febrero',          55);
  E('Transporte',          r(80,100),'Transporte febrero',            54);
  E('Desarrollo Personal',     89, 'Curso online — programación',     50);
  E('Salud y Bienestar',   r(60, 90),'Gym — alta mensualidad',        50);
  E('Ocio y Suscripciones',    35, 'Netflix + Spotify',               49);
  // Crisis: gasto inesperado
  E('Salud y Bienestar',      450, 'Reparación coche — imprevisto',   42);
  E('Alimentación',        r(30, 55),'Comida fuera por estrés',       40, { impulsivo: true });
  E('Compras',             r(40, 80),'Compra impulsiva estrés',       38, { impulsivo: true });
  E('Alimentación',        r(30, 50),'Delivery en casa',              35, { impulsivo: true });
  E('Ocio y Suscripciones', r(15, 35),'Juego digital — evasión',     33, { impulsivo: true });

  // ── Mes 0 (días 30-0) — Reconstrucción → Actual ──
  I('Nómina',                 2800, 'Nómina marzo',                   30);
  E('Vivienda',                900, 'Alquiler marzo',                 28);
  E('Deudas',                  140, 'Pago tarjeta Visa',              27, { deuda_id: 'DEBT_CARD' });
  E('Deudas',                  108, 'Pago préstamo portátil',         27, { deuda_id: 'DEBT_LOAN' });
  E('Alimentación',       r(150,185),'Supermercado marzo',            25);
  E('Transporte',          r(70, 90),'Transporte marzo',              24);
  E('Salud y Bienestar',   r(60, 80),'Gym',                          23);
  E('Ocio y Suscripciones',    35, 'Suscripciones',                   22);
  E('Desarrollo Personal',     45, 'Libro técnico',                   18);
  E('Alimentación',        r(25, 45),'Comida con Marcos',             15);
  E('Alimentación',        r(20, 40),'Supermercado semanal',          10);
  E('Salud y Bienestar',       28, 'Suplementos',                      7);
  I('Freelance/Negocio',      350, 'Proyecto freelance pequeño',       5);
  E('Alimentación',        r(30, 50),'Compra semanal',                 3);
  G('Gasto', 'Deudas',        200, 'Amortización extra tarjeta',       2, 'BANCO_1', { deuda_id: 'DEBT_CARD' });

  return txs;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

function makeInt(persona_id, energia_resultante, respeto_percibido, contexto, daysAgo) {
  const id = nextIntId();
  return {
    id,
    data: {
      interaccion_id: id,
      fecha: isoAt(daysAgo, r(17, 22), r(0, 55)),
      persona_id,
      energia_resultante,
      respeto_percibido,
      contexto,
    },
  };
}

function generateInteractions() {
  const ints = [];

  // Lucía (pareja) — arco completo
  ints.push(makeInt('FAM_1',  0,  1, 'Noche tranquila en casa — sin mucha conexión',           85));
  ints.push(makeInt('FAM_1',  1,  1, 'Conversación bonita sobre planes futuros',               80));
  ints.push(makeInt('FAM_1',  0,  1, 'Cenamos juntos — poco presentes los dos',                75));
  ints.push(makeInt('FAM_1', -1,  0, 'Discusión sobre falta de tiempo — tensión acumulada',    70));
  ints.push(makeInt('FAM_1',  1,  1, 'Noche de juegos en casa — riendo mucho',                 55));
  ints.push(makeInt('FAM_1',  1,  1, 'Paseo largo — conversación profunda',                    50));
  ints.push(makeInt('FAM_1', -1,  0, 'Discusión fuerte — no nos entendimos para nada',         43));
  ints.push(makeInt('FAM_1', -1,  0, 'Tensión en casa — distancia emocional',                  38));
  ints.push(makeInt('FAM_1',  0,  1, 'Primera conversación honesta — progreso lento',           33));
  ints.push(makeInt('FAM_1',  1,  1, 'Reconexión real — conversación sin filtros',              28));
  ints.push(makeInt('FAM_1',  1,  1, 'Tarde de sábado juntos — muy bien',                      21));
  ints.push(makeInt('FAM_1',  1,  1, 'Cena románnica — reconexión total',                      14));
  ints.push(makeInt('FAM_1',  1,  1, 'Noche normal pero bonita',                                 7));
  ints.push(makeInt('FAM_1',  1,  1, 'Conversación matutina — me sentí conectado',               2));

  // Marcos (amigo)
  ints.push(makeInt('AMI_1',  1,  1, 'Cañas del viernes — conversación genuina',               84));
  ints.push(makeInt('AMI_1',  0,  1, 'Café rápido — poco tiempo',                              70));
  ints.push(makeInt('AMI_1',  1,  1, 'Pádel y cena — muy bien',                                56));
  ints.push(makeInt('AMI_1',  1,  1, 'Conversación sobre proyectos — me inspiró',               42));
  ints.push(makeInt('AMI_1',  1,  1, 'Cumple de Marcos — energía muy positiva',                 21));
  ints.push(makeInt('AMI_1',  1,  1, 'Comida de la semana — buena charla',                       7));

  // Sofía (trabajo)
  ints.push(makeInt('JOB_1', -1,  0, 'Reunión sin sentido — 2h perdidas',                      88));
  ints.push(makeInt('JOB_1',  0,  1, 'Check-in semanal — neutral',                             81));
  ints.push(makeInt('JOB_1', -1,  0, 'Feedback crítico — tono poco apropiado',                 74));
  ints.push(makeInt('JOB_1',  0,  1, 'Proyecto nuevo asignado — claro',                        60));
  ints.push(makeInt('JOB_1', -1, -1, 'Crítica injusta en público — me afectó mucho',            44));
  ints.push(makeInt('JOB_1',  0,  1, 'Reunión técnica — útil',                                  30));
  ints.push(makeInt('JOB_1',  1,  1, 'Reconocimiento de mi trabajo — sorpresa positiva',         14));

  // Andrés (mentor)
  ints.push(makeInt('MEN_1',  1,  1, 'Sesión mensual — claridad estratégica',                  85));
  ints.push(makeInt('MEN_1',  1,  1, 'Llamada breve — consejo muy útil',                       55));
  ints.push(makeInt('MEN_1',  1,  1, 'Sesión mensual — perspectiva diferente',                  25));
  ints.push(makeInt('MEN_1',  1,  1, 'Check-in sobre proyectos — muy motivador',                 5));

  return ints;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Axiom — Seed Demo User');
  console.log('══════════════════════════════════════\n');

  console.log('1/6  Auth: Creando usuario demo@axiom.app...');
  const user = await getOrCreateDemoUser();
  const uid = user.uid;
  const basePath = `users/${uid}`;

  console.log('2/6  Firestore: Documento de usuario...');
  await db.doc(basePath).set({
    uid,
    email: DEMO_EMAIL,
    displayName: DEMO_DISPLAY_NAME,
    photoURL: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDemo: true,
  }, { merge: true });

  await db.doc(`${basePath}/playerProfile/main-profile`).set({
    age: 28,
    weight_kg: 75,
    height_cm: 179,
    mbti_type: 'INTJ',
    enneagram_type: 'Tipo 5',
    facet_mind_introverted: 76,
    facet_mind_extraverted: 24,
    facet_energy_intuitive: 72,
    facet_energy_observant: 28,
    facet_nature_thinking: 68,
    facet_nature_feeling: 32,
    facet_tactics_judging: 74,
    facet_tactics_prospecting: 26,
    facet_identity_assertive: 60,
    facet_identity_turbulent: 40,
    personality_openness: 80,
    personality_conscientiousness: 75,
    personality_extraversion: 35,
    personality_agreeableness: 58,
    personality_neuroticism: 42,
    sensitivity_stress: 1.14,
    sensitivity_dopamine: 1.22,
    sensitivity_sleep: 1.18,
    sensitivity_emotional: 1.08,
    sensitivity_environmental: 1.11,
    sensitivity_pressure: 1.16,
  }, { merge: true });

  console.log('3/6  Firestore: Datos estáticos (áreas, hormonas, hábitos...)...');
  const s = buildStaticData(uid);
  await writeDocs(`${basePath}/areas`,          s.areas);
  await writeDocs(`${basePath}/hormones`,       s.hormones);
  await writeDocs(`${basePath}/variables`,      s.variables);
  await writeDocs(`${basePath}/states`,         s.states);
  await writeDocs(`${basePath}/protocols`,      s.protocols);
  await writeDocs(`${basePath}/relations`,      s.relations);
  await writeDocs(`${basePath}/accounts`,       s.accounts);
  await writeDocs(`${basePath}/debts`,          s.debts);
  await writeDocs(`${basePath}/skills`,         s.skills);
  await writeDocs(`${basePath}/systems`,        s.systems);
  await writeDocs(`${basePath}/habits`,         s.habits);
  await writeDocs(`${basePath}/milestones`,     s.milestones);
  await writeDocs(`${basePath}/impactMatrix`,   s.impactMatrix);
  await writeDocs(`${basePath}/dashboardConfig`,s.dashboardConfig);

  console.log('4/6  Firestore: Generando 90 días de eventos...');
  const events = generateAllEvents();
  await writeDocs(`${basePath}/events`, events);

  console.log('5/6  Firestore: Generando transacciones financieras...');
  const txs = generateTransactions();
  await writeDocs(`${basePath}/transactions`, txs);

  console.log('6/6  Firestore: Generando interacciones sociales...');
  const interactions = generateInteractions();
  await writeDocs(`${basePath}/interactions`, interactions);

  // Computed global state inicial
  await db.doc(`${basePath}/computed_global_state/latest`).set({
    estado_global: 'RIESGO',
    dominant_drain_vars_7d: [],
    dominant_gain_vars_7d: [],
    reason_codes: ['SEEDED_DEMO'],
    explanation: {
      primary_cause: 'Estrés laboral residual + patrón de sueño recuperándose',
      secondary_causes: ['Cortisol ligeramente elevado', 'Dopamina moderada'],
      modifiers: ['Hábitos en mejora sostenida — tendencia positiva'],
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    rpg_stats: { dopamina: 62, serotonina: 64, cortisol: 38, foco: 61, energia: 58, sueno: 66, conexion_social: 55, carga_dopaminergica: 28, player_score: 68 },
    is_locked: false,
    lock_reason: '',
    lock_started_at: null,
    estimated_unlock_time: 0,
  }, { merge: true });

  console.log('\n══════════════════════════════════════');
  console.log(JSON.stringify({
    ok: true,
    uid,
    email: DEMO_EMAIL,
    seeded: {
      areas: s.areas.length,
      hormones: s.hormones.length,
      variables: s.variables.length,
      events: events.length,
      transactions: txs.length,
      interactions: interactions.length,
      relations: s.relations.length,
      skills: s.skills.length,
      habits: s.habits.length,
      milestones: s.milestones.length,
    },
  }, null, 2));
  console.log('\nListo. Credenciales de acceso:');
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main().catch(err => { console.error(err); process.exit(1); });

/**
 * Client-side demo seeder.
 * Seeds all demo data via the REST API (/api/data and /api/onboarding/setup).
 */

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

async function postMany(collection: string, items: Record<string, unknown>[]): Promise<void> {
  await Promise.all(
    items.map(data =>
      fetch(`/api/data/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    )
  );
}

async function putDoc(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
  await fetch(`/api/data/${collection}/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// ─── Event generation ─────────────────────────────────────────────────────────

interface SeedDoc { collection: string; data: Record<string, unknown> }

function makeEvent(
  daysAgo: number,
  var_id: string,
  intensidad: number,
  duracion_min: number,
  contexto: string,
  hour: number,
  opts: { impulsivo?: boolean; persona_id?: string } = {}
): SeedDoc {
  const id = nextEvtId();
  return {
    collection: 'events',
    data: {
      evento_id: id,
      fecha: isoAt(daysAgo, hour, r(0, 55)),
      var_id, intensidad, duracion_min, contexto,
      impulsivo: opts.impulsivo ?? false,
      persona_id: opts.persona_id ?? '',
      monto: 0, tipo: 'Variable', milestone_id: '',
    },
  };
}

function generateDayEvents(daysAgo: number): SeedDoc[] {
  const events: SeedDoc[] = [];
  const phase = getPhase(daysAgo);
  const dow = getDow(daysAgo);
  const isWeekend = dow === 0 || dow === 6;
  const isWorkday = !isWeekend;

  type PhaseMap = { struggle: number; awakening: number; crisis: number; recovery: number; current: number };

  const P: Record<string, PhaseMap> = {
    sleep_good:   { struggle: 0.15, awakening: 0.58, crisis: 0.20, recovery: 0.88, current: 0.72 },
    exercise:     { struggle: 0.20, awakening: 0.52, crisis: 0.22, recovery: 0.68, current: 0.55 },
    meditation:   { struggle: 0.04, awakening: 0.55, crisis: 0.12, recovery: 0.85, current: 0.70 },
    deep_work:    { struggle: 0.12, awakening: 0.48, crisis: 0.18, recovery: 0.78, current: 0.65 },
    healthy_meal: { struggle: 0.30, awakening: 0.62, crisis: 0.32, recovery: 0.80, current: 0.65 },
    work_stress:  { struggle: 0.68, awakening: 0.38, crisis: 0.88, recovery: 0.18, current: 0.32 },
    doomscroll:   { struggle: 0.70, awakening: 0.28, crisis: 0.62, recovery: 0.08, current: 0.20 },
    gratitude:    { struggle: 0.02, awakening: 0.25, crisis: 0.08, recovery: 0.78, current: 0.65 },
    purpose:      { struggle: 0.04, awakening: 0.20, crisis: 0.06, recovery: 0.48, current: 0.42 },
    learning:     { struggle: 0.08, awakening: 0.40, crisis: 0.10, recovery: 0.52, current: 0.48 },
    env_order:    { struggle: 0.15, awakening: 0.40, crisis: 0.18, recovery: 0.68, current: 0.55 },
    social_ok:    { struggle: 0.12, awakening: 0.30, crisis: 0.08, recovery: 0.45, current: 0.35 },
    frustration:  { struggle: 0.38, awakening: 0.15, crisis: 0.52, recovery: 0.08, current: 0.15 },
    procrastinate:{ struggle: 0.50, awakening: 0.18, crisis: 0.40, recovery: 0.06, current: 0.14 },
    sugar:        { struggle: 0.28, awakening: 0.10, crisis: 0.30, recovery: 0.05, current: 0.10 },
  };

  const p = (key: string) => P[key][phase as keyof PhaseMap];

  const goodSleep = ch(p('sleep_good'));
  const sleepInt = goodSleep ? r(phase === 'recovery' ? 4 : 3, 5) : r(2, 3);
  const sleepH = ((goodSleep ? r(74, 87) : r(54, 70)) / 10).toFixed(1);
  events.push(makeEvent(daysAgo, goodSleep ? 'SUEÑO_PROF' : 'SUEÑO_BAJO', sleepInt, 60,
    goodSleep ? `${sleepH}h sueño — descansé bien` : `${sleepH}h sueño — noche fragmentada`, 7));

  if (ch(p('exercise'))) {
    const type = ch(0.55) ? 'FUERZA' : 'CARDIO';
    events.push(makeEvent(daysAgo, type, r(3, 5), r(35, 65),
      type === 'FUERZA' ? pick(['Gym — press + sentadillas', 'Calistenia en casa']) : pick(['Carrera matutina 5km', 'Bici 35min', 'HIIT 20min']),
      isWeekend ? r(10, 12) : r(7, 9)));
  }
  if (ch(p('meditation'))) events.push(makeEvent(daysAgo, 'MEDITATION', r(3, 5), r(10, 20), pick(['Respiración 4-7-8', 'Body scan 15min', 'Meditación guiada']), r(7, 9)));
  if (isWorkday && ch(p('deep_work'))) events.push(makeEvent(daysAgo, 'DEEP_WORK', r(3, 5), r(50, 90), pick(['Bloque matinal 60min — sin interrupciones', 'Modo avión 90min']), r(9, 11)));
  if (ch(p('healthy_meal'))) events.push(makeEvent(daysAgo, 'HEALTHY_MEAL', r(3, 4), 30, 'Menú equilibrado — proteína + vegetales', r(13, 15)));
  if (isWorkday && ch(p('work_stress'))) {
    const si = phase === 'crisis' ? r(4, 5) : phase === 'struggle' ? r(3, 4) : r(2, 3);
    events.push(makeEvent(daysAgo, 'WORK_STRESS', si, r(60, 240), pick(['Reunión sin resultado — 2h perdidas', 'Deadline ajustado — presión alta']), r(10, 17)));
  }
  if (ch(p('doomscroll'))) {
    const di = (phase === 'crisis' || phase === 'struggle') ? r(3, 5) : r(1, 3);
    events.push(makeEvent(daysAgo, 'DOOMSCROLLING', di, r(20, 80), pick(['Instagram antes de dormir', 'YouTube autopilot']), r(21, 23), { impulsivo: true }));
  }
  if (ch(p('gratitude'))) events.push(makeEvent(daysAgo, 'GRATITUDE', r(3, 5), 10, pick(['3 cosas positivas del día', 'Diario de agradecimiento']), r(21, 22)));
  if (ch(p('purpose'))) events.push(makeEvent(daysAgo, 'PURPOSE_SENSE', r(3, 5), 20, 'Revisión de objetivos — alineación alta', r(20, 22)));
  if (ch(p('learning'))) events.push(makeEvent(daysAgo, 'LEARNING', r(3, 4), r(20, 45), pick(['Lectura técnica 30min', 'Curso online — 1 módulo']), r(18, 20)));
  if (isWeekend && ch(p('env_order'))) events.push(makeEvent(daysAgo, 'ENV_ORDER', r(3, 4), r(20, 45), 'Limpieza semanal', r(11, 14)));
  if ((isWeekend || ch(0.12)) && ch(p('social_ok'))) events.push(makeEvent(daysAgo, 'SOCIAL_OK', r(3, 5), r(60, 180), pick(['Tarde con Marcos — conversación genuina', 'Cena familiar — buena energía']), r(16, 20)));
  if (ch(p('frustration'))) events.push(makeEvent(daysAgo, 'FRUSTRATION', r(2, 4), 30, 'Sin avance en tarea principal', r(15, 19)));
  if (isWorkday && ch(p('procrastinate'))) events.push(makeEvent(daysAgo, 'PROCRAST', r(2, 4), r(30, 90), '2h de distracción', r(14, 18), { impulsivo: true }));
  if (ch(p('sugar'))) events.push(makeEvent(daysAgo, 'AZUCAR', r(2, 4), 30, 'Atracón dulces por estrés', r(16, 18), { impulsivo: true }));

  if (daysAgo === 28) events.push(makeEvent(28, 'ARGUMENT', 5, 60, 'Discusión fuerte con Lucía — sin resolución', 21, { persona_id: 'FAM_1' }));
  if (daysAgo === 23) events.push(makeEvent(23, 'ARGUMENT', 3, 30, 'Primera conversación honesta con Lucía', 21, { persona_id: 'FAM_1' }));

  return events;
}

// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDemoUser(): Promise<void> {
  const nowIso = new Date().toISOString();

  // Player profile (specific docId)
  await putDoc('playerProfile', 'main-profile', {
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

  // Static collections
  const areaData = [
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
  await postMany('areas', areaData.map(([id, nombre, peso, prioridad, objetivo, kpi]) => ({
    area_id: id, area_nombre: nombre, peso_estrategico: peso, prioridad, estado: 'OK',
    objetivo_12s: objetivo, kpi_principal: kpi, umbral_riesgo: 5, umbral_critico: 3,
    ultima_revision: nowIso, notas: '',
  })));

  await postMany('hormones', [
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
  ].map(([id, name, cur, base, range, hl]) => ({ hormone_id: id, name, current_level: cur, baseline: base, optimal_range: range, half_life_hours: hl })));

  await postMany('variables', [
    ['SUEÑO_PROF','Sueño profundo','SALUD_FIS','Física',1,10,'Lineal',0,1,1,'Media'],
    ['SUEÑO_BAJO','Sueño insuficiente','SALUD_FIS','Física',-1,10,'Lineal',0,1,2,'Media'],
    ['FUERZA','Ejercicio fuerza','SALUD_FIS','Física',1,8,'Lineal',1,2,3,'Alta'],
    ['CARDIO','Ejercicio aeróbico','SALUD_FIS','Física',1,8,'Lineal',0,1,3,'Alta'],
    ['HEALTHY_MEAL','Comer saludable','SALUD_FIS','Física',1,5,'Lineal',0,1,2,'Alta'],
    ['AZUCAR','Azúcar alta','SALUD_FIS','Física',-1,8,'Exponencial',0,1,2,'Alta'],
    ['MEDITATION','Meditación','SALUD_MENT','Conductual',1,7,'Lineal',0,1,1,'Alta'],
    ['LEARNING','Aprendizaje','SALUD_MENT','Mental',1,6,'Lineal',0,1,2,'Alta'],
    ['DEEP_WORK','Trabajo profundo','CARRERA','Mental',1,9,'Lineal',0,1,2,'Alta'],
    ['PROCRAST','Procrastinar','CARRERA','Conductual',-1,6,'Lineal',0,1,2,'Alta'],
    ['WORK_STRESS','Estrés laboral','CARRERA','Mental',-1,8,'Lineal',0,1,2,'Media'],
    ['SOCIAL_OK','Social nutritivo','RELACIONES','Social',1,8,'Lineal',0,1,2,'Media'],
    ['ARGUMENT','Discusión','RELACIONES','Social',-1,7,'Lineal',0,1,1,'Media'],
    ['GRATITUDE','Gratitud','EMOCION','Conductual',1,7,'Lineal',0,2,1,'Alta'],
    ['FRUSTRATION','Frustración','EMOCION','Mental',-1,6,'Lineal',0,1,2,'Media'],
    ['DOOMSCROLLING','Doomscrolling','DOPAMINA','Conductual',-1,9,'Exponencial',0,1,2,'Alta'],
    ['PORNO','Pornografía','DOPAMINA','Conductual',-1,10,'Exponencial',0,2,1,'Alta'],
    ['ENV_ORDER','Orden entorno','ENTORNO','Entorno',1,6,'Lineal',0,1,1,'Alta'],
    ['ENV_CHAOS','Caos entorno','ENTORNO','Entorno',-1,6,'Lineal',0,1,1,'Media'],
    ['PURPOSE_SENSE','Sentido propósito','PROPOSITO','Conductual',1,9,'Lineal',0,3,1,'Alta'],
  ].map(([id,nombre,area,tipo,pol,imp,curva,delay,dur,umbral,ctrl]) => ({ var_id:id, var_nombre:nombre, area_id:area, tipo, polaridad:pol, impacto_base:imp, curva, delay_dias:delay, duracion_dias:dur, umbral_riesgo:umbral, controlabilidad:ctrl, activo:true })));

  await postMany('relations', [
    ['FAM_1','Lucía','Pareja',7,9,'Diaria'],
    ['AMI_1','Marcos','Amigo',5,8,'Semanal'],
    ['JOB_1','Sofía','Trabajo',1,7,'Semanal'],
    ['MEN_1','Andrés','Mentor',6,9,'Mensual'],
  ].map(([id,nombre,rol,energia,respeto,freq]) => ({ persona_id:id, nombre, rol, energia_neta:energia, respeto, frecuencia:freq })));

  await postMany('accounts', [
    { cuenta_id: 'BANCO_1', tipo: 'Banco', saldo: 4850 },
    { cuenta_id: 'INV_1', tipo: 'Inversion', saldo: 7200 },
    { cuenta_id: 'CASH_1', tipo: 'Efectivo', saldo: 180 },
  ]);

  await postMany('debts', [
    { debt_id:'DEBT_CARD', nombre:'Visa Oro', tipo:'Tarjeta', principal_inicial:2200, interes_tae:21.5, plazo_total_meses:24, cuota_mensual:140, saldo_actual:1260, saldo_pendiente:1260, fecha_inicio:daysFromNow(-380), tipo_amortizacion:'Revolving', comision_amortizacion:0, permite_amortizacion:true, opcion_amortizacion:'Reducir plazo', prioridad_manual:'Alta', estres_psicologico:'Alto', porcentaje_pagado:43, estado_deuda:'Activa' },
    { debt_id:'DEBT_LOAN', nombre:'Préstamo portátil', tipo:'Préstamo personal', principal_inicial:1800, interes_tae:8.9, plazo_total_meses:18, cuota_mensual:108, saldo_actual:740, saldo_pendiente:740, fecha_inicio:daysFromNow(-220), tipo_amortizacion:'Francés', comision_amortizacion:0, permite_amortizacion:true, opcion_amortizacion:'Reducir plazo', prioridad_manual:'Media', estres_psicologico:'Medio', porcentaje_pagado:59, estado_deuda:'Activa' },
  ]);

  await postMany('skills', [
    { habilidad_id:'SKILL_FOCUS', nombre:'Deep Work', area_id:'CARRERA', nivel_actual:5, nivel_objetivo:8, xp:640, estado:'Activa', kpi:'Horas de foco/semana' },
    { habilidad_id:'SKILL_FIN', nombre:'Orden financiero', area_id:'FINANZAS', nivel_actual:4, nivel_objetivo:7, xp:430, estado:'Activa', kpi:'Ahorro neto mensual' },
    { habilidad_id:'SKILL_REG', nombre:'Autorregulación', area_id:'EMOCION', nivel_actual:6, nivel_objetivo:8, xp:720, estado:'Activa', kpi:'Días estables por semana' },
  ]);

  await postMany('systems', [
    { sistema_id:'SYS_FOCUS', habilidad_id:'SKILL_FOCUS', objetivo:'2 bloques de foco al día', frecuencia:'Diaria', estado:'Activo', protocolo_fallo:'P_RESET_5' },
    { sistema_id:'SYS_FIN', habilidad_id:'SKILL_FIN', objetivo:'Revisión financiera semanal', frecuencia:'Semanal', estado:'Activo', protocolo_fallo:'P_RESET_5' },
    { sistema_id:'SYS_REG', habilidad_id:'SKILL_REG', objetivo:'Higiene emocional diaria', frecuencia:'Diaria', estado:'Activo', protocolo_fallo:'P_DEEP_RECOVERY' },
  ]);

  await postMany('habits', [
    { habito_id:'HB_1', sistema_id:'SYS_FOCUS', var_id:'DEEP_WORK', frecuencia:'Diaria', duracion_min:50, minimo_viable:true, description:'Bloque matinal sin interrupciones' },
    { habito_id:'HB_2', sistema_id:'SYS_REG', var_id:'MEDITATION', frecuencia:'Diaria', duracion_min:10, minimo_viable:true, description:'Meditación breve al despertar' },
    { habito_id:'HB_3', sistema_id:'SYS_REG', var_id:'GRATITUDE', frecuencia:'Diaria', duracion_min:5, minimo_viable:true, description:'Cierre del día con gratitud' },
    { habito_id:'HB_4', sistema_id:'SYS_FIN', var_id:'ENV_ORDER', frecuencia:'Semanal', duracion_min:30, minimo_viable:true, description:'Ordenar escritorio y cuentas' },
    { habito_id:'HB_5', sistema_id:'SYS_FOCUS', var_id:'HEALTHY_MEAL', frecuencia:'Diaria', duracion_min:20, minimo_viable:true, description:'Comida simple antes del bloque de tarde' },
  ]);

  await postMany('milestones', [
    { milestone_id:'MS_1', nombre:'Completar 20 bloques de foco', skill_id:'SKILL_FOCUS', system_id:'SYS_FOCUS', fecha_objetivo:daysFromNow(14), estado:'Pendiente', fecha_completado:'', notas:'Crear consistencia operativa', milestone_type:'recurring', progress_count:12, target_count:20 },
    { milestone_id:'MS_2', nombre:'Bajar deuda tarjeta por debajo de 1000', skill_id:'SKILL_FIN', system_id:'SYS_FIN', fecha_objetivo:daysFromNow(30), estado:'Pendiente', fecha_completado:'', notas:'Reducir carga financiera', milestone_type:'single', progress_count:0, target_count:1 },
    { milestone_id:'MS_3', nombre:'14 días seguidos meditando', skill_id:'SKILL_REG', system_id:'SYS_REG', fecha_objetivo:daysFromNow(10), estado:'Pendiente', fecha_completado:'', notas:'Bajar reactividad', milestone_type:'recurring', progress_count:8, target_count:14 },
  ]);

  await postMany('impactMatrix', [
    {matrix_id:'IM1',var_id:'SUEÑO_PROF',hormone_id:'CORTISOL',effect_size:-28,duration_hours:12},
    {matrix_id:'IM2',var_id:'SUEÑO_PROF',hormone_id:'FOCUS',effect_size:28,duration_hours:12},
    {matrix_id:'IM3',var_id:'SUEÑO_PROF',hormone_id:'ENERGY',effect_size:30,duration_hours:12},
    {matrix_id:'IM4',var_id:'SUEÑO_BAJO',hormone_id:'CORTISOL',effect_size:30,duration_hours:12},
    {matrix_id:'IM5',var_id:'SUEÑO_BAJO',hormone_id:'FOCUS',effect_size:-24,duration_hours:12},
    {matrix_id:'IM6',var_id:'SUEÑO_BAJO',hormone_id:'ENERGY',effect_size:-32,duration_hours:12},
    {matrix_id:'IM7',var_id:'FUERZA',hormone_id:'ENDORFINAS',effect_size:34,duration_hours:18},
    {matrix_id:'IM8',var_id:'FUERZA',hormone_id:'DOPAMINA',effect_size:18,duration_hours:18},
    {matrix_id:'IM9',var_id:'CARDIO',hormone_id:'SEROTONINA',effect_size:24,duration_hours:18},
    {matrix_id:'IM10',var_id:'CARDIO',hormone_id:'ENERGY',effect_size:18,duration_hours:18},
    {matrix_id:'IM11',var_id:'MEDITATION',hormone_id:'CORTISOL',effect_size:-24,duration_hours:8},
    {matrix_id:'IM12',var_id:'MEDITATION',hormone_id:'SEROTONINA',effect_size:18,duration_hours:8},
    {matrix_id:'IM13',var_id:'DEEP_WORK',hormone_id:'FOCUS',effect_size:35,duration_hours:4},
    {matrix_id:'IM14',var_id:'DEEP_WORK',hormone_id:'DOPAMINA',effect_size:12,duration_hours:4},
    {matrix_id:'IM15',var_id:'WORK_STRESS',hormone_id:'CORTISOL',effect_size:26,duration_hours:8},
    {matrix_id:'IM16',var_id:'WORK_STRESS',hormone_id:'FOCUS',effect_size:-20,duration_hours:8},
    {matrix_id:'IM17',var_id:'SOCIAL_OK',hormone_id:'OXITOCINA',effect_size:38,duration_hours:6},
    {matrix_id:'IM18',var_id:'SOCIAL_OK',hormone_id:'SEROTONINA',effect_size:16,duration_hours:6},
    {matrix_id:'IM19',var_id:'ARGUMENT',hormone_id:'CORTISOL',effect_size:18,duration_hours:5},
    {matrix_id:'IM20',var_id:'ARGUMENT',hormone_id:'OXITOCINA',effect_size:-12,duration_hours:5},
    {matrix_id:'IM21',var_id:'DOOMSCROLLING',hormone_id:'DOPA_LOAD',effect_size:55,duration_hours:4},
    {matrix_id:'IM22',var_id:'DOOMSCROLLING',hormone_id:'FOCUS',effect_size:-30,duration_hours:4},
    {matrix_id:'IM23',var_id:'PORNO',hormone_id:'DOPA_LOAD',effect_size:75,duration_hours:6},
    {matrix_id:'IM24',var_id:'PORNO',hormone_id:'SEROTONINA',effect_size:-26,duration_hours:6},
    {matrix_id:'IM25',var_id:'GRATITUDE',hormone_id:'SEROTONINA',effect_size:16,duration_hours:12},
    {matrix_id:'IM26',var_id:'ENV_ORDER',hormone_id:'FOCUS',effect_size:10,duration_hours:8},
    {matrix_id:'IM27',var_id:'ENV_CHAOS',hormone_id:'CORTISOL',effect_size:12,duration_hours:8},
    {matrix_id:'IM28',var_id:'PURPOSE_SENSE',hormone_id:'DOPAMINA',effect_size:20,duration_hours:18},
  ]);

  await postMany('states', [
    { estado_id:'OK', condicion:'Homeostasis equilibrada', restricciones:'Ninguna', prioridad:'Optimización' },
    { estado_id:'RIESGO', condicion:'Desviación hormonal detectada', restricciones:'Evitar dopamina rápida', prioridad:'Estabilización' },
    { estado_id:'CRITICO', condicion:'Agotamiento de recursos', restricciones:'Modo supervivencia', prioridad:'Rescate' },
  ]);

  await postMany('protocols', [
    { protocolo_id:'P_RESET_5', nombre:'Reseteo 5 min', estado_disparador:'RIESGO', pasos:'1. Beber agua. 2. Respirar 4-7-8. 3. Estirar.', duracion_min:5 },
    { protocolo_id:'P_DEEP_RECOVERY', nombre:'Recuperación profunda', estado_disparador:'CRITICO', pasos:'1. Silencio. 2. Siesta corta. 3. Paseo suave.', duracion_min:30 },
    { protocolo_id:'P_FOCUS_BLOCK', nombre:'Bloque de foco', estado_disparador:'OK', pasos:'1. Temporizador 50m. 2. Móvil fuera. 3. Tarea única.', duracion_min:50 },
  ]);

  await putDoc('computed_global_state', 'latest', {
    estado_global: 'RIESGO',
    dominant_drain_vars_7d: [], dominant_gain_vars_7d: [],
    reason_codes: ['SEEDED_DEMO'],
    explanation: { primary_cause: 'Estrés laboral residual + patrón de sueño recuperándose', secondary_causes: ['Cortisol ligeramente elevado'], modifiers: ['Hábitos en mejora sostenida'] },
    updatedAt: nowIso,
    rpg_stats: { dopamina:62, serotonina:64, cortisol:38, foco:61, energia:58, sueno:66, conexion_social:55, carga_dopaminergica:28, player_score:68 },
    is_locked: false, lock_reason: '', lock_started_at: null, estimated_unlock_time: 0,
  });

  // Events (60 days)
  const eventDocs: SeedDoc[] = [];
  for (let d = 60; d >= 0; d--) generateDayEvents(d).forEach(e => eventDocs.push(e));
  await postMany('events', eventDocs.map(e => e.data as Record<string, unknown>));

  // Transactions
  const makeTx = (tipo: string, cat: string, monto: number, notas: string, daysAgo: number, deuda_id = '', imp = false) => ({
    transaccion_id: nextTxId(), fecha: isoAt(daysAgo, r(9, 18)), tipo, categoria: cat, monto,
    impulsivo: imp, var_id: '', cuenta_id: 'BANCO_1', deuda_id, notas,
  });
  await postMany('transactions', [
    makeTx('Ingreso','Nómina',2800,'Nómina febrero',60),
    makeTx('Gasto','Vivienda',900,'Alquiler',58),
    makeTx('Gasto','Deudas',140,'Pago tarjeta Visa',57,'DEBT_CARD'),
    makeTx('Gasto','Deudas',108,'Pago préstamo portátil',57,'DEBT_LOAN'),
    makeTx('Gasto','Alimentación',r(160,200),'Supermercado',55),
    makeTx('Gasto','Transporte',r(80,100),'Transporte',54),
    makeTx('Gasto','Desarrollo Personal',89,'Curso online',50),
    makeTx('Gasto','Salud y Bienestar',r(60,90),'Gym',50),
    makeTx('Gasto','Ocio y Suscripciones',35,'Netflix + Spotify',49),
    makeTx('Gasto','Salud y Bienestar',450,'Reparación coche — imprevisto',32),
    makeTx('Gasto','Alimentación',r(30,55),'Comida fuera por estrés',30,'',true),
    makeTx('Gasto','Compras',r(40,80),'Compra impulsiva',28,'',true),
    makeTx('Ingreso','Nómina',2800,'Nómina marzo',30),
    makeTx('Gasto','Vivienda',900,'Alquiler',28),
    makeTx('Gasto','Deudas',140,'Pago tarjeta Visa',27,'DEBT_CARD'),
    makeTx('Gasto','Deudas',108,'Pago préstamo portátil',27,'DEBT_LOAN'),
    makeTx('Gasto','Alimentación',r(150,185),'Supermercado',25),
    makeTx('Gasto','Transporte',r(70,90),'Transporte',24),
    makeTx('Gasto','Salud y Bienestar',r(60,80),'Gym',23),
    makeTx('Gasto','Ocio y Suscripciones',35,'Suscripciones',22),
    makeTx('Gasto','Desarrollo Personal',45,'Libro técnico',18),
    makeTx('Gasto','Alimentación',r(25,45),'Comida con Marcos',15),
    makeTx('Ingreso','Freelance/Negocio',350,'Proyecto freelance',5),
    makeTx('Gasto','Alimentación',r(30,50),'Compra semanal',3),
    makeTx('Gasto','Deudas',200,'Amortización extra tarjeta',2,'DEBT_CARD'),
  ]);

  // Interactions
  const makeInt = (personaId: string, energia: -1|0|1, respeto: -1|0|1, ctx: string, daysAgo: number) => ({
    interaccion_id: nextIntId(), fecha: isoAt(daysAgo, r(17, 22)),
    persona_id: personaId, energia_resultante: energia, respeto_percibido: respeto, contexto: ctx,
  });
  await postMany('interactions', [
    makeInt('FAM_1',0,1,'Noche tranquila en casa — poca conexión',55),
    makeInt('FAM_1',1,1,'Conversación bonita sobre futuros planes',48),
    makeInt('FAM_1',-1,0,'Discusión fuerte — sin resolución',28),
    makeInt('FAM_1',0,1,'Primera conversación honesta',23),
    makeInt('FAM_1',1,1,'Reconexión real — conversación honesta',14),
    makeInt('FAM_1',1,1,'Cena romántica — muy bien',7),
    makeInt('FAM_1',1,1,'Conversación matutina — conectado',2),
    makeInt('AMI_1',1,1,'Cañas del viernes — me recargó',52),
    makeInt('AMI_1',1,1,'Pádel y cena — muy bien',35),
    makeInt('AMI_1',1,1,'Cumple de Marcos — energía positiva',21),
    makeInt('AMI_1',1,1,'Comida de la semana',7),
    makeInt('JOB_1',-1,0,'Reunión sin sentido — 2h perdidas',58),
    makeInt('JOB_1',-1,-1,'Crítica injusta en público',29),
    makeInt('JOB_1',0,1,'Reunión técnica — útil',15),
    makeInt('JOB_1',1,1,'Reconocimiento de mi trabajo',7),
    makeInt('MEN_1',1,1,'Sesión mensual — claridad estratégica',35),
    makeInt('MEN_1',1,1,'Check-in sobre proyectos',5),
  ]);
}

'use server';

import { ai } from '@/ai/genkit';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatContext {
  overallState: string;
  score: number;
  kpis: string;
  recentEvents: string;
  areas: string;
  playerProfile?: string;
  biomarkers?: string;
  drainVars?: string;
  gainVars?: string;
  velocity?: string;
  clinical?: string;
  habits?: string;
  milestones?: string;
}

// IDs canónicos del sistema (deben coincidir con seed-data / el motor).
const AREA_IDS = ['SALUD_FIS', 'SALUD_MENT', 'FINANZAS', 'RELACIONES', 'EMOCION', 'DOPAMINA', 'CARRERA', 'ENTORNO', 'PROPOSITO', 'CREATIVIDAD', 'ESTUDIOS'] as const;
const TIPOS = ['Física', 'Mental', 'Emocional', 'Social', 'Financiera', 'Entorno', 'Conductual'] as const;
const HORMONE_IDS = ['DOPAMINA', 'SEROTONINA', 'CORTISOL', 'FOCUS', 'ENERGY', 'MELATONINA', 'ENDORFINAS', 'TESTOSTERONA', 'OXITOCINA', 'NORADRENALINA', 'PROLACTINA', 'INSULINA', 'GABA', 'PARASIMPATICO', 'DOPA_LOAD'] as const;
const CONTROLABILIDAD = ['Alta', 'Media', 'Baja'] as const;
const HABIT_FREQ = ['Diaria', '3xSemana', 'Semanal', 'Mensual'] as const;
const REL_ROLES = ['Familia', 'Amigo', 'Pareja', 'Trabajo', 'Mentor', 'Conocido'] as const;
const TX_TYPES = ['Gasto', 'Ingreso'] as const;
const MS_TYPES = ['single', 'recurring'] as const;
const ACCOUNT_TYPES = ['Banco', 'Efectivo', 'Inversion', 'Otro'] as const;
const DEBT_TYPES = ['Hipoteca', 'Préstamo personal', 'Tarjeta', 'Línea crédito', 'Otro'] as const;

export interface HormoneImpact { hormone_id: string; effect_size: number; duration_hours: number }

// ── Acciones que el chat puede PROPONER (el usuario confirma antes de ejecutar) ──
export type ChatAction =
  | { type: 'logEvent'; var_id: string; var_nombre: string; intensidad: number; contexto: string; impulsivo: boolean }
  | { type: 'completeHabit'; habito_id: string; habitName: string }
  | {
      type: 'createVariable';
      var_id: string;
      var_nombre: string;
      area_id: string;
      tipo: string;
      polaridad: 1 | -1;
      impacto_base: number;
      controlabilidad: string;
      rationale: string;
      impacts: HormoneImpact[];
      firstEvent?: { intensidad: number; contexto: string; impulsivo: boolean };
    }
  | { type: 'logTransaction'; txType: 'Gasto' | 'Ingreso'; monto: number; categoria: string; contexto: string; impulsivo: boolean }
  | { type: 'setPocket'; categoria: string; monto: number }
  | { type: 'createCategory'; name: string; categoryType: 'expense' | 'income'; icon: string }
  | { type: 'createHabit'; nombre: string; frecuencia: string; var_id?: string }
  | { type: 'createRelation'; nombre: string; rol: string }
  | { type: 'logInteraction'; persona_id: string; persona_nombre: string; energia: -1 | 0 | 1; respeto: -1 | 0 | 1; contexto: string }
  | { type: 'createMilestone'; nombre: string; milestone_type: 'single' | 'recurring'; fecha_objetivo?: string; target_count?: number; skill_id?: string; system_id?: string }
  | { type: 'createAccount'; nombre: string; accountType: string; saldo: number }
  | { type: 'createDebt'; nombre: string; debtType: string; principal_inicial: number; interes_tae: number; plazo_total_meses: number; cuota_mensual: number; saldo_actual: number }
  | { type: 'createSkill'; nombre: string; area_id: string; kpi: string; nivel_actual: number; nivel_objetivo: number }
  | { type: 'createSystem'; objetivo: string; habilidad_id: string; frecuencia: string };

/** Normaliza un nombre a un var_id ASCII UPPER_SNAKE (p.ej. "Tabaco" → "TABACO"). */
function normalizeVarId(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export interface ChatResult {
  reply: string;
  actions: ChatAction[];
}

export interface ChatActionHints {
  variables: { var_id: string; var_nombre: string; polaridad: number }[];
  habits: { habito_id: string; nombre: string }[];
  expenseCategories?: string[];
  incomeCategories?: string[];
  iconOptions?: string[];
  relations?: { persona_id: string; nombre: string }[];
  skills?: { habilidad_id: string; nombre: string }[];
  systems?: { sistema_id: string; objetivo: string }[];
  accounts?: { cuenta_id: string; nombre: string }[];
  debts?: { debt_id: string; nombre: string }[];
}

function buildSystemPrompt(ctx: ChatContext, hints: ChatActionHints): string {
  const sections: string[] = [];
  sections.push(`ESTADO GENERAL: ${ctx.overallState} · Puntuación: ${ctx.score}/100`);
  if (ctx.biomarkers) sections.push(`BIOMARCADORES ACTUALES:\n${ctx.biomarkers}`);
  if (ctx.drainVars) sections.push(`VARIABLES DRENANDO EL SISTEMA (últimos 7 días):\n${ctx.drainVars}`);
  if (ctx.gainVars) sections.push(`VARIABLES REFORZANDO EL SISTEMA:\n${ctx.gainVars}`);
  if (ctx.velocity) sections.push(`TENDENCIA DE PUNTUACIÓN:\n${ctx.velocity}`);
  if (ctx.areas) sections.push(`ÁREAS DE VIDA:\n${ctx.areas}`);
  if (ctx.recentEvents) sections.push(`EVENTOS REGISTRADOS (últimos 7 días):\n${ctx.recentEvents}`);
  if (ctx.kpis) sections.push(`KPIs FINANCIEROS Y SCORES:\n${ctx.kpis}`);
  if (ctx.habits) sections.push(`HÁBITOS ACTIVOS:\n${ctx.habits}`);
  if (ctx.milestones) sections.push(`HITOS Y OBJETIVOS:\n${ctx.milestones}`);
  if (ctx.clinical) sections.push(`SEÑALES CLÍNICAS:\n${ctx.clinical}`);
  if (ctx.playerProfile) sections.push(`PERFIL BIOLÓGICO DEL USUARIO:\n${ctx.playerProfile}`);

  const varList = hints.variables
    .map(v => `- ${v.var_id} | "${v.var_nombre}" | ${v.polaridad > 0 ? 'positiva' : 'negativa'}`)
    .join('\n') || '(ninguna)';
  const habitList = hints.habits
    .map(h => `- ${h.habito_id} | "${h.nombre}"`)
    .join('\n') || '(ninguno)';
  const expCats = (hints.expenseCategories ?? []).join(', ') || '(ninguna)';
  const incCats = (hints.incomeCategories ?? []).join(', ') || '(ninguna)';
  const relList = (hints.relations ?? []).map(r => `- ${r.persona_id} | "${r.nombre}"`).join('\n') || '(ninguna)';
  const skillList = (hints.skills ?? []).map(s => `- ${s.habilidad_id} | "${s.nombre}"`).join('\n') || '(ninguna)';
  const systemList = (hints.systems ?? []).map(s => `- ${s.sistema_id} | "${s.objetivo}"`).join('\n') || '(ninguno)';
  const accountList = (hints.accounts ?? []).map(a => `- "${a.nombre}"`).join(', ') || '(ninguna)';

  return `Eres Axiom, un sistema de inteligencia personal avanzado. Actúas como asesor biológico y de rendimiento personal. Tu voz es directa, empática y científica — nunca terapéutica ni condescendiente.

DATOS EN TIEMPO REAL DEL USUARIO:
${sections.join('\n\n')}

VARIABLES DISPONIBLES (para registrar eventos — usa SOLO estos var_id):
${varList}

HÁBITOS DEL USUARIO (para completarlos — usa SOLO estos habito_id):
${habitList}

CATEGORÍAS DE GASTO: ${expCats}
CATEGORÍAS DE INGRESO: ${incCats}

PERSONAS / RELACIONES (para interacciones — usa estos persona_id):
${relList}

HABILIDADES (skill_id para hitos):
${skillList}

SISTEMAS (sistema_id para hitos):
${systemList}

CUENTAS: ${accountList}

PUEDES PROPONER ACCIONES:
Si el usuario te pide explícitamente registrar/apuntar algo o marcar un hábito como hecho, prepáralo como acción. El usuario las confirmará antes de ejecutarse.
- "registra que medité 15 min" → acción logEvent con el var_id más cercano (MEDITATION), intensidad 1-10, contexto breve, impulsivo según corresponda.
- "marca mi hábito de lectura" → acción completeHabit con el habito_id que mejor coincida por nombre.
- Si no estás seguro de a qué variable/hábito se refiere, NO inventes: pregúntale en el texto y deja la lista de acciones vacía.
- Para eventos negativos/impulsivos (recaídas, gastos impulsivos) marca impulsivo=true.

CREAR VARIABLES NUEVAS (createVariable):
Si el usuario quiere registrar algo que NO existe en la lista de variables (p.ej. "añade fumar/tabaco"), y es una conducta/estado razonable y con sentido, PROPÓN crearla con su perfil hormonal. Reglas:
- PRIMERO comprueba la lista de variables disponibles. Si ya existe una equivalente (mismo concepto), usa logEvent — NO dupliques.
- var_id: MAYÚSCULAS ASCII con guion bajo, sin acentos ni espacios (p.ej. "TABACO").
- area_id ∈ [${AREA_IDS.join(', ')}].
- tipo ∈ [${TIPOS.join(', ')}].
- polaridad: 1 (refuerza el sistema) o -1 (lo drena).
- impacto_base: 3-12 (magnitud general). controlabilidad: Alta/Media/Baja.
- rationale: una frase de por qué tiene sentido crearla.
- impacts: perfil de varianza hormonal REAL. Cada item { "hormone_id", "effect_size" (-15 a 15), "duration_hours" }. Hormonas válidas: [${HORMONE_IDS.join(', ')}]. Usa effect_size positivo para subir y negativo para bajar. Para conductas adictivas/dopamina rápida sube DOPAMINA a corto plazo y DOPA_LOAD (carga, peor cuanto más alta). Ejemplo tabaco: DOPAMINA +6 (1h), DOPA_LOAD +5 (4h), CORTISOL +4 (3h), ENERGY -3 (6h), FOCUS -2 (3h).
- Si el usuario indica que YA lo hizo, incluye "firstEvent" para registrar el primer evento al crearla.
- Si la petición no tiene sentido o es ambigua, NO crees nada: pregúntale.

FINANZAS:
- logTransaction: registrar gasto/ingreso. { "type":"logTransaction", "txType":"Gasto"|"Ingreso", "monto":NUMERO_POSITIVO, "categoria":"<una de las categorías listadas>", "contexto":"breve", "impulsivo":bool }. Elige la categoría más cercana de la lista; si no encaja ninguna, usa "Otros Gastos"/"Otros Ingresos".
- setPocket: fijar/ajustar el presupuesto mensual de una categoría de GASTO. { "type":"setPocket", "categoria":"<categoría de gasto>", "monto":NUMERO }.
- createCategory: crear una categoría nueva si no existe. { "type":"createCategory", "name":"Nombre", "categoryType":"expense"|"income", "icon":"<opcional, uno de los iconos válidos>" }. No dupliques las ya listadas.

HÁBITOS:
- createHabit: { "type":"createHabit", "nombre":"Nombre", "frecuencia":"Diaria"|"3xSemana"|"Semanal"|"Mensual", "var_id":"<opcional, una variable existente que mida el hábito>" }. No dupliques hábitos ya listados.

SOCIAL:
- logInteraction: registrar una interacción con una persona EXISTENTE. { "type":"logInteraction", "persona_id":"<persona_id de la lista>", "energia":-1|0|1, "respeto":-1|0|1, "contexto":"breve" }. energia/respeto: 1 positivo, 0 neutro, -1 negativo. Si la persona NO existe, primero createRelation.
- createRelation: { "type":"createRelation", "nombre":"Nombre", "rol":"Familia"|"Amigo"|"Pareja"|"Trabajo"|"Mentor"|"Conocido" }.

HITOS:
- createMilestone: { "type":"createMilestone", "nombre":"Nombre", "milestone_type":"single"|"recurring", "fecha_objetivo":"YYYY-MM-DD" (opcional), "target_count":N (solo recurring), "skill_id":"<opcional>", "system_id":"<opcional>" }.

ESTRUCTURA (cuentas, deudas, habilidades, sistemas):
- createAccount: { "type":"createAccount", "nombre":"Nombre", "accountType":"Banco"|"Efectivo"|"Inversion"|"Otro", "saldo":NUMERO }.
- createDebt: { "type":"createDebt", "nombre":"Nombre", "debtType":"Hipoteca"|"Préstamo personal"|"Tarjeta"|"Línea crédito"|"Otro", "principal_inicial":N, "interes_tae":N, "plazo_total_meses":N, "cuota_mensual":N, "saldo_actual":N }. TODOS los números son obligatorios; si el usuario no los da, PREGÚNTALE en "reply" y no crees la deuda con cifras inventadas.
- createSkill: { "type":"createSkill", "nombre":"Nombre", "area_id":"<una de las áreas>", "kpi":"métrica (ej. Sesiones/semana)", "nivel_actual":0-10, "nivel_objetivo":0-10 }.
- createSystem: { "type":"createSystem", "objetivo":"Objetivo", "habilidad_id":"<skill_id existente>", "frecuencia":"Diaria"|"3xSemana"|"Semanal"|"Mensual" }. Requiere una habilidad existente; si no hay, créala antes con createSkill.

REGLAS GENERALES DE CREACIÓN: nunca dupliques algo que ya existe en las listas; si ya existe, usa la acción de registro correspondiente. Si falta un dato esencial o la petición es ambigua, pregunta en "reply" y deja "actions" vacío.

FORMATO DE SALIDA — responde SIEMPRE con un objeto JSON válido (sin markdown, sin texto fuera del JSON):
{
  "reply": "Tu respuesta conversacional en español (markdown permitido: **negrita**, listas con -, ### encabezados).",
  "actions": [
    { "type": "logEvent", "var_id": "VAR_ID", "var_nombre": "Nombre", "intensidad": 5, "contexto": "Frase corta", "impulsivo": false },
    { "type": "createVariable", "var_id": "TABACO", "var_nombre": "Tabaco / Fumar", "area_id": "SALUD_FIS", "tipo": "Conductual", "polaridad": -1, "impacto_base": 7, "controlabilidad": "Media", "rationale": "Conducta de dopamina rápida con coste fisiológico no registrada aún.", "impacts": [ { "hormone_id": "DOPAMINA", "effect_size": 6, "duration_hours": 1 }, { "hormone_id": "DOPA_LOAD", "effect_size": 5, "duration_hours": 4 }, { "hormone_id": "CORTISOL", "effect_size": 4, "duration_hours": 3 }, { "hormone_id": "ENERGY", "effect_size": -3, "duration_hours": 6 } ], "firstEvent": { "intensidad": 5, "contexto": "Cigarro", "impulsivo": true } }
  ]
}
Si no hay ninguna acción que preparar, devuelve "actions": [].

INSTRUCCIONES DE CONTENIDO:
- Responde SIEMPRE en español, conciso (2-4 párrafos) salvo que pidan más.
- Usa los datos reales del usuario; nunca inventes datos. Si algo no está, dilo.
- Cuando sugieras acciones (consejo), hazlas específicas y medibles.
- NO eres médico. Ante crisis real, recomienda ayuda profesional.`;
}

function clampInt(v: unknown, min: number, max: number, def: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function sanitizeActions(raw: unknown, hints: ChatActionHints): ChatAction[] {
  if (!Array.isArray(raw)) return [];
  const validVarIds = new Set(hints.variables.map(v => v.var_id));
  const validHabitIds = new Set(hints.habits.map(h => h.habito_id));
  const out: ChatAction[] = [];
  for (const a of raw) {
    if (!a || typeof a !== 'object') continue;
    const t = (a as any).type;
    if (t === 'logEvent' && validVarIds.has((a as any).var_id)) {
      const v = hints.variables.find(x => x.var_id === (a as any).var_id)!;
      out.push({
        type: 'logEvent',
        var_id: v.var_id,
        var_nombre: v.var_nombre,
        intensidad: clampInt((a as any).intensidad, 1, 10, 5),
        contexto: String((a as any).contexto ?? '').slice(0, 200),
        impulsivo: Boolean((a as any).impulsivo),
      });
    } else if (t === 'completeHabit' && validHabitIds.has((a as any).habito_id)) {
      const h = hints.habits.find(x => x.habito_id === (a as any).habito_id)!;
      out.push({ type: 'completeHabit', habito_id: h.habito_id, habitName: h.nombre });
    } else if (t === 'createVariable') {
      const var_nombre = String((a as any).var_nombre ?? '').trim().slice(0, 60);
      const var_id = normalizeVarId(String((a as any).var_id ?? var_nombre));
      if (!var_nombre || !var_id) continue;

      // Anti-duplicados: si ya existe por id o por nombre, NO se crea (debió usar logEvent).
      const existingIds = new Set(hints.variables.map(v => v.var_id.toUpperCase()));
      const existingNames = new Set(hints.variables.map(v => v.var_nombre.trim().toLowerCase()));
      if (existingIds.has(var_id) || existingNames.has(var_nombre.toLowerCase())) continue;

      const area_id = (AREA_IDS as readonly string[]).includes((a as any).area_id) ? (a as any).area_id : 'SALUD_MENT';
      const tipo = (TIPOS as readonly string[]).includes((a as any).tipo) ? (a as any).tipo : 'Conductual';
      const polaridad: 1 | -1 = Number((a as any).polaridad) === 1 ? 1 : -1;
      const impacto_base = clampInt((a as any).impacto_base, 3, 12, 6);
      const controlabilidad = (CONTROLABILIDAD as readonly string[]).includes((a as any).controlabilidad) ? (a as any).controlabilidad : 'Media';
      const rationale = String((a as any).rationale ?? '').slice(0, 240);

      const seenHormones = new Set<string>();
      const impacts: HormoneImpact[] = (Array.isArray((a as any).impacts) ? (a as any).impacts : [])
        .filter((im: any) => im && (HORMONE_IDS as readonly string[]).includes(im.hormone_id))
        .map((im: any) => ({
          hormone_id: im.hormone_id as string,
          effect_size: clampInt(im.effect_size, -15, 15, 0),
          duration_hours: clampInt(im.duration_hours, 1, 72, 6),
        }))
        .filter((im: HormoneImpact) => im.effect_size !== 0 && (seenHormones.has(im.hormone_id) ? false : (seenHormones.add(im.hormone_id), true)))
        .slice(0, 8);

      // Si no hay perfil hormonal válido, dejamos que el motor lo derive heurísticamente.
      let firstEvent: { intensidad: number; contexto: string; impulsivo: boolean } | undefined;
      const fe = (a as any).firstEvent;
      if (fe && typeof fe === 'object') {
        firstEvent = {
          intensidad: clampInt(fe.intensidad, 1, 10, 5),
          contexto: String(fe.contexto ?? '').slice(0, 200),
          impulsivo: Boolean(fe.impulsivo),
        };
      }

      out.push({ type: 'createVariable', var_id, var_nombre, area_id, tipo, polaridad, impacto_base, controlabilidad, rationale, impacts, firstEvent });
    } else if (t === 'logTransaction') {
      const txType = (TX_TYPES as readonly string[]).includes((a as any).txType) ? (a as any).txType as 'Gasto' | 'Ingreso' : 'Gasto';
      const monto = Math.abs(Number((a as any).monto));
      if (!Number.isFinite(monto) || monto <= 0) continue;
      const cats = txType === 'Gasto' ? (hints.expenseCategories ?? []) : (hints.incomeCategories ?? []);
      const match = cats.find(c => c.toLowerCase() === String((a as any).categoria ?? '').toLowerCase());
      const categoria = match ?? (txType === 'Gasto' ? 'Otros Gastos' : 'Otros Ingresos');
      out.push({ type: 'logTransaction', txType, monto: Math.round(monto * 100) / 100, categoria, contexto: String((a as any).contexto ?? '').slice(0, 200), impulsivo: Boolean((a as any).impulsivo) });
    } else if (t === 'setPocket') {
      const monto = Number((a as any).monto);
      if (!Number.isFinite(monto) || monto < 0) continue;
      const cats = hints.expenseCategories ?? [];
      const categoria = cats.find(c => c.toLowerCase() === String((a as any).categoria ?? '').toLowerCase());
      if (!categoria) continue; // el pocket debe ser sobre una categoría de gasto existente
      out.push({ type: 'setPocket', categoria, monto: Math.round(monto) });
    } else if (t === 'createCategory') {
      const name = String((a as any).name ?? '').trim().slice(0, 40);
      if (!name) continue;
      const categoryType = (a as any).categoryType === 'income' ? 'income' : 'expense';
      const existing = new Set([...(hints.expenseCategories ?? []), ...(hints.incomeCategories ?? [])].map(c => c.toLowerCase()));
      if (existing.has(name.toLowerCase())) continue; // no duplicar
      const icon = (hints.iconOptions ?? []).includes((a as any).icon) ? (a as any).icon : 'Info';
      out.push({ type: 'createCategory', name, categoryType, icon });
    } else if (t === 'createHabit') {
      const nombre = String((a as any).nombre ?? '').trim().slice(0, 60);
      if (!nombre) continue;
      const existingHabitNames = new Set(hints.habits.map(h => h.nombre.trim().toLowerCase()));
      if (existingHabitNames.has(nombre.toLowerCase())) continue; // no duplicar
      const frecuencia = (HABIT_FREQ as readonly string[]).includes((a as any).frecuencia) ? (a as any).frecuencia : 'Diaria';
      const reqVar = (a as any).var_id;
      const var_id = reqVar && validVarIds.has(reqVar) ? reqVar : undefined;
      out.push({ type: 'createHabit', nombre, frecuencia, var_id });
    } else if (t === 'createRelation') {
      const nombre = String((a as any).nombre ?? '').trim().slice(0, 60);
      if (!nombre) continue;
      const existingRelNames = new Set((hints.relations ?? []).map(r => r.nombre.trim().toLowerCase()));
      if (existingRelNames.has(nombre.toLowerCase())) continue;
      const rol = (REL_ROLES as readonly string[]).includes((a as any).rol) ? (a as any).rol : 'Conocido';
      out.push({ type: 'createRelation', nombre, rol });
    } else if (t === 'logInteraction') {
      const rels = hints.relations ?? [];
      let rel = rels.find(r => r.persona_id === (a as any).persona_id);
      if (!rel) rel = rels.find(r => r.nombre.toLowerCase() === String((a as any).persona_nombre ?? '').toLowerCase());
      if (!rel) continue; // persona debe existir (si no, la IA debe createRelation)
      const norm = (v: unknown): -1 | 0 | 1 => { const n = Math.round(Number(v)); return n > 0 ? 1 : n < 0 ? -1 : 0; };
      out.push({ type: 'logInteraction', persona_id: rel.persona_id, persona_nombre: rel.nombre, energia: norm((a as any).energia), respeto: norm((a as any).respeto), contexto: String((a as any).contexto ?? '').slice(0, 200) });
    } else if (t === 'createMilestone') {
      const nombre = String((a as any).nombre ?? '').trim().slice(0, 80);
      if (nombre.length < 3) continue;
      const milestone_type = (MS_TYPES as readonly string[]).includes((a as any).milestone_type) ? (a as any).milestone_type as 'single' | 'recurring' : 'single';
      let fecha_objetivo: string | undefined;
      const fo = String((a as any).fecha_objetivo ?? '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(fo)) fecha_objetivo = fo;
      const target_count = milestone_type === 'recurring' ? clampInt((a as any).target_count, 1, 999, 1) : undefined;
      const skill_id = (hints.skills ?? []).some(s => s.habilidad_id === (a as any).skill_id) ? (a as any).skill_id : undefined;
      const system_id = (hints.systems ?? []).some(s => s.sistema_id === (a as any).system_id) ? (a as any).system_id : undefined;
      out.push({ type: 'createMilestone', nombre, milestone_type, fecha_objetivo, target_count, skill_id, system_id });
    } else if (t === 'createAccount') {
      const nombre = String((a as any).nombre ?? '').trim().slice(0, 60);
      if (!nombre) continue;
      const existing = new Set((hints.accounts ?? []).map(x => x.nombre.trim().toLowerCase()));
      if (existing.has(nombre.toLowerCase())) continue;
      const accountType = (ACCOUNT_TYPES as readonly string[]).includes((a as any).accountType) ? (a as any).accountType : 'Banco';
      const saldo = Number((a as any).saldo);
      out.push({ type: 'createAccount', nombre, accountType, saldo: Number.isFinite(saldo) ? Math.round(saldo * 100) / 100 : 0 });
    } else if (t === 'createDebt') {
      const nombre = String((a as any).nombre ?? '').trim().slice(0, 60);
      if (nombre.length < 2) continue;
      const debtType = (DEBT_TYPES as readonly string[]).includes((a as any).debtType) ? (a as any).debtType : 'Préstamo personal';
      const principal_inicial = Number((a as any).principal_inicial);
      const interes_tae = Number((a as any).interes_tae);
      const plazo_total_meses = Math.round(Number((a as any).plazo_total_meses));
      const cuota_mensual = Number((a as any).cuota_mensual);
      const saldo_actual = Number((a as any).saldo_actual);
      // Exigimos cifras válidas: nada de inventar datos financieros.
      if (!(principal_inicial > 0) || !(interes_tae >= 0) || !(plazo_total_meses > 0) || !(cuota_mensual > 0) || !(saldo_actual >= 0)) continue;
      out.push({ type: 'createDebt', nombre, debtType, principal_inicial, interes_tae, plazo_total_meses, cuota_mensual, saldo_actual });
    } else if (t === 'createSkill') {
      const nombre = String((a as any).nombre ?? '').trim().slice(0, 60);
      if (nombre.length < 2) continue;
      const existing = new Set((hints.skills ?? []).map(x => x.nombre.trim().toLowerCase()));
      if (existing.has(nombre.toLowerCase())) continue;
      const area_id = (AREA_IDS as readonly string[]).includes((a as any).area_id) ? (a as any).area_id : 'SALUD_MENT';
      const kpi = String((a as any).kpi ?? 'Sesiones/semana').slice(0, 60) || 'Sesiones/semana';
      const nivel_actual = clampInt((a as any).nivel_actual, 0, 10, 3);
      const nivel_objetivo = clampInt((a as any).nivel_objetivo, 0, 10, 7);
      out.push({ type: 'createSkill', nombre, area_id, kpi, nivel_actual, nivel_objetivo });
    } else if (t === 'createSystem') {
      const objetivo = String((a as any).objetivo ?? '').trim().slice(0, 80);
      if (!objetivo) continue;
      const habilidad_id = (hints.skills ?? []).some(s => s.habilidad_id === (a as any).habilidad_id) ? (a as any).habilidad_id : '';
      if (!habilidad_id) continue; // un sistema necesita una habilidad existente
      const frecuencia = (HABIT_FREQ as readonly string[]).includes((a as any).frecuencia) ? (a as any).frecuencia : 'Diaria';
      out.push({ type: 'createSystem', objetivo, habilidad_id, frecuencia });
    }
  }
  return out.slice(0, 6); // tope de seguridad
}

// Extrae el objeto JSON de la respuesta del modelo aunque venga con prosa o fences
// alrededor (el modelo a veces antepone texto). Escaneo de llaves balanceadas
// respetando strings. Devuelve null si no hay un objeto JSON parseable.
function extractJsonObject(text: string): any | null {
  const tryParse = (s: string): any | undefined => { try { return JSON.parse(s); } catch { return undefined; } };

  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const direct = tryParse(stripped);
  if (direct && typeof direct === 'object') return direct;

  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const parsed = tryParse(text.slice(start, i + 1));
        return parsed && typeof parsed === 'object' ? parsed : null;
      }
    }
  }
  return null;
}

// Limpia cualquier resto de JSON/fence que se cuele en el texto de respuesta.
function sanitizeReply(reply: string): string {
  let r = reply.replace(/```(?:json)?[\s\S]*?```/gi, '').trim();
  // Si el "reply" es en realidad un objeto JSON crudo, no lo mostramos.
  if (/^\s*\{[\s\S]*"(reply|actions|type)"\s*:/.test(r)) return '';
  return r;
}

export async function runAxiomChat(
  messages: ChatMessage[],
  context: ChatContext,
  hints: ChatActionHints = { variables: [], habits: [] },
): Promise<ChatResult> {
  if (!messages.length) return { reply: '', actions: [] };

  const systemPrompt = buildSystemPrompt(context, hints);
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role as 'user' | 'model',
    content: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1];

  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: systemPrompt,
      messages: history,
      prompt: lastMessage.content,
    });

    const rawText = response.text?.trim() ?? '';
    const parsed = extractJsonObject(rawText);

    if (parsed && (typeof parsed.reply === 'string' || Array.isArray(parsed.actions))) {
      const actions = sanitizeActions(parsed.actions, hints);
      const cleanReply = sanitizeReply(typeof parsed.reply === 'string' ? parsed.reply : '');
      const reply = cleanReply
        || (actions.length ? 'He preparado esta acción. Confírmala para aplicarla.' : 'No pude generar una respuesta. Inténtalo de nuevo.');
      return { reply, actions };
    }

    // No es JSON estructurado: si el texto PARECE un JSON de acción a medias, no lo
    // mostramos crudo; si es prosa normal, la devolvemos tal cual.
    const looksLikeActionJson = /"(reply|actions)"\s*:|"type"\s*:\s*"(logEvent|completeHabit|createVariable|logTransaction|setPocket|createCategory|createHabit|createRelation|logInteraction|createMilestone|createAccount|createDebt|createSkill|createSystem)"/.test(rawText);
    if (looksLikeActionJson) {
      return { reply: 'He preparado una acción pero no pude interpretarla bien. ¿Puedes repetir la petición de otra forma?', actions: [] };
    }
    return { reply: rawText || 'No pude generar una respuesta. Inténtalo de nuevo.', actions: [] };
  } catch (error) {
    console.error('[AxiomChat] Error:', error);
    if (error instanceof Error && error.message.includes('429')) {
      return { reply: 'El sistema está procesando muchas solicitudes. Espera un momento e inténtalo de nuevo.', actions: [] };
    }
    return { reply: 'Hubo un error al procesar tu consulta. Inténtalo de nuevo.', actions: [] };
  }
}

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
    };

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

  return `Eres Axiom, un sistema de inteligencia personal avanzado. Actúas como asesor biológico y de rendimiento personal. Tu voz es directa, empática y científica — nunca terapéutica ni condescendiente.

DATOS EN TIEMPO REAL DEL USUARIO:
${sections.join('\n\n')}

VARIABLES DISPONIBLES (para registrar eventos — usa SOLO estos var_id):
${varList}

HÁBITOS DEL USUARIO (para completarlos — usa SOLO estos habito_id):
${habitList}

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
    }
  }
  return out.slice(0, 5); // tope de seguridad
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
    const jsonStr = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    try {
      const parsed = JSON.parse(jsonStr);
      const reply = typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply
        : 'No pude generar una respuesta. Inténtalo de nuevo.';
      return { reply, actions: sanitizeActions(parsed.actions, hints) };
    } catch {
      // Si el modelo no devolvió JSON, tratamos todo el texto como respuesta.
      return { reply: rawText || 'No pude generar una respuesta. Inténtalo de nuevo.', actions: [] };
    }
  } catch (error) {
    console.error('[AxiomChat] Error:', error);
    if (error instanceof Error && error.message.includes('429')) {
      return { reply: 'El sistema está procesando muchas solicitudes. Espera un momento e inténtalo de nuevo.', actions: [] };
    }
    return { reply: 'Hubo un error al procesar tu consulta. Inténtalo de nuevo.', actions: [] };
  }
}

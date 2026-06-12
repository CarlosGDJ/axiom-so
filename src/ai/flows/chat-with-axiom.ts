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

// ── Acciones que el chat puede PROPONER (el usuario confirma antes de ejecutar) ──
export type ChatAction =
  | { type: 'logEvent'; var_id: string; var_nombre: string; intensidad: number; contexto: string; impulsivo: boolean }
  | { type: 'completeHabit'; habito_id: string; habitName: string };

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

FORMATO DE SALIDA — responde SIEMPRE con un objeto JSON válido (sin markdown, sin texto fuera del JSON):
{
  "reply": "Tu respuesta conversacional en español (markdown permitido: **negrita**, listas con -, ### encabezados).",
  "actions": [
    { "type": "logEvent", "var_id": "VAR_ID", "var_nombre": "Nombre", "intensidad": 5, "contexto": "Frase corta", "impulsivo": false }
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

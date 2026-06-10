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
  // Biomarcadores en tiempo real
  biomarkers?: string;
  // Drenajes y ganancias activos
  drainVars?: string;
  gainVars?: string;
  // Tendencia de velocidad
  velocity?: string;
  // Clínica V2
  clinical?: string;
  // Hábitos y milestones
  habits?: string;
  milestones?: string;
}

function buildSystemPrompt(ctx: ChatContext): string {
  const sections: string[] = [];

  sections.push(`ESTADO GENERAL: ${ctx.overallState} · Puntuación: ${ctx.score}/100`);

  if (ctx.biomarkers) {
    sections.push(`BIOMARCADORES ACTUALES:\n${ctx.biomarkers}`);
  }

  if (ctx.drainVars) {
    sections.push(`VARIABLES DRENANDO EL SISTEMA (últimos 7 días):\n${ctx.drainVars}`);
  }

  if (ctx.gainVars) {
    sections.push(`VARIABLES REFORZANDO EL SISTEMA:\n${ctx.gainVars}`);
  }

  if (ctx.velocity) {
    sections.push(`TENDENCIA DE PUNTUACIÓN:\n${ctx.velocity}`);
  }

  if (ctx.areas) {
    sections.push(`ÁREAS DE VIDA:\n${ctx.areas}`);
  }

  if (ctx.recentEvents) {
    sections.push(`EVENTOS REGISTRADOS (últimos 7 días):\n${ctx.recentEvents}`);
  }

  if (ctx.kpis) {
    sections.push(`KPIs FINANCIEROS Y SCORES:\n${ctx.kpis}`);
  }

  if (ctx.habits) {
    sections.push(`HÁBITOS ACTIVOS:\n${ctx.habits}`);
  }

  if (ctx.milestones) {
    sections.push(`HITOS Y OBJETIVOS:\n${ctx.milestones}`);
  }

  if (ctx.clinical) {
    sections.push(`SEÑALES CLÍNICAS:\n${ctx.clinical}`);
  }

  if (ctx.playerProfile) {
    sections.push(`PERFIL BIOLÓGICO DEL USUARIO:\n${ctx.playerProfile}`);
  }

  return `Eres Axiom, un sistema de inteligencia personal avanzado. Actúas como asesor biológico y de rendimiento personal. Tu voz es directa, empática y científica — nunca terapéutica ni condescendiente.

DATOS EN TIEMPO REAL DEL USUARIO:
${sections.join('\n\n')}

INSTRUCCIONES:
- Responde SIEMPRE en español.
- Usa los datos del usuario para respuestas concretas y personalizadas. Si el usuario pregunta su estado, cita datos reales.
- Cuando sugiereas acciones, hazlas específicas y medibles (tiempo, intensidad, frecuencia).
- Usa markdown para estructurar respuestas largas: **negrita**, listas con "-", encabezados con "###".
- Respuestas concisas (2-4 párrafos) salvo que el usuario pida más detalle.
- NUNCA inventes datos que no estén en el contexto. Si algo no está, dilo explícitamente.
- NO eres médico. Ante señales de crisis real, recomienda ayuda profesional.`;
}

export async function runAxiomChat(
  messages: ChatMessage[],
  context: ChatContext
): Promise<string> {
  if (!messages.length) return '';

  const systemPrompt = buildSystemPrompt(context);

  // Convert to Genkit message format
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

    return response.text ?? 'No pude generar una respuesta. Inténtalo de nuevo.';
  } catch (error) {
    console.error('[AxiomChat] Error:', error);
    if (error instanceof Error && error.message.includes('429')) {
      return 'El sistema está procesando muchas solicitudes. Por favor, espera un momento e inténtalo de nuevo.';
    }
    return 'Hubo un error al procesar tu consulta. Por favor, inténtalo de nuevo.';
  }
}

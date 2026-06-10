'use server';

import { ai } from '@/ai/genkit';

export interface ParsedLogEvent {
  var_id: string;
  var_nombre: string;
  intensidad: number;
  contexto: string;
  confianza: 'alta' | 'media' | 'baja';
}

export interface ParseNaturalLogOutput {
  events: ParsedLogEvent[];
  resumen: string;
}

interface VarHint {
  var_id: string;
  var_nombre: string;
  polaridad: number;
}

export async function parseNaturalLog(
  text: string,
  variables: VarHint[],
): Promise<ParseNaturalLogOutput> {
  if (!text.trim()) return { events: [], resumen: '' };

  const varList = variables
    .map(v => `- ${v.var_id} | "${v.var_nombre}" | polaridad: ${v.polaridad > 0 ? 'positiva' : 'negativa'}`)
    .join('\n');

  const prompt = `Eres un parser de eventos de bienestar personal. El usuario ha escrito una descripción libre de su día o experiencia. Tu tarea es extraer eventos discretos y mapearlos a variables del sistema.

LISTA DE VARIABLES DISPONIBLES:
${varList}

TEXTO DEL USUARIO:
"${text}"

INSTRUCCIONES:
1. Extrae todos los eventos, comportamientos o estados mencionados.
2. Para cada uno, elige la variable MÁS CERCANA de la lista. Solo puedes usar var_ids de la lista anterior.
3. Estima la intensidad (1–10) basándote en calificadores: "un poco"→2-3, normal→4-5, "bastante"→6-7, "mucho/muy"→8-9, "extremo/terrible"→10.
4. Genera un "contexto" de 1 frase corta en español que capture la esencia del evento.
5. Asigna confianza: "alta" si hay correspondencia directa, "media" si es inferida, "baja" si es ambigua.

Devuelve SOLO un objeto JSON válido con este esquema exacto (sin markdown):
{
  "events": [
    {
      "var_id": "VAR_ID_DE_LA_LISTA",
      "var_nombre": "Nombre de la variable",
      "intensidad": 5,
      "contexto": "Descripción corta del evento",
      "confianza": "alta"
    }
  ],
  "resumen": "Frase de 1 línea resumiendo lo registrado"
}`;

  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      config: { temperature: 0.1 },
    });

    const raw = response.text?.trim() ?? '';
    // Strip markdown code fences if model wraps the JSON
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonStr) as ParseNaturalLogOutput;

    // Validate and sanitize
    const validVarIds = new Set(variables.map(v => v.var_id));
    const events = (parsed.events ?? [])
      .filter(e => validVarIds.has(e.var_id))
      .map(e => ({
        var_id: e.var_id,
        var_nombre: e.var_nombre ?? e.var_id,
        intensidad: Math.min(10, Math.max(1, Math.round(Number(e.intensidad) || 5))),
        contexto: String(e.contexto ?? '').slice(0, 200),
        confianza: (['alta', 'media', 'baja'].includes(e.confianza) ? e.confianza : 'media') as ParsedLogEvent['confianza'],
      }));

    return { events, resumen: String(parsed.resumen ?? '').slice(0, 200) };
  } catch (error) {
    console.error('[parseNaturalLog] Error:', error);
    throw new Error('No pude analizar el texto. Inténtalo de nuevo.');
  }
}

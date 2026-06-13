'use server';

/**
 * @fileOverview Resumen diario: junta las 2-3 señales más importantes del día en
 * una sola directiva matinal coherente. Recibe los hechos ya calculados por el
 * motor de señales (cifras reales) y solo los ordena y redacta — no inventa datos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SignalSchema = z.object({
  category: z.string(),
  title: z.string(),
  evidence: z.string().describe('JSON con las cifras reales de la señal.'),
});

const InputSchema = z.object({
  overallState: z.string(),
  signals: z.array(SignalSchema).describe('Señales top del día, ya priorizadas.'),
});

export type DailyDigestInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  title: z.string().describe('Título de la directiva del día (máx 6 palabras, sin emojis).'),
  message: z.string().describe('2-3 frases que conectan las señales en una directiva coherente y accionable. Máx 280 caracteres. Español, tono directo y de apoyo. Usa SOLO las cifras dadas.'),
});

export type DailyDigestOutput = z.infer<typeof OutputSchema>;

export async function generateDailyDigest(input: DailyDigestInput): Promise<DailyDigestOutput> {
  return flow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailyDigestPrompt',
  input: { schema: InputSchema },
  output: { schema: OutputSchema },
  model: 'googleai/gemini-2.5-flash',
  config: { temperature: 0.4 },
  prompt: `Eres Axiom, el copiloto del sistema operativo personal del usuario. Es por la mañana: escribe la DIRECTIVA DEL DÍA juntando las señales más importantes en UN mensaje coherente.

Reglas estrictas:
- Español, tono directo, claro y de apoyo. No alarmista, no cursi.
- Usa ÚNICAMENTE las cifras presentes en los "Hechos" de cada señal. NUNCA inventes números.
- Conecta las señales en una narrativa breve (qué es lo más importante hoy y qué hacer). 2-3 frases, máx 280 caracteres.
- Prioriza: empieza por lo más crítico. Si hay una correlación útil, úsala para explicar el "por qué".
- Título: máx 6 palabras, sin emojis ni comillas. Sin markdown.

Estado general: {{{overallState}}}

Señales del día (ya priorizadas):
{{#each signals}}
- [{{this.category}}] {{this.title}} — hechos: {{this.evidence}}
{{/each}}`,
});

const flow = ai.defineFlow(
  {
    name: 'generateDailyDigestFlow',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  },
);

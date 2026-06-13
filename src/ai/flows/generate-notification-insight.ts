'use server';

/**
 * @fileOverview Redacta la notificación de mayor prioridad como un insight
 * natural, específico y accionable. Recibe los HECHOS ya calculados por el motor
 * de señales (cifras reales) y solo los pone en palabras — nunca inventa datos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InputSchema = z.object({
  category: z.string(),
  severity: z.number(),
  fallbackTitle: z.string(),
  fallbackMessage: z.string(),
  evidence: z.string().describe('JSON con los hechos/cifras reales de la señal.'),
  actionLabel: z.string().optional(),
});

export type NotificationInsightInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  title: z.string().describe('Título corto y concreto (máx 6 palabras, sin emojis).'),
  message: z.string().describe('Una frase clara, específica y accionable (máx 160 caracteres). Usa SOLO las cifras del evidence. En español, tono directo y de apoyo.'),
});

export type NotificationInsightOutput = z.infer<typeof OutputSchema>;

export async function generateNotificationInsight(input: NotificationInsightInput): Promise<NotificationInsightOutput> {
  return flow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNotificationInsightPrompt',
  input: { schema: InputSchema },
  output: { schema: OutputSchema },
  model: 'googleai/gemini-2.5-flash',
  config: { temperature: 0.4 },
  prompt: `Eres Axiom, el copiloto del sistema operativo personal del usuario. Escribe UNA notificación.

Reglas estrictas:
- Responde SIEMPRE en español, tono directo, claro y de apoyo (no alarmista, no cursi).
- Usa ÚNICAMENTE las cifras presentes en "Hechos". NUNCA inventes números ni datos que no estén ahí.
- El mensaje debe ser específico y accionable: di qué pasa y qué hacer. Máximo 160 caracteres, una sola frase.
- Título: máximo 6 palabras, sin emojis, sin comillas.
- No uses markdown.

Categoría: {{{category}}}
Severidad (0-1): {{{severity}}}
Acción sugerida: {{{actionLabel}}}
Hechos (cifras reales): {{{evidence}}}

Referencia de respaldo (mejórala, no la copies literal):
- Título: {{{fallbackTitle}}}
- Mensaje: {{{fallbackMessage}}}`,
});

const flow = ai.defineFlow(
  {
    name: 'generateNotificationInsightFlow',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  },
);

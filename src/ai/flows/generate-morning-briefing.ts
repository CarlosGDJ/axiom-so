'use server';

/**
 * @fileOverview Generates a tactical morning briefing (Daily Directive) based on bio-state.
 *
 * - generateMorningBriefing - Analyzes user state and returns a tactical plan.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MorningBriefingInputSchema = z.object({
  playerProfile: z.string().describe('JSON string of the player profile.'),
  currentStats: z.string().describe('JSON string of current RPG stats (focus, energy, etc.).'),
  recentEvents: z.string().describe('JSON string of events from the last 24 hours.'),
  timeOfDay: z.string().describe('Current hour or phase of the day.'),
});
export type MorningBriefingInput = z.infer<typeof MorningBriefingInputSchema>;

const MorningBriefingOutputSchema = z.object({
  directive: z.string().describe('A short, high-impact command for the user (e.g., "DIRECTIVA: REINICIO DE FOCO").'),
  diagnosis: z.string().describe('A concise 1-2 sentence bio-diagnosis.'),
  tacticalSteps: z.array(z.string()).describe('3 very specific tactical actions for today.'),
  expectedOutcome: z.string().describe('What will happen if the directive is followed.'),
});
export type MorningBriefingOutput = z.infer<typeof MorningBriefingOutputSchema>;

export async function generateMorningBriefing(input: MorningBriefingInput): Promise<MorningBriefingOutput> {
  return morningBriefingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMorningBriefingPrompt',
  input: { schema: MorningBriefingInputSchema },
  output: { schema: MorningBriefingOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Eres el Núcleo Central de Axiom, un sistema operativo biológico de alto rendimiento. Tu misión es dar al usuario su "Directiva de Optimización" del día.

DATOS DE ENTRADA:
- Perfil: {{{playerProfile}}}
- Stats Actuales: {{{currentStats}}}
- Historial 24h: {{{recentEvents}}}
- Hora Actual: {{{timeOfDay}}}

INSTRUCCIONES:
1. Analiza si el usuario viene de un crash (mucho cortisol o poca energía) o si está en un estado óptimo.
2. Genera una "Directiva" que sea una orden corta y poderosa (máximo 5 palabras).
3. Proporciona un diagnóstico bio-orgánico breve.
4. Define 3 pasos tácticos. Si el usuario tiene baja energía, los pasos deben ser de recuperación. Si tiene alta, deben ser de producción masiva.
5. El tono debe ser militar-científico pero alentador.

Responde siempre en español y en formato JSON válido.`,
});

const morningBriefingFlow = ai.defineFlow(
  {
    name: 'morningBriefingFlow',
    inputSchema: MorningBriefingInputSchema,
    outputSchema: MorningBriefingOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

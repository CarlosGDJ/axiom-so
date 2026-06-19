'use server';

/**
 * @fileOverview Calibra el sistema a partir del "cierre del día": compara cómo ve
 * Axiom al usuario con cómo dice sentirse, y ajusta sus 6 sensibilidades para que
 * el modelo encaje mejor con su experiencia real. Ajuste gradual y acotado.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SensSchema = z.object({
  stress: z.number(),
  dopamine: z.number(),
  sleep: z.number(),
  emotional: z.number(),
  environmental: z.number(),
  pressure: z.number(),
});

const InputSchema = z.object({
  appScore: z.number(),
  appState: z.string(),
  biomarkers: z.string().describe('JSON con foco/energia/sueno/cortisol etc.'),
  agreement: z.number().describe('1-5: cuánto el usuario está de acuerdo con cómo le ve la app.'),
  perceived: z.number().describe('1-5: cómo dice sentirse realmente el usuario.'),
  note: z.string().describe('Reflexión libre del usuario (puede estar vacía).'),
  recent: z.string().describe('JSON de cierres recientes [{fecha, agreement, perceived}].'),
  current: SensSchema,
});

export type CalibrateInput = z.infer<typeof InputSchema>;

const OutputSchema = z.object({
  sensitivities: SensSchema,
  summary: z.string().describe('Una frase en español, qué se ajustó y por qué (o que no hizo falta).'),
});

export type CalibrateOutput = z.infer<typeof OutputSchema>;

export async function calibrateFromCheckin(input: CalibrateInput): Promise<CalibrateOutput> {
  return flow(input);
}

const prompt = ai.definePrompt({
  name: 'calibrateFromCheckinPrompt',
  input: { schema: InputSchema },
  output: { schema: OutputSchema },
  model: 'googleai/gemini-2.5-flash',
  config: { temperature: 0.3 },
  prompt: `Eres el CALIBRADOR del sistema Axiom. El usuario acaba de hacer su "cierre del día": compara cómo lo ve la app con cómo se siente de verdad. Ajusta sus 6 sensibilidades para que el modelo encaje mejor con su experiencia.

Significado de cada sensibilidad (multiplicador del efecto en su eje):
- stress: reactividad al cortisol/estrés.
- dopamine: reactividad a la dopamina/recompensa rápida.
- sleep: peso del sueño.
- emotional: reactividad emocional (serotonina).
- pressure: foco/energía bajo presión.
- environmental: entorno.

REGLAS ESTRICTAS:
- Cada sensibilidad SIEMPRE entre 0.6 y 1.8.
- Ajuste GRADUAL: como máximo ±0.12 respecto al valor actual por cierre. No hagas cambios bruscos.
- Si el usuario se siente PEOR de lo que la app refleja (perceived < lo que sugiere appScore, o la nota indica malestar) → SUBE las sensibilidades de los ejes implicados (el sistema penalizará más y se ajustará a la realidad).
- Si se siente MEJOR de lo reflejado → BÁJALAS.
- Usa la NOTA para decidir QUÉ ejes tocar (ej.: "no dormí" → sleep; "discusión/ansiedad" → emotional/stress; "saturado de pantallas" → dopamine; "agobiado por trabajo" → pressure/stress).
- Si hay acuerdo alto (agreement 4-5) y la nota no indica desajuste, deja las sensibilidades casi igual y dilo en el resumen.
- Devuelve SIEMPRE las 6 sensibilidades (las que no cambien, con su valor actual) y un resumen de 1 frase.

Cómo le ve la app: score ${'{{{appScore}}}'} (${'{{{appState}}}'}), biomarcadores ${'{{{biomarkers}}}'}.
Cierre de hoy → acuerdo: {{{agreement}}}/5 · se siente: {{{perceived}}}/5 · nota: "{{{note}}}".
Cierres recientes: {{{recent}}}
Sensibilidades actuales: {{{current}}}`,
});

const flow = ai.defineFlow(
  { name: 'calibrateFromCheckinFlow', inputSchema: InputSchema, outputSchema: OutputSchema },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  },
);


'use server';

/**
 * @fileOverview Generates protocol recommendations based on user's state and dominant variables.
 * 
 * - Determinación dinámica de recuperación basada en tolerancias y severidad.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProtocolRecommendationsInputSchema = z.object({
  overallState: z.string().describe('The overall state of the user (OK/RISK/CRITICAL).'),
  dominantVariables: z.string().describe('A stringified JSON array of dominant drain variables with their impacts and remaining time.'),
  areaScores: z.string().optional().describe('A stringified JSON array of area scores for context.'),
  tolerances: z.string().optional().describe('Stringified JSON of the user sensitivity profile.'),
});

export type GenerateProtocolRecommendationsInput = z.infer<typeof GenerateProtocolRecommendationsInputSchema>;

const GenerateProtocolRecommendationsOutputSchema = z.object({
  protocolName: z.string().describe('Un nombre corto y motivador para este protocolo de rescate.'),
  recommendations: z.array(z.string()).describe('Un array de 3-5 recomendaciones de protocolo muy específicas y tácticas.'),
  rationale: z.string().describe('Una breve explicación del diagnóstico actual.'),
  estimatedRecoveryHours: z.number().describe('Horas estimadas para salir del modo crítico tras completar el protocolo.'),
  resolutionPotential: z.number().min(5).max(30).describe('Puntaje de impacto directo que este protocolo tendrá en el sistema (5 a 30).'),
});

export type GenerateProtocolRecommendationsOutput = z.infer<typeof GenerateProtocolRecommendationsOutputSchema>;

export async function generateProtocolRecommendations(input: GenerateProtocolRecommendationsInput): Promise<GenerateProtocolRecommendationsOutput> {
  return generateProtocolRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProtocolRecommendationsPrompt',
  input: {schema: GenerateProtocolRecommendationsInputSchema},
  output: {schema: GenerateProtocolRecommendationsOutputSchema},
  model: 'googleai/gemini-2.5-flash',
  prompt: `Eres el sistema operativo personal Axiom en Modo de Estabilización. Tu misión es salvar al usuario de una crisis.

VARIABLES DOMINANTES (Drenajes):
\`\`\`json
{{{dominantVariables}}}
\`\`\`

ESTADO GLOBAL: {{{overallState}}}
SENSIBILIDADES (Tolerancias): 
\`\`\`json
{{{tolerances}}}
\`\`\`

Tu tarea:
1. Genera un Protocolo de Rescate Inmediato. 
2. Define el resolutionPotential: Un número entero entre 5 y 30. Si el usuario tiene muchas variables dominantes o sensibilidades altas (>1.2), el protocolo debe ser más potente (cerca de 30). Si es algo leve, 10-15.
3. Estima estimatedRecoveryHours: Un número entero que represente cuántas horas tardará el sistema en absorber el impacto de las variables dominantes considerando sus sensibilidades tras realizar el protocolo.

Reglas:
- Si hay "DOPA_RAP", el protocolo debe ser de detox sensorial.
- Si hay "ESTRES_FIN", el protocolo debe ser de control financiero y calma.
- Sé extremadamente táctico. Poca carga cognitiva.
- Responde siempre en español.
- IMPORTANTE: estimatedRecoveryHours y resolutionPotential DEBEN ser números, no strings.`,
});

const generateProtocolRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateProtocolRecommendationsFlow',
    inputSchema: GenerateProtocolRecommendationsInputSchema,
    outputSchema: GenerateProtocolRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

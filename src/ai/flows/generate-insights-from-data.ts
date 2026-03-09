'use server';

/**
 * @fileOverview Generates insights and recommendations based on user data.
 *
 * - generateInsights - A function that takes user data and returns insights and recommendations.
 * - GenerateInsightsInput - The input type for the generateInsights function.
 * - GenerateInsightsOutput - The return type for the generateInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInsightsInputSchema = z.object({
  events: z.string().describe('A stringified JSON array of daily events.'),
  transactions: z.string().describe('A stringified JSON array of financial transactions.'),
  interactions: z.string().describe('A stringified JSON array of relationship interactions.'),
  kpis: z.string().describe('A stringified JSON object of calculated KPIs.'),
  overallState: z.string().describe('The overall state of the user (OK/RISK/CRITICAL).'),
  question: z.string().describe('The user question about their data. This could be a specific query or a general request for the most important insight.'),
});

export type GenerateInsightsInput = z.infer<typeof GenerateInsightsInputSchema>;

const GenerateInsightsOutputSchema = z.object({
  insights: z.string().describe('Una idea y recomendación concisa y accionable basada en los datos y la pregunta del usuario. Habla directamente al usuario en un tono de apoyo pero claro. La respuesta debe ser un solo párrafo y en español.'),
});

export type GenerateInsightsOutput = z.infer<typeof GenerateInsightsOutputSchema>;

export async function generateInsights(input: GenerateInsightsInput): Promise<GenerateInsightsOutput> {
  return generateInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInsightsPrompt',
  input: {schema: GenerateInsightsInputSchema},
  output: {schema: GenerateInsightsOutputSchema},
  model: 'googleai/gemini-2.5-flash',
  prompt: `Eres un asesor de bienestar personal llamado Axiom. Tu tono es de apoyo, claro y directo. Responde siempre en español. Analiza los datos de usuario proporcionados para responder a su pregunta o proporcionar la información más crítica. Genera un único párrafo conciso que sea fácil de entender y directamente accionable.

Pregunta del Usuario: {{{question}}}

Datos Clave del Usuario:
- Estado General: {{{overallState}}}
- KPIs: {{{kpis}}}
- Eventos Recientes: {{{events}}}
- Transacciones Recientes: {{{transactions}}}
- Interacciones Recientes: {{{interactions}}}

En base a esto, proporciona tu respuesta.`,
});

const generateInsightsFlow = ai.defineFlow(
  {
    name: 'generateInsightsFlow',
    inputSchema: GenerateInsightsInputSchema,
    outputSchema: GenerateInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


'use server';

/**
 * @fileOverview A comprehensive AI agent that designs a full system (Objective, Habits, Milestones) from a user's goal.
 *
 * - generateSystemPlan - The main function to generate the system plan.
 * - GenerateSystemPlanInput - The input type for the function.
 * - GenerateSystemPlanOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schemas for AI input
const SkillSchemaForAI = z.object({
  habilidad_id: z.string(),
  nombre: z.string(),
});

const VariableSchemaForAI = z.object({
  var_id: z.string(),
  var_nombre: z.string(),
});

// Schema for the flow input
const GenerateSystemPlanInputSchema = z.object({
  userPrompt: z.string().describe("The user's goal described in natural language."),
  skills: z.array(SkillSchemaForAI).describe('A list of available skills the user is working on.'),
  variables: z.array(VariableSchemaForAI).describe('A list of available variables the user can track.'),
});
export type GenerateSystemPlanInput = z.infer<typeof GenerateSystemPlanInputSchema>;


// Schemas for AI output
const SuggestedHabitSchema = z.object({
  var_id: z.string().describe('The ID of the most relevant variable from the provided list to track this habit.'),
  frecuencia: z.enum(['Diaria', '3xSemana', 'Semanal', 'Mensual']).describe('The suggested frequency for this habit.'),
  minimo_viable: z.boolean().describe('Whether this habit is a "minimum viable" version, designed to be very easy to accomplish.'),
  duracion_min: z.number().describe('The suggested duration in minutes for a single session of this habit.'),
  description: z.string().describe('A short, user-friendly description of the suggested habit.'),
});

const SuggestedMilestoneSchema = z.object({
  nombre: z.string().describe('A specific, measurable, and motivating name for the milestone.'),
  milestone_type: z.enum(['single', 'recurring']).describe("Whether this is a one-time achievement ('single') or a recurring task to be tracked ('recurring')."),
  target_count: z.number().int().optional().describe('For recurring milestones, the number of repetitions to complete it. For single milestones, this is not needed.'),
  relative_deadline_days: z.number().int().describe('An estimated number of days from today to complete this milestone (e.g., 7, 30, 90).'),
});

// Schema for the flow output
const GenerateSystemPlanOutputSchema = z.object({
  systemObjective: z.string().describe("A concise and inspiring objective for the system, derived from the user's prompt."),
  skillId: z.string().describe('The ID of the most relevant skill from the provided list that this system will develop.'),
  suggestedHabits: z.array(SuggestedHabitSchema).describe('A list of 2-4 concrete habits that will form the basis of the system.'),
  suggestedMilestones: z.array(SuggestedMilestoneSchema).describe('A list of 2-3 specific milestones to track progress towards the objective.'),
});
export type GenerateSystemPlanOutput = z.infer<typeof GenerateSystemPlanOutputSchema>;


export async function generateSystemPlan(input: GenerateSystemPlanInput): Promise<GenerateSystemPlanOutput> {
  return generateSystemPlanFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateSystemPlanPrompt',
  input: {schema: GenerateSystemPlanInputSchema},
  output: {schema: GenerateSystemPlanOutputSchema},
  model: 'googleai/gemini-2.5-flash',
  prompt: `Eres un coach de productividad experto en crear sistemas de cambio de comportamiento basados en el libro "Atomic Habits". Tu tarea es ayudar a un usuario a convertir una meta abstracta en un plan de acción concreto y completo.

Meta del Usuario:
"{{userPrompt}}"

Aquí están las piezas que tienes disponibles para construir el sistema:

Habilidades Disponibles (El "qué" general que el usuario quiere mejorar):
{{#each skills}}
- {{nombre}} (ID: {{habilidad_id}})
{{/each}}

Variables de Seguimiento Disponibles (Las acciones atómicas que el usuario puede registrar):
{{#each variables}}
- {{var_nombre}} (ID: {{var_id}})
{{/each}}

Tu misión es generar un plan completo en formato JSON con los siguientes componentes:

1.  **systemObjective**: Basado en la meta del usuario, crea un objetivo para el sistema que sea claro, conciso e inspirador. Ej: "Establecer una rutina matutina para empezar el día con energía".

2.  **skillId**: Analiza la meta del usuario y las habilidades disponibles. Elige la **única habilidad más relevante** de la lista que este sistema ayudará a desarrollar. Devuelve su ID exacto.

3.  **suggestedHabits**: Propón entre 2 y 4 hábitos clave para este sistema. Para cada hábito:
    *   **description**: Una descripción muy corta y motivadora.
    *   **var_id**: Elige la variable de la lista que mejor represente la acción de este hábito.
    *   **frecuencia**: Recomienda una frecuencia realista ('Diaria', '3xSemana', 'Semanal').
    *   **duracion_min**: Sugiere una duración en minutos.
    *   **minimo_viable**: Decide si es un "hábito mínimo viable" (tan fácil que es imposible decir que no).

4.  **suggestedMilestones**: Propón 2 o 3 hitos medibles para dar al usuario una sensación de progreso. Para cada hito:
    *   **nombre**: Un nombre específico y motivador. Ej: "Completar 5 sesiones de gimnasio" o "Terminar el primer borrador del capítulo 1".
    *   **milestone_type**: Decide si es un logro de una sola vez ('single') o una tarea a repetir ('recurring').
    *   **target_count**: Si es 'recurring', ¿cuántas veces debe hacerse? (ej: 5). Opcional para 'single'.
    *   **relative_deadline_days**: Estima un plazo realista en días desde hoy (ej: 7 para un hito semanal, 30 para uno mensual).

Responde siempre en español.`,
});


const generateSystemPlanFlow = ai.defineFlow(
  {
    name: 'generateSystemPlanFlow',
    inputSchema: GenerateSystemPlanInputSchema,
    outputSchema: GenerateSystemPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

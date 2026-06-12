'use server';

/**
 * @fileOverview AI agent that generates a personalized Axiom setup based on onboarding answers.
 *
 * - generateOnboardingSetup - The main function to generate the initial profile and system.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OnboardingSetupInputSchema = z.object({
  physicalStats: z.object({
    age: z.number(),
    weight: z.number(),
    height: z.number(),
  }),
  personality: z.object({
    mbti: z.string(),
    enneagram: z.string(),
  }),
  sensitivityScores: z.object({
    stress: z.number(),
    dopamine: z.number(),
    sleep: z.number(),
    emotional: z.number(),
    environmental: z.number(),
    pressure: z.number(),
  }).describe('User raw scores (1-10) for sensitivity test.'),
  challenges: z.string().describe('User description of their current struggles and situation.'),
  goals: z.array(z.string()).describe('List of main goals/areas the user wants to focus on.'),
});
export type OnboardingSetupInput = z.infer<typeof OnboardingSetupInputSchema>;

const OnboardingSetupOutputSchema = z.object({
  sensitivities: z.object({
    sensitivity_stress: z.number().min(0.5).max(2.0),
    sensitivity_dopamine: z.number().min(0.5).max(2.0),
    sensitivity_sleep: z.number().min(0.5).max(2.0),
    sensitivity_emotional: z.number().min(0.5).max(2.0),
    sensitivity_environmental: z.number().min(0.5).max(2.0),
    sensitivity_pressure: z.number().min(0.5).max(2.0),
  }).describe('Custom multipliers for the user sensitivity profile.'),
  startingAreaStates: z.array(z.object({
    area_id: z.string(),
    status: z.enum(['OK', 'RIESGO', 'CRITICO']),
  })).describe('Initial states for life areas based on user struggles.'),
  recommendedSkills: z.array(z.object({
    nombre: z.string(),
    area_id: z.string(),
    kpi: z.string(),
  })).describe('3-5 essential skills the user should start with.'),
  recommendedSystems: z.array(z.object({
    objetivo: z.string(),
    habilidad_name: z.string(),
    frecuencia: z.enum(['Diaria', '3xSemana', 'Semanal', 'Mensual']),
  })).describe('Systems to support the recommended skills.'),
  recommendedHabits: z.array(z.object({
    description: z.string(),
    system_objective: z.string(),
    var_id: z.string(),
    frecuencia: z.enum(['Diaria', '3xSemana', 'Semanal', 'Mensual']),
    duracion_min: z.number(),
    minimo_viable: z.boolean(),
  })).describe('Atom habits for the recommended systems.'),
});
export type OnboardingSetupOutput = z.infer<typeof OnboardingSetupOutputSchema>;

export async function generateOnboardingSetup(input: OnboardingSetupInput): Promise<OnboardingSetupOutput> {
  return generateOnboardingSetupFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOnboardingSetupPrompt',
  input: { schema: OnboardingSetupInputSchema },
  output: { schema: OnboardingSetupOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Eres el arquitecto biológico del sistema Axiom. Tu tarea es calibrar el sistema operativo personal de un nuevo usuario.

DATOS DEL USUARIO:
- Edad: {{physicalStats.age}}, MBTI: {{personality.mbti}}, Eneagrama: {{personality.enneagram}}.
- Puntuaciones de sensibilidad (1-10): 
  Estrés: {{sensitivityScores.stress}}, Dopamina: {{sensitivityScores.dopamine}}, Sueño: {{sensitivityScores.sleep}}, 
  Emoción: {{sensitivityScores.emotional}}, Entorno: {{sensitivityScores.environmental}}, Presión: {{sensitivityScores.pressure}}.
- Retos actuales: "{{challenges}}"
- Objetivos: {{#each goals}}{{{this}}}, {{/each}}

Tu misión es devolver un JSON estrictamente válido con la configuración inicial ideal:

1. **sensitivities**: Transforma las puntuaciones 1-10 en multiplicadores (0.5 a 2.0). 
   - 5 es el valor base (1.0).
   - Un 10 en estrés significa alta sensibilidad (>1.5). Un 1 significa resiliencia total (<0.7).
   - Ajusta basándote también en sus retos narrativos.

2. **startingAreaStates**: Determina el estado inicial de las áreas basándote en los retos del usuario. 
   IDs de Áreas válidos: SALUD_FIS, SALUD_MENT, EMOCION, CARRERA, FINANZAS, RELACIONES, ENTORNO, DOPAMINA, CREATIVIDAD, PROPOSITO.
   - Si el usuario está estresado o agobiado, EMOCION o SALUD_MENT deben estar en 'RIESGO' o 'CRITICO'.

3. **recommendedSkills / Systems / Habits**: Diseña un plan de choque de 3-4 habilidades con sus sistemas y hábitos.
   - Debe estar DIRECTAMENTE atado a los retos y objetivos concretos del usuario: cada habilidad/sistema/hábito debe atacar algo que el usuario mencionó. Nada genérico. Si dice que duerme mal, prioriza sueño; si menciona ansiedad por dinero, incluye control financiero; etc.
   - Los hábitos deben ser específicos y accionables (su "description" es el nombre que verá el usuario, p.ej. "Caminar 20 min al salir del trabajo", no "Hacer ejercicio").
   - IMPORTANTE: usa ÚNICAMENTE var_id de esta lista (son las variables reales del sistema; cualquier otro valor se ignora):
     Positivos: SUEÑO_PROF, FUERZA, CARDIO, WALK, BREATHING, MEDITATION, LEARNING, DEEP_WORK, DEEP_READING, SKILL_PRACTICE, CREATIVITY, SOCIAL_OK, DEEP_CONV, HEALTHY_MEAL, READING, HOBBY_ACTIVE, ENV_ORDER, PURPOSE_SENSE, VALUES_ACTION, HELP_OTHERS, GRATITUDE, BUDGET_REVIEW, SAVINGS_ACT, IMPULSE_RESISTED.
     Negativos (hábitos de evitación): DOOMSCROLLING, SOCIAL_MEDIA_BRIEF, GAMING_INTENSE, PORNO, PROCRAST, ALIM_BASURA, AZUCAR, ALCOHOL_HIGH, FINANCIAL_STRESS.
   - Para los hábitos de evitación, el objetivo es evitarlos.

Responde siempre en español y asegúrate de que todos los campos requeridos en el esquema de salida estén presentes.`,
});

const generateOnboardingSetupFlow = ai.defineFlow(
  {
    name: 'generateOnboardingSetupFlow',
    inputSchema: OnboardingSetupInputSchema,
    outputSchema: OnboardingSetupOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);

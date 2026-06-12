'use server';

import { generateInsights } from '@/ai/flows/generate-insights-from-data';
import { generateProtocolRecommendations } from '@/ai/flows/generate-protocol-recommendations';
import { generateSystemPlan } from '@/ai/flows/generate-system-plan-flow';
import { generateOnboardingSetup } from '@/ai/flows/generate-onboarding-setup-flow';
import { generateMorningBriefing } from '@/ai/flows/generate-morning-briefing';
import { generateAvatar } from '@/ai/flows/generate-avatar-flow';
import { runAxiomChat, type ChatMessage, type ChatActionHints, type ChatResult } from '@/ai/flows/chat-with-axiom';
import { parseNaturalLog, type ParseNaturalLogOutput, type ParsedLogEvent } from '@/ai/flows/parse-natural-log';
import type { OnboardingSetupInput, OnboardingSetupOutput } from '@/ai/flows/generate-onboarding-setup-flow';
import type { GenerateSystemPlanOutput } from '@/ai/flows/generate-system-plan-flow';
import type { GenerateProtocolRecommendationsOutput } from '@/ai/flows/generate-protocol-recommendations';
import type { MorningBriefingOutput, MorningBriefingInput } from '@/ai/flows/generate-morning-briefing';
import type { UserData, OverallState, Variable, Skill } from './types';

export type { ParseNaturalLogOutput, ParsedLogEvent };


export async function getAIInsights(input: {
  question: string;
  overallState: string;
  kpis: string;
  events: string;
  transactions: string;
  interactions: string;
}) {
  try {
    const finalQuestion = input.question || "¿Cuál es la idea clave en la que debería centrarme hoy basándome en mis datos?";

    const insights = await generateInsights({
      ...input,
      question: finalQuestion,
    });
    return insights.insights;
  } catch (error) {
    console.error('Error generando insights de IA:', error);
    if (error instanceof Error && error.message.includes('429')) {
      return 'El asesor de IA está ocupado en este momento. Por favor, inténtalo de nuevo en unos momentos.';
    }
    return 'Lo siento, no pude generar insights en este momento. Por favor, inténtalo de nuevo más tarde.';
  }
}

export async function getAIProtocolRecommendations(input: {
    overallState: string;
    dominantVariables: string;
    areaScores?: string;
    tolerances?: string;
}): Promise<GenerateProtocolRecommendationsOutput> {
    try {
        const result = await generateProtocolRecommendations(input);
        if (!result || !result.recommendations) throw new Error("Respuesta de IA incompleta");
        return result;
    } catch (error) {
        console.error('Error generando recomendaciones de protocolo:', error);
        
        // PROTOCOLO DE RESPALDO (SAFETY FALLBACK)
        return {
            protocolName: "Protocolo de Estabilización de Emergencia",
            rationale: "El servicio de IA de Axiom no está disponible en este momento, pero tu estabilidad es prioritaria. Este protocolo estándar está diseñado para reducir la carga cognitiva inmediata.",
            recommendations: [
                "Desconecta todas las pantallas durante los próximos 20 minutos.",
                "Bebe 500ml de agua fresca y realiza 5 respiraciones profundas (4-7-8).",
                "Escribe en un papel las 3 tareas que más te agobian y elige solo UNA para mañana.",
                "Realiza una actividad física ligera de 5 minutos (estiramientos o caminar)."
            ],
            estimatedRecoveryHours: 12,
            resolutionPotential: 20
        };
    }
}

export async function getAISystemPlan(userPrompt: string, skills: Skill[], variables: Variable[]): Promise<GenerateSystemPlanOutput> {
  if (!userPrompt || !variables || !skills) {
    throw new Error('Faltan datos para generar el plan del sistema.');
  }

  try {
    const aiInput: any = {
      userPrompt,
      skills: skills.map(s => ({ habilidad_id: s.habilidad_id, nombre: s.nombre, area_id: s.area_id })),
      variables: variables.map(v => ({ var_id: v.var_id, var_nombre: v.var_nombre, polaridad: v.polaridad }))
    };
    const result = await generateSystemPlan(aiInput);
    return result;
  } catch (error) {
    console.error('Error generando el plan del sistema con IA:', error);
    throw new Error('No se pudo generar el plan del sistema.');
  }
}

export async function getAIOnboardingSetup(input: OnboardingSetupInput): Promise<OnboardingSetupOutput> {
    try {
        const result = await generateOnboardingSetup(input);
        return result;
    } catch (error) {
        console.error('Error in AI onboarding setup, applying fallback:', error);
        
        // HIGH QUALITY FALLBACK SETUP
        return {
            sensitivities: {
                sensitivity_stress: 1.2,
                sensitivity_dopamine: 1.3,
                sensitivity_sleep: 1.1,
                sensitivity_emotional: 1.2,
                sensitivity_environmental: 1.0,
                sensitivity_pressure: 1.1,
            },
            startingAreaStates: [
                { area_id: 'SALUD_MENT', status: 'RIESGO' },
                { area_id: 'DOPAMINA', status: 'RIESGO' },
                { area_id: 'FINANZAS', status: 'OK' }
            ],
            recommendedSkills: [
                { nombre: 'Sueño Sólido', area_id: 'SALUD_FIS', kpi: 'Media horas sueño' },
                { nombre: 'Enfoque Profundo', area_id: 'SALUD_MENT', kpi: 'Minutos Deep Work' },
                { nombre: 'Control de Dopamina', area_id: 'DOPAMINA', kpi: 'Minutos ocio reactivo' }
            ],
            recommendedSystems: [
                { objetivo: 'Optimizar Descanso', habilidad_name: 'Sueño Sólido', frecuencia: 'Diaria' },
                { objetivo: 'Bloques de Trabajo', habilidad_name: 'Enfoque Profundo', frecuencia: 'Diaria' },
                { objetivo: 'Detox Digital', habilidad_name: 'Control de Dopamina', frecuencia: 'Diaria' }
            ],
            recommendedHabits: [
                { description: 'Dormir 7h+', system_objective: 'Optimizar Descanso', var_id: 'SUEÑO_OK', frecuencia: 'Diaria', duracion_min: 480, minimo_viable: true },
                { description: '90m Deep Work', system_objective: 'Bloques de Trabajo', var_id: 'DEEP_WORK', frecuencia: 'Diaria', duracion_min: 90, minimo_viable: true },
                { description: 'Sin redes al despertar', system_objective: 'Detox Digital', var_id: 'DOPA_RAP', frecuencia: 'Diaria', duracion_min: 0, minimo_viable: true }
            ]
        };
    }
}

export async function getAIMorningBriefing(input: MorningBriefingInput): Promise<MorningBriefingOutput> {
    try {
        return await generateMorningBriefing(input);
    } catch (error) {
        console.error('Error generating morning briefing:', error);
        return {
            directive: "DIRECTIVA: ESTABILIDAD BASE",
            diagnosis: "El sistema de análisis de IA no está disponible. Mantén tus protocolos estándar.",
            tacticalSteps: [
                "Hidratación inmediata (500ml agua).",
                "Evita dopamina barata (redes sociales) la primera hora.",
                "Identifica tu tarea más importante y ejecútala primero."
            ],
            expectedOutcome: "Mantener la integridad del sistema operativo personal."
        };
    }
}

export async function getAIAvatar(prompt: string): Promise<string> {
  if (!prompt || !prompt.trim()) {
    throw new Error('El prompt del avatar no puede estar vacío.');
  }

  const result = await generateAvatar({ prompt: prompt.trim() });
  return result.avatarDataUrl;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  context: Parameters<typeof runAxiomChat>[1],
  hints?: ChatActionHints,
): Promise<ChatResult> {
  return runAxiomChat(messages, context, hints);
}

export async function parseNaturalLogAction(
  text: string,
  variables: { var_id: string; var_nombre: string; polaridad: number }[],
): Promise<ParseNaturalLogOutput> {
  return parseNaturalLog(text, variables);
}


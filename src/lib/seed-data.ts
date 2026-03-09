
import { Area, Hormone, Variable, State, Protocol, ImpactMatrix, Relation, Account, Debt, Kpi, DashboardConfig } from './types';

export const mbtiTypes = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP"
];

export const enneagramTypes = [
  "Tipo 1", "Tipo 2", "Tipo 3", "Tipo 4",
  "Tipo 5", "Tipo 6", "Tipo 7", "Tipo 8", "Tipo 9"
];

export const areaPresets: Omit<Area, 'id'>[] = [
  { area_id: 'SALUD_FIS', area_nombre: 'Salud física', peso_estrategico: 9, prioridad: 'Alta', estado: 'OK', objetivo_12s: 'Optimizar homeostasis', kpi_principal: 'Energía/Sueño', umbral_riesgo: 6, umbral_critico: 4, ultima_revision: new Date().toISOString(), notas: 'Base fisiológica' },
  { area_id: 'SALUD_MENT', area_nombre: 'Salud mental', peso_estrategico: 9, prioridad: 'Alta', estado: 'OK', objetivo_12s: 'Foco y Claridad', kpi_principal: 'Foco/Dopamina', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Capacidad cognitiva' },
  { area_id: 'FINANZAS', area_nombre: 'Finanzas', peso_estrategico: 7, prioridad: 'Media', estado: 'OK', objetivo_12s: 'Control impulsivo', kpi_principal: 'Ahorro neto', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Paz financiera' },
  { area_id: 'RELACIONES', area_nombre: 'Relaciones', peso_estrategico: 8, prioridad: 'Media', estado: 'OK', objetivo_12s: 'Vínculos nutritivos', kpi_principal: 'Oxitocina/Sem', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Soporte social' },
  { area_id: 'EMOCION', area_nombre: 'Emoción', peso_estrategico: 8, prioridad: 'Alta', estado: 'OK', objetivo_12s: 'Regulación emocional', kpi_principal: 'Estabilidad/Cortisol', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Gestión de estados' },
  { area_id: 'DOPAMINA', area_nombre: 'Dopamina/Ocio', peso_estrategico: 8, prioridad: 'Alta', estado: 'OK', objetivo_12s: 'Reset dopamínico', kpi_principal: 'Foco/Serotonina', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Gestión de recompensas' },
  { area_id: 'CARRERA', area_nombre: 'Carrera', peso_estrategico: 7, prioridad: 'Media', estado: 'OK', objetivo_12s: 'Productividad', kpi_principal: 'Deep Work', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Impacto profesional' },
  { area_id: 'ENTORNO', area_nombre: 'Entorno', peso_estrategico: 6, prioridad: 'Baja', estado: 'OK', objetivo_12s: 'Orden y claridad', kpi_principal: 'Limpieza/Orden', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Arquitectura del espacio' },
  { area_id: 'PROPOSITO', area_nombre: 'Propósito', peso_estrategico: 9, prioridad: 'Alta', estado: 'OK', objetivo_12s: 'Alineación valores', kpi_principal: 'Coherencia/Valores', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Sentido de vida' }
];

export const hormonePresets: Omit<Hormone, 'id'>[] = [
    { hormone_id: 'DOPAMINA', name: 'Dopamina', current_level: 50, baseline: 50, optimal_range: '40-70', half_life_hours: 1 },
    { hormone_id: 'SEROTONINA', name: 'Serotonina', current_level: 50, baseline: 50, optimal_range: '60-90', half_life_hours: 10 },
    { hormone_id: 'CORTISOL', name: 'Cortisol', current_level: 20, baseline: 20, optimal_range: '10-25', half_life_hours: 5 },
    { hormone_id: 'FOCUS', name: 'Focus', current_level: 60, baseline: 60, optimal_range: '70-100', half_life_hours: 2 },
    { hormone_id: 'ENERGY', name: 'Energía', current_level: 60, baseline: 60, optimal_range: '70-100', half_life_hours: 12 },
    { hormone_id: 'MELATONINA', name: 'Melatonina', current_level: 50, baseline: 50, optimal_range: '0-100', half_life_hours: 24 },
    { hormone_id: 'ENDORFINAS', name: 'Endorfinas', current_level: 30, baseline: 30, optimal_range: '30-80', half_life_hours: 3 },
    { hormone_id: 'TESTOSTERONA', name: 'Testosterona', current_level: 50, baseline: 50, optimal_range: '40-90', half_life_hours: 48 },
    { hormone_id: 'OXITOCINA', name: 'Oxitocina', current_level: 40, baseline: 40, optimal_range: '50-90', half_life_hours: 2 },
    { hormone_id: 'NORADRENALINA', name: 'Noradrenalina', current_level: 20, baseline: 20, optimal_range: '10-40', half_life_hours: 1 },
    { hormone_id: 'PROLACTINA', name: 'Prolactina', current_level: 10, baseline: 10, optimal_range: '5-20', half_life_hours: 4 },
    { hormone_id: 'INSULINA', name: 'Insulina', current_level: 20, baseline: 20, optimal_range: '10-30', half_life_hours: 2 },
    { hormone_id: 'GABA', name: 'GABA', current_level: 50, baseline: 50, optimal_range: '40-80', half_life_hours: 6 },
    { hormone_id: 'PARASIMPATICO', name: 'Tono Parasimpático', current_level: 50, baseline: 50, optimal_range: '60-100', half_life_hours: 4 },
    { hormone_id: 'DOPA_LOAD', name: 'Carga Dopaminérgica', current_level: 10, baseline: 10, optimal_range: '0-30', half_life_hours: 4 },
];

export const variablePresets: Omit<Variable, 'id'>[] = [
    { var_id: 'SUEÑO_PROF', var_nombre: 'Sueño profundo', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: 1, impacto_base: 10, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'SUEÑO_BAJO', var_nombre: 'Sueño insuficiente', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: -1, impacto_base: 10, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Media', activo: true },
    { var_id: 'SIESTA', var_nombre: 'Siesta corta', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: 1, impacto_base: 5, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'FUERZA', var_nombre: 'Ejercicio fuerza', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 1, duracion_dias: 2, umbral_riesgo: 3, controlabilidad: 'Alta', activo: true },
    { var_id: 'CARDIO', var_nombre: 'Ejercicio aeróbico', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 3, controlabilidad: 'Alta', activo: true },
    { var_id: 'WALK', var_nombre: 'Caminata naturaleza', area_id: 'SALUD_FIS', tipo: 'Entorno', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'SUNLIGHT', var_nombre: 'Luz solar mañana', area_id: 'SALUD_FIS', tipo: 'Entorno', polaridad: 1, impacto_base: 5, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'BREATHING', var_nombre: 'Respiración profunda', area_id: 'EMOCION', tipo: 'Conductual', polaridad: 1, impacto_base: 4, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'MEDITATION', var_nombre: 'Meditación', area_id: 'SALUD_MENT', tipo: 'Conductual', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'DEEP_WORK', var_nombre: 'Trabajo profundo', area_id: 'CARRERA', tipo: 'Mental', polaridad: 1, impacto_base: 9, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'ACHIEVEMENT', var_nombre: 'Logro importante', area_id: 'PROPOSITO', tipo: 'Conductual', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'LEARNING', var_nombre: 'Aprendizaje', area_id: 'SALUD_MENT', tipo: 'Mental', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'CREATIVITY', var_nombre: 'Creatividad', area_id: 'SALUD_MENT', tipo: 'Mental', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'SOCIAL_OK', var_nombre: 'Social nutritivo', area_id: 'RELACIONES', tipo: 'Social', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Media', activo: true },
    { var_id: 'HUG', var_nombre: 'Abrazo', area_id: 'RELACIONES', tipo: 'Social', polaridad: 1, impacto_base: 4, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'DEEP_CONV', var_nombre: 'Conversación profunda', area_id: 'RELACIONES', tipo: 'Social', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'LAUGHTER', var_nombre: 'Reír intensamente', area_id: 'EMOCION', tipo: 'Social', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Baja', activo: true },
    { var_id: 'SEX', var_nombre: 'Sexo', area_id: 'RELACIONES', tipo: 'Física', polaridad: 1, impacto_base: 9, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'MUSIC', var_nombre: 'Escuchar música', area_id: 'EMOCION', tipo: 'Entorno', polaridad: 1, impacto_base: 4, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'NATURE_VIEW', var_nombre: 'Contemplar naturaleza', area_id: 'ENTORNO', tipo: 'Entorno', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'HEALTHY_MEAL', var_nombre: 'Comer saludable', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: 1, impacto_base: 5, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 3, controlabilidad: 'Alta', activo: true },
    { var_id: 'ALIM_BASURA', var_nombre: 'Ultraprocesados', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: -1, impacto_base: 7, curva: 'Exponencial', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'AZUCAR', var_nombre: 'Azúcar alta', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: -1, impacto_base: 8, curva: 'Exponencial', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'CAFFEINE_MOD', var_nombre: 'Cafeína moderada', area_id: 'SALUD_FIS', tipo: 'Conductual', polaridad: 1, impacto_base: 4, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'CAFFEINE_EXC', var_nombre: 'Cafeína excesiva', area_id: 'SALUD_FIS', tipo: 'Conductual', polaridad: -1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'ALCOHOL_MOD', var_nombre: 'Alcohol moderado', area_id: 'DOPAMINA', tipo: 'Conductual', polaridad: -1, impacto_base: 5, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'ALCOHOL_HIGH', var_nombre: 'Alcohol alto', area_id: 'DOPAMINA', tipo: 'Conductual', polaridad: -1, impacto_base: 9, curva: 'Exponencial', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'DOOMSCROLLING', var_nombre: 'Doomscrolling', area_id: 'DOPAMINA', tipo: 'Conductual', polaridad: -1, impacto_base: 9, curva: 'Exponencial', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'SOCIAL_MEDIA_BRIEF', var_nombre: 'Redes sociales breves', area_id: 'DOPAMINA', tipo: 'Conductual', polaridad: -1, impacto_base: 3, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 3, controlabilidad: 'Alta', activo: true },
    { var_id: 'GAMING_INTENSE', var_nombre: 'Videojuegos intensos', area_id: 'DOPAMINA', tipo: 'Conductual', polaridad: -1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'PORNO', var_nombre: 'Pornografía', area_id: 'DOPAMINA', tipo: 'Conductual', polaridad: -1, impacto_base: 10, curva: 'Exponencial', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'PROCRAST', var_nombre: 'Procrastinar', area_id: 'CARRERA', tipo: 'Conductual', polaridad: -1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'WORK_STRESS', var_nombre: 'Estrés laboral', area_id: 'CARRERA', tipo: 'Mental', polaridad: -1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Media', activo: true },
    { var_id: 'ARGUMENT', var_nombre: 'Discusión', area_id: 'RELACIONES', tipo: 'Social', polaridad: -1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'SOCIAL_REJECTION', var_nombre: 'Rechazo social', area_id: 'RELACIONES', tipo: 'Social', polaridad: -1, impacto_base: 10, curva: 'Lineal', delay_dias: 0, duracion_dias: 3, umbral_riesgo: 1, controlabilidad: 'Baja', activo: true },
    { var_id: 'FRUSTRATION', var_nombre: 'Frustración', area_id: 'EMOCION', tipo: 'Mental', polaridad: -1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Media', activo: true },
    { var_id: 'ENV_CHAOS', var_nombre: 'Caos entorno', area_id: 'ENTORNO', tipo: 'Entorno', polaridad: -1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'ENV_ORDER', var_nombre: 'Orden entorno', area_id: 'ENTORNO', tipo: 'Entorno', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'PURPOSE_SENSE', var_nombre: 'Sentido propósito', area_id: 'PROPOSITO', tipo: 'Conductual', polaridad: 1, impacto_base: 9, curva: 'Lineal', delay_dias: 0, duracion_dias: 3, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'VALUES_ACTION', var_nombre: 'Actuar según valores', area_id: 'PROPOSITO', tipo: 'Conductual', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 3, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'HELP_OTHERS', var_nombre: 'Ayudar a alguien', area_id: 'PROPOSITO', tipo: 'Social', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'GRATITUDE', var_nombre: 'Gratitud', area_id: 'EMOCION', tipo: 'Conductual', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'COLD_EXP', var_nombre: 'Exposición frío', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'SAUNA', var_nombre: 'Sauna', area_id: 'SALUD_FIS', tipo: 'Física', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
];

export const impactMatrixPresets: Omit<ImpactMatrix, 'id'>[] = [
    // SUEÑO PROFUNDO
    { matrix_id: 'IM_S_PROF_1', var_id: 'SUEÑO_PROF', hormone_id: 'CORTISOL', effect_size: -30, duration_hours: 12 },
    { matrix_id: 'IM_S_PROF_2', var_id: 'SUEÑO_PROF', hormone_id: 'DOPAMINA', effect_size: 5, duration_hours: 12 },
    { matrix_id: 'IM_S_PROF_3', var_id: 'SUEÑO_PROF', hormone_id: 'SEROTONINA', effect_size: 20, duration_hours: 12 },
    { matrix_id: 'IM_S_PROF_4', var_id: 'SUEÑO_PROF', hormone_id: 'FOCUS', effect_size: 30, duration_hours: 12 },
    { matrix_id: 'IM_S_PROF_5', var_id: 'SUEÑO_PROF', hormone_id: 'ENERGY', effect_size: 35, duration_hours: 12 },
    { matrix_id: 'IM_S_PROF_6', var_id: 'SUEÑO_PROF', hormone_id: 'MELATONINA', effect_size: 40, duration_hours: 12 },
    
    // SUEÑO INSUFICIENTE
    { matrix_id: 'IM_S_BAJO_1', var_id: 'SUEÑO_BAJO', hormone_id: 'CORTISOL', effect_size: 30, duration_hours: 12 },
    { matrix_id: 'IM_S_BAJO_2', var_id: 'SUEÑO_BAJO', hormone_id: 'DOPAMINA', effect_size: -10, duration_hours: 12 },
    { matrix_id: 'IM_S_BAJO_3', var_id: 'SUEÑO_BAJO', hormone_id: 'SEROTONINA', effect_size: -15, duration_hours: 12 },
    { matrix_id: 'IM_S_BAJO_4', var_id: 'SUEÑO_BAJO', hormone_id: 'FOCUS', effect_size: -25, duration_hours: 12 },
    { matrix_id: 'IM_S_BAJO_5', var_id: 'SUEÑO_BAJO', hormone_id: 'ENERGY', effect_size: -35, duration_hours: 12 },
    { matrix_id: 'IM_S_BAJO_6', var_id: 'SUEÑO_BAJO', hormone_id: 'MELATONINA', effect_size: -20, duration_hours: 12 },

    // SIESTA CORTA
    { matrix_id: 'IM_SIESTA_1', var_id: 'SIESTA', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 4 },
    { matrix_id: 'IM_SIESTA_2', var_id: 'SIESTA', hormone_id: 'DOPAMINA', effect_size: 5, duration_hours: 4 },
    { matrix_id: 'IM_SIESTA_3', var_id: 'SIESTA', hormone_id: 'SEROTONINA', effect_size: 10, duration_hours: 4 },
    { matrix_id: 'IM_SIESTA_4', var_id: 'SIESTA', hormone_id: 'FOCUS', effect_size: 15, duration_hours: 4 },
    { matrix_id: 'IM_SIESTA_5', var_id: 'SIESTA', hormone_id: 'ENERGY', effect_size: 20, duration_hours: 4 },

    // EJERCICIO FUERZA
    { matrix_id: 'IM_FUERZA_1', var_id: 'FUERZA', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 24 },
    { matrix_id: 'IM_FUERZA_2', var_id: 'FUERZA', hormone_id: 'DOPAMINA', effect_size: 20, duration_hours: 24 },
    { matrix_id: 'IM_FUERZA_3', var_id: 'FUERZA', hormone_id: 'SEROTONINA', effect_size: 10, duration_hours: 24 },
    { matrix_id: 'IM_FUERZA_4', var_id: 'FUERZA', hormone_id: 'FOCUS', effect_size: 15, duration_hours: 24 },
    { matrix_id: 'IM_FUERZA_5', var_id: 'FUERZA', hormone_id: 'ENERGY', effect_size: 20, duration_hours: 24 },
    { matrix_id: 'IM_FUERZA_6', var_id: 'FUERZA', hormone_id: 'ENDORFINAS', effect_size: 40, duration_hours: 24 },
    { matrix_id: 'IM_FUERZA_7', var_id: 'FUERZA', hormone_id: 'TESTOSTERONA', effect_size: 25, duration_hours: 24 },

    // EJERCICIO AERÓBICO
    { matrix_id: 'IM_CARDIO_1', var_id: 'CARDIO', hormone_id: 'CORTISOL', effect_size: -15, duration_hours: 24 },
    { matrix_id: 'IM_CARDIO_2', var_id: 'CARDIO', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 24 },
    { matrix_id: 'IM_CARDIO_3', var_id: 'CARDIO', hormone_id: 'SEROTONINA', effect_size: 25, duration_hours: 24 },
    { matrix_id: 'IM_CARDIO_4', var_id: 'CARDIO', hormone_id: 'FOCUS', effect_size: 10, duration_hours: 24 },
    { matrix_id: 'IM_CARDIO_5', var_id: 'CARDIO', hormone_id: 'ENERGY', effect_size: 30, duration_hours: 24 },
    { matrix_id: 'IM_CARDIO_6', var_id: 'CARDIO', hormone_id: 'ENDORFINAS', effect_size: 35, duration_hours: 24 },

    // CAMINATA NATURALEZA
    { matrix_id: 'IM_WALK_1', var_id: 'WALK', hormone_id: 'CORTISOL', effect_size: -20, duration_hours: 12 },
    { matrix_id: 'IM_WALK_2', var_id: 'WALK', hormone_id: 'DOPAMINA', effect_size: 10, duration_hours: 12 },
    { matrix_id: 'IM_WALK_3', var_id: 'WALK', hormone_id: 'SEROTONINA', effect_size: 25, duration_hours: 12 },
    { matrix_id: 'IM_WALK_4', var_id: 'WALK', hormone_id: 'FOCUS', effect_size: 15, duration_hours: 12 },
    { matrix_id: 'IM_WALK_5', var_id: 'WALK', hormone_id: 'ENERGY', effect_size: 15, duration_hours: 12 },

    // LUZ SOLAR MAÑANA
    { matrix_id: 'IM_SUN_1', var_id: 'SUNLIGHT', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 6 },
    { matrix_id: 'IM_SUN_2', var_id: 'SUNLIGHT', hormone_id: 'DOPAMINA', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_SUN_3', var_id: 'SUNLIGHT', hormone_id: 'SEROTONINA', effect_size: 20, duration_hours: 6 },
    { matrix_id: 'IM_SUN_4', var_id: 'SUNLIGHT', hormone_id: 'FOCUS', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_SUN_5', var_id: 'SUNLIGHT', hormone_id: 'ENERGY', effect_size: 20, duration_hours: 6 },
    { matrix_id: 'IM_SUN_6', var_id: 'SUNLIGHT', hormone_id: 'MELATONINA', effect_size: -20, duration_hours: 6 },

    // RESPIRACIÓN PROFUNDA
    { matrix_id: 'IM_BREATH_1', var_id: 'BREATHING', hormone_id: 'CORTISOL', effect_size: -20, duration_hours: 2 },
    { matrix_id: 'IM_BREATH_2', var_id: 'BREATHING', hormone_id: 'DOPAMINA', effect_size: 5, duration_hours: 2 },
    { matrix_id: 'IM_BREATH_3', var_id: 'BREATHING', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 2 },
    { matrix_id: 'IM_BREATH_4', var_id: 'BREATHING', hormone_id: 'FOCUS', effect_size: 10, duration_hours: 2 },
    { matrix_id: 'IM_BREATH_5', var_id: 'BREATHING', hormone_id: 'ENERGY', effect_size: 10, duration_hours: 2 },
    { matrix_id: 'IM_BREATH_6', var_id: 'BREATHING', hormone_id: 'PARASIMPATICO', effect_size: 40, duration_hours: 2 },

    // MEDITACIÓN
    { matrix_id: 'IM_MED_1', var_id: 'MEDITATION', hormone_id: 'CORTISOL', effect_size: -25, duration_hours: 12 },
    { matrix_id: 'IM_MED_2', var_id: 'MEDITATION', hormone_id: 'DOPAMINA', effect_size: 10, duration_hours: 12 },
    { matrix_id: 'IM_MED_3', var_id: 'MEDITATION', hormone_id: 'SEROTONINA', effect_size: 30, duration_hours: 12 },
    { matrix_id: 'IM_MED_4', var_id: 'MEDITATION', hormone_id: 'FOCUS', effect_size: 20, duration_hours: 12 },
    { matrix_id: 'IM_MED_5', var_id: 'MEDITATION', hormone_id: 'ENERGY', effect_size: 10, duration_hours: 12 },

    // TRABAJO PROFUNDO
    { matrix_id: 'IM_DEEP_1', var_id: 'DEEP_WORK', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 3 },
    { matrix_id: 'IM_DEEP_2', var_id: 'DEEP_WORK', hormone_id: 'DOPAMINA', effect_size: 20, duration_hours: 3 },
    { matrix_id: 'IM_DEEP_3', var_id: 'DEEP_WORK', hormone_id: 'SEROTONINA', effect_size: 10, duration_hours: 3 },
    { matrix_id: 'IM_DEEP_4', var_id: 'DEEP_WORK', hormone_id: 'FOCUS', effect_size: 35, duration_hours: 3 },
    { matrix_id: 'IM_DEEP_5', var_id: 'DEEP_WORK', hormone_id: 'ENERGY', effect_size: -10, duration_hours: 3 },
    { matrix_id: 'IM_DEEP_6', var_id: 'DEEP_WORK', hormone_id: 'NORADRENALINA', effect_size: 15, duration_hours: 3 },

    // DOOMSCROLLING
    { matrix_id: 'IM_DOOM_1', var_id: 'DOOMSCROLLING', hormone_id: 'CORTISOL', effect_size: 15, duration_hours: 2 },
    { matrix_id: 'IM_DOOM_2', var_id: 'DOOMSCROLLING', hormone_id: 'DOPAMINA', effect_size: 60, duration_hours: 2 },
    { matrix_id: 'IM_DOOM_3', var_id: 'DOOMSCROLLING', hormone_id: 'SEROTONINA', effect_size: -25, duration_hours: 2 },
    { matrix_id: 'IM_DOOM_4', var_id: 'DOOMSCROLLING', hormone_id: 'FOCUS', effect_size: -40, duration_hours: 2 },
    { matrix_id: 'IM_DOOM_5', var_id: 'DOOMSCROLLING', hormone_id: 'ENERGY', effect_size: -20, duration_hours: 2 },
    { matrix_id: 'IM_DOOM_6', var_id: 'DOOMSCROLLING', hormone_id: 'DOPA_LOAD', effect_size: 60, duration_hours: 4 },

    // PORNOGRAFÍA
    { matrix_id: 'IM_PORNO_1', var_id: 'PORNO', hormone_id: 'CORTISOL', effect_size: 20, duration_hours: 4 },
    { matrix_id: 'IM_PORNO_2', var_id: 'PORNO', hormone_id: 'DOPAMINA', effect_size: 70, duration_hours: 4 },
    { matrix_id: 'IM_PORNO_3', var_id: 'PORNO', hormone_id: 'SEROTONINA', effect_size: -30, duration_hours: 4 },
    { matrix_id: 'IM_PORNO_4', var_id: 'PORNO', hormone_id: 'FOCUS', effect_size: -40, duration_hours: 4 },
    { matrix_id: 'IM_PORNO_5', var_id: 'PORNO', hormone_id: 'ENERGY', effect_size: -20, duration_hours: 4 },
    { matrix_id: 'IM_PORNO_6', var_id: 'PORNO', hormone_id: 'DOPA_LOAD', effect_size: 80, duration_hours: 6 },
    { matrix_id: 'IM_PORNO_7', var_id: 'PORNO', hormone_id: 'PROLACTINA', effect_size: 30, duration_hours: 4 },

    // AZÚCAR ALTA
    { matrix_id: 'IM_AZUCAR_1', var_id: 'AZUCAR', hormone_id: 'CORTISOL', effect_size: 5, duration_hours: 6 },
    { matrix_id: 'IM_AZUCAR_2', var_id: 'AZUCAR', hormone_id: 'DOPAMINA', effect_size: 50, duration_hours: 6 },
    { matrix_id: 'IM_AZUCAR_3', var_id: 'AZUCAR', hormone_id: 'SEROTONINA', effect_size: -20, duration_hours: 6 },
    { matrix_id: 'IM_AZUCAR_4', var_id: 'AZUCAR', hormone_id: 'FOCUS', effect_size: -30, duration_hours: 6 },
    { matrix_id: 'IM_AZUCAR_5', var_id: 'AZUCAR', hormone_id: 'ENERGY', effect_size: -40, duration_hours: 6 },
    { matrix_id: 'IM_AZUCAR_6', var_id: 'AZUCAR', hormone_id: 'DOPA_LOAD', effect_size: 40, duration_hours: 4 },
    { matrix_id: 'IM_AZUCAR_7', var_id: 'AZUCAR', hormone_id: 'INSULINA', effect_size: 50, duration_hours: 6 },

    // SEXO
    { matrix_id: 'IM_SEX_1', var_id: 'SEX', hormone_id: 'CORTISOL', effect_size: -20, duration_hours: 12 },
    { matrix_id: 'IM_SEX_2', var_id: 'SEX', hormone_id: 'DOPAMINA', effect_size: 40, duration_hours: 12 },
    { matrix_id: 'IM_SEX_3', var_id: 'SEX', hormone_id: 'SEROTONINA', effect_size: 25, duration_hours: 12 },
    { matrix_id: 'IM_SEX_4', var_id: 'SEX', hormone_id: 'FOCUS', effect_size: -5, duration_hours: 12 },
    { matrix_id: 'IM_SEX_5', var_id: 'SEX', hormone_id: 'ENERGY', effect_size: -5, duration_hours: 12 },
    { matrix_id: 'IM_SEX_6', var_id: 'SEX', hormone_id: 'OXITOCINA', effect_size: 60, duration_hours: 12 },
    { matrix_id: 'IM_SEX_7', var_id: 'SEX', hormone_id: 'PROLACTINA', effect_size: 20, duration_hours: 12 },

    // SOCIAL NUTRITIVO
    { matrix_id: 'IM_SOC_1', var_id: 'SOCIAL_OK', hormone_id: 'CORTISOL', effect_size: -20, duration_hours: 6 },
    { matrix_id: 'IM_SOC_2', var_id: 'SOCIAL_OK', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_SOC_3', var_id: 'SOCIAL_OK', hormone_id: 'SEROTONINA', effect_size: 30, duration_hours: 6 },
    { matrix_id: 'IM_SOC_4', var_id: 'SOCIAL_OK', hormone_id: 'FOCUS', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_SOC_5', var_id: 'SOCIAL_OK', hormone_id: 'ENERGY', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_SOC_6', var_id: 'SOCIAL_OK', hormone_id: 'OXITOCINA', effect_size: 50, duration_hours: 6 },
];

export const relationPresets: Omit<Relation, 'id'>[] = [
    { persona_id: 'FAM_1', nombre: 'Familia', rol: 'Familia', energia_neta: 0, respeto: 8, frecuencia: 'Semanal' },
];

export const accountPresets: Omit<Account, 'id'>[] = [
    { cuenta_id: 'BANCO_1', tipo: 'Banco', saldo: 1000 },
];

export const debtPresets: Omit<Debt, 'id'>[] = [];
export const kpiPresets: Omit<Kpi, 'id'>[] = [];
export const dashboardConfigPresets: Omit<DashboardConfig, 'id'>[] = [];
export const protocolPresets: any[] = [
    { protocolo_id: 'P_RESET_5', nombre: 'Reseteo 5 min', estado_disparador: 'RIESGO', pasos: '1. Beber agua. 2. Respirar 4-7-8. 3. Estirar.', duracion_min: 5 },
];
export const statePresets: Omit<State, 'id'>[] = [
    { estado_id: 'OK', condicion: 'Homeostasis equilibrada', restricciones: 'Ninguna', prioridad: 'Optimización' },
    { estado_id: 'RIESGO', condicion: 'Desviación hormonal detectada', restricciones: 'Evitar dopamina rápida', prioridad: 'Estabilización' },
    { estado_id: 'CRITICO', condicion: 'Agotamiento de recursos', restricciones: 'Modo supervivencia solo tareas esenciales', prioridad: 'Rescate' },
];
export const skillPresets: any[] = [];
export const systemPresets: any[] = [];
export const habitPresets: any[] = [];


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
  { area_id: 'PROPOSITO', area_nombre: 'Propósito', peso_estrategico: 9, prioridad: 'Alta', estado: 'OK', objetivo_12s: 'Alineación valores', kpi_principal: 'Coherencia/Valores', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Sentido de vida' },
  { area_id: 'CREATIVIDAD', area_nombre: 'Creatividad/Proyectos', peso_estrategico: 7, prioridad: 'Media', estado: 'OK', objetivo_12s: 'Output creativo sostenido', kpi_principal: 'Flow/Producción', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Expresión y creación' },
  { area_id: 'ESTUDIOS', area_nombre: 'Estudios/Aprendizaje', peso_estrategico: 7, prioridad: 'Media', estado: 'OK', objetivo_12s: 'Crecimiento intelectual sostenido', kpi_principal: 'Aprendizaje/Semana', umbral_riesgo: 5, umbral_critico: 3, ultima_revision: new Date().toISOString(), notas: 'Formación y desarrollo cognitivo' }
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
    { var_id: 'MEDITATION', var_nombre: 'Meditación ligera', area_id: 'SALUD_MENT', tipo: 'Conductual', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'MEDITATION_DEEP', var_nombre: 'Meditación profunda', area_id: 'SALUD_MENT', tipo: 'Conductual', polaridad: 1, impacto_base: 10, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'MIND_WANDER', var_nombre: 'Mente dispersa', area_id: 'SALUD_MENT', tipo: 'Mental', polaridad: -1, impacto_base: 4, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 3, controlabilidad: 'Media', activo: true },
    { var_id: 'DEEP_WORK', var_nombre: 'Trabajo profundo', area_id: 'CARRERA', tipo: 'Mental', polaridad: 1, impacto_base: 9, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'ACHIEVEMENT', var_nombre: 'Logro importante', area_id: 'PROPOSITO', tipo: 'Conductual', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
    { var_id: 'LEARNING', var_nombre: 'Aprendizaje', area_id: 'ESTUDIOS', tipo: 'Mental', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'DEEP_READING', var_nombre: 'Lectura técnica', area_id: 'ESTUDIOS', tipo: 'Mental', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'COURSE_PROGRESS', var_nombre: 'Avance en formación', area_id: 'ESTUDIOS', tipo: 'Conductual', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'SKILL_PRACTICE', var_nombre: 'Práctica deliberada', area_id: 'ESTUDIOS', tipo: 'Conductual', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'CREATIVITY', var_nombre: 'Actividad creativa', area_id: 'CREATIVIDAD', tipo: 'Mental', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'CREATIVE_OUTPUT', var_nombre: 'Output creativo', area_id: 'CREATIVIDAD', tipo: 'Mental', polaridad: 1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'PROJECT_PROGRESS', var_nombre: 'Avance en proyecto', area_id: 'CREATIVIDAD', tipo: 'Conductual', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'FLOW_STATE', var_nombre: 'Estado de flow', area_id: 'CREATIVIDAD', tipo: 'Mental', polaridad: 1, impacto_base: 9, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Media', activo: true },
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
    { var_id: 'READING', var_nombre: 'Lectura', area_id: 'DOPAMINA', tipo: 'Mental', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 2, controlabilidad: 'Alta', activo: true },
    { var_id: 'HOBBY_ACTIVE', var_nombre: 'Hobby activo', area_id: 'DOPAMINA', tipo: 'Conductual', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'GAME_SOCIAL', var_nombre: 'Juego social', area_id: 'DOPAMINA', tipo: 'Social', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
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
    { var_id: 'BUDGET_REVIEW', var_nombre: 'Revisión de presupuesto', area_id: 'FINANZAS', tipo: 'Conductual', polaridad: 1, impacto_base: 5, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'SAVINGS_ACT', var_nombre: 'Ahorro activo', area_id: 'FINANZAS', tipo: 'Conductual', polaridad: 1, impacto_base: 7, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'IMPULSE_RESISTED', var_nombre: 'Impulso resistido', area_id: 'FINANZAS', tipo: 'Conductual', polaridad: 1, impacto_base: 6, curva: 'Lineal', delay_dias: 0, duracion_dias: 1, umbral_riesgo: 1, controlabilidad: 'Alta', activo: true },
    { var_id: 'FINANCIAL_STRESS', var_nombre: 'Estrés financiero', area_id: 'FINANZAS', tipo: 'Mental', polaridad: -1, impacto_base: 8, curva: 'Lineal', delay_dias: 0, duracion_dias: 2, umbral_riesgo: 1, controlabilidad: 'Baja', activo: true },
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

    // MEDITACIÓN PROFUNDA (20+ min, absorción, bajo mind-wandering)
    { matrix_id: 'IM_MEDD_1', var_id: 'MEDITATION_DEEP', hormone_id: 'CORTISOL', effect_size: -40, duration_hours: 24 },
    { matrix_id: 'IM_MEDD_2', var_id: 'MEDITATION_DEEP', hormone_id: 'SEROTONINA', effect_size: 45, duration_hours: 24 },
    { matrix_id: 'IM_MEDD_3', var_id: 'MEDITATION_DEEP', hormone_id: 'FOCUS', effect_size: 30, duration_hours: 24 },
    { matrix_id: 'IM_MEDD_4', var_id: 'MEDITATION_DEEP', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 24 },
    { matrix_id: 'IM_MEDD_5', var_id: 'MEDITATION_DEEP', hormone_id: 'GABA', effect_size: 35, duration_hours: 24 },
    { matrix_id: 'IM_MEDD_6', var_id: 'MEDITATION_DEEP', hormone_id: 'PARASIMPATICO', effect_size: 50, duration_hours: 24 },
    { matrix_id: 'IM_MEDD_7', var_id: 'MEDITATION_DEEP', hormone_id: 'ENERGY', effect_size: 15, duration_hours: 24 },

    // MENTE DISPERSA (rumiación, atención fragmentada, sin anclaje)
    { matrix_id: 'IM_MWND_1', var_id: 'MIND_WANDER', hormone_id: 'CORTISOL', effect_size: 10, duration_hours: 4 },
    { matrix_id: 'IM_MWND_2', var_id: 'MIND_WANDER', hormone_id: 'FOCUS', effect_size: -15, duration_hours: 4 },
    { matrix_id: 'IM_MWND_3', var_id: 'MIND_WANDER', hormone_id: 'SEROTONINA', effect_size: -10, duration_hours: 4 },

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

    // LECTURA TÉCNICA (formación profunda, distinta del ocio)
    { matrix_id: 'IM_DREAD_1', var_id: 'DEEP_READING', hormone_id: 'FOCUS', effect_size: 20, duration_hours: 6 },
    { matrix_id: 'IM_DREAD_2', var_id: 'DEEP_READING', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_DREAD_3', var_id: 'DEEP_READING', hormone_id: 'DOPAMINA', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_DREAD_4', var_id: 'DEEP_READING', hormone_id: 'CORTISOL', effect_size: -8, duration_hours: 6 },
    { matrix_id: 'IM_DREAD_5', var_id: 'DEEP_READING', hormone_id: 'NORADRENALINA', effect_size: 10, duration_hours: 6 },

    // AVANCE EN FORMACIÓN (curso, certificación, carrera académica)
    { matrix_id: 'IM_COUR_1', var_id: 'COURSE_PROGRESS', hormone_id: 'DOPAMINA', effect_size: 20, duration_hours: 24 },
    { matrix_id: 'IM_COUR_2', var_id: 'COURSE_PROGRESS', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 24 },
    { matrix_id: 'IM_COUR_3', var_id: 'COURSE_PROGRESS', hormone_id: 'FOCUS', effect_size: 15, duration_hours: 24 },
    { matrix_id: 'IM_COUR_4', var_id: 'COURSE_PROGRESS', hormone_id: 'NORADRENALINA', effect_size: 10, duration_hours: 24 },

    // PRÁCTICA DELIBERADA (repetición consciente para adquirir habilidad)
    { matrix_id: 'IM_SKIL_1', var_id: 'SKILL_PRACTICE', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 8 },
    { matrix_id: 'IM_SKIL_2', var_id: 'SKILL_PRACTICE', hormone_id: 'FOCUS', effect_size: 25, duration_hours: 8 },
    { matrix_id: 'IM_SKIL_3', var_id: 'SKILL_PRACTICE', hormone_id: 'SEROTONINA', effect_size: 10, duration_hours: 8 },
    { matrix_id: 'IM_SKIL_4', var_id: 'SKILL_PRACTICE', hormone_id: 'NORADRENALINA', effect_size: 15, duration_hours: 8 },
    { matrix_id: 'IM_SKIL_5', var_id: 'SKILL_PRACTICE', hormone_id: 'CORTISOL', effect_size: -5, duration_hours: 8 },

    // REVISIÓN DE PRESUPUESTO (control financiero consciente)
    { matrix_id: 'IM_BUDG_1', var_id: 'BUDGET_REVIEW', hormone_id: 'CORTISOL', effect_size: -15, duration_hours: 8 },
    { matrix_id: 'IM_BUDG_2', var_id: 'BUDGET_REVIEW', hormone_id: 'SEROTONINA', effect_size: 10, duration_hours: 8 },
    { matrix_id: 'IM_BUDG_3', var_id: 'BUDGET_REVIEW', hormone_id: 'FOCUS', effect_size: 10, duration_hours: 8 },
    { matrix_id: 'IM_BUDG_4', var_id: 'BUDGET_REVIEW', hormone_id: 'DOPAMINA', effect_size: 5, duration_hours: 8 },

    // AHORRO ACTIVO (seguridad financiera, control futuro)
    { matrix_id: 'IM_SAVE_1', var_id: 'SAVINGS_ACT', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 24 },
    { matrix_id: 'IM_SAVE_2', var_id: 'SAVINGS_ACT', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 24 },
    { matrix_id: 'IM_SAVE_3', var_id: 'SAVINGS_ACT', hormone_id: 'DOPAMINA', effect_size: 10, duration_hours: 24 },

    // IMPULSO RESISTIDO (autocontrol, win psicológico)
    { matrix_id: 'IM_IMP_1', var_id: 'IMPULSE_RESISTED', hormone_id: 'SEROTONINA', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_IMP_2', var_id: 'IMPULSE_RESISTED', hormone_id: 'DOPAMINA', effect_size: 8, duration_hours: 6 },
    { matrix_id: 'IM_IMP_3', var_id: 'IMPULSE_RESISTED', hormone_id: 'DOPA_LOAD', effect_size: -15, duration_hours: 6 },
    { matrix_id: 'IM_IMP_4', var_id: 'IMPULSE_RESISTED', hormone_id: 'CORTISOL', effect_size: -5, duration_hours: 6 },

    // ESTRÉS FINANCIERO (deuda, incertidumbre económica)
    { matrix_id: 'IM_FSTR_1', var_id: 'FINANCIAL_STRESS', hormone_id: 'CORTISOL', effect_size: 25, duration_hours: 24 },
    { matrix_id: 'IM_FSTR_2', var_id: 'FINANCIAL_STRESS', hormone_id: 'SEROTONINA', effect_size: -20, duration_hours: 24 },
    { matrix_id: 'IM_FSTR_3', var_id: 'FINANCIAL_STRESS', hormone_id: 'FOCUS', effect_size: -15, duration_hours: 24 },
    { matrix_id: 'IM_FSTR_4', var_id: 'FINANCIAL_STRESS', hormone_id: 'ENERGY', effect_size: -15, duration_hours: 24 },
    { matrix_id: 'IM_FSTR_5', var_id: 'FINANCIAL_STRESS', hormone_id: 'DOPAMINA', effect_size: -10, duration_hours: 24 },

    // ACTIVIDAD CREATIVA (genérica)
    { matrix_id: 'IM_CREAT_1', var_id: 'CREATIVITY', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_CREAT_2', var_id: 'CREATIVITY', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_CREAT_3', var_id: 'CREATIVITY', hormone_id: 'FOCUS', effect_size: 20, duration_hours: 6 },
    { matrix_id: 'IM_CREAT_4', var_id: 'CREATIVITY', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 6 },
    { matrix_id: 'IM_CREAT_5', var_id: 'CREATIVITY', hormone_id: 'ENERGY', effect_size: 10, duration_hours: 6 },

    // OUTPUT CREATIVO (producción tangible: escribir, dibujar, componer)
    { matrix_id: 'IM_COUT_1', var_id: 'CREATIVE_OUTPUT', hormone_id: 'DOPAMINA', effect_size: 25, duration_hours: 8 },
    { matrix_id: 'IM_COUT_2', var_id: 'CREATIVE_OUTPUT', hormone_id: 'SEROTONINA', effect_size: 20, duration_hours: 8 },
    { matrix_id: 'IM_COUT_3', var_id: 'CREATIVE_OUTPUT', hormone_id: 'FOCUS', effect_size: 20, duration_hours: 8 },
    { matrix_id: 'IM_COUT_4', var_id: 'CREATIVE_OUTPUT', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 8 },
    { matrix_id: 'IM_COUT_5', var_id: 'CREATIVE_OUTPUT', hormone_id: 'NORADRENALINA', effect_size: 10, duration_hours: 8 },

    // AVANCE EN PROYECTO
    { matrix_id: 'IM_PROJ_1', var_id: 'PROJECT_PROGRESS', hormone_id: 'DOPAMINA', effect_size: 20, duration_hours: 6 },
    { matrix_id: 'IM_PROJ_2', var_id: 'PROJECT_PROGRESS', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_PROJ_3', var_id: 'PROJECT_PROGRESS', hormone_id: 'FOCUS', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_PROJ_4', var_id: 'PROJECT_PROGRESS', hormone_id: 'NORADRENALINA', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_PROJ_5', var_id: 'PROJECT_PROGRESS', hormone_id: 'CORTISOL', effect_size: -5, duration_hours: 6 },

    // ESTADO DE FLOW
    { matrix_id: 'IM_FLOW_1', var_id: 'FLOW_STATE', hormone_id: 'FOCUS', effect_size: 40, duration_hours: 4 },
    { matrix_id: 'IM_FLOW_2', var_id: 'FLOW_STATE', hormone_id: 'DOPAMINA', effect_size: 30, duration_hours: 4 },
    { matrix_id: 'IM_FLOW_3', var_id: 'FLOW_STATE', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 4 },
    { matrix_id: 'IM_FLOW_4', var_id: 'FLOW_STATE', hormone_id: 'CORTISOL', effect_size: -15, duration_hours: 4 },
    { matrix_id: 'IM_FLOW_5', var_id: 'FLOW_STATE', hormone_id: 'ENERGY', effect_size: -10, duration_hours: 4 },
    { matrix_id: 'IM_FLOW_6', var_id: 'FLOW_STATE', hormone_id: 'NORADRENALINA', effect_size: 20, duration_hours: 4 },

    // LECTURA (ocio saludable, reduce carga dopaminérgica)
    { matrix_id: 'IM_READ_1', var_id: 'READING', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 4 },
    { matrix_id: 'IM_READ_2', var_id: 'READING', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 4 },
    { matrix_id: 'IM_READ_3', var_id: 'READING', hormone_id: 'FOCUS', effect_size: 10, duration_hours: 4 },
    { matrix_id: 'IM_READ_4', var_id: 'READING', hormone_id: 'DOPA_LOAD', effect_size: -10, duration_hours: 4 },
    { matrix_id: 'IM_READ_5', var_id: 'READING', hormone_id: 'ENERGY', effect_size: 5, duration_hours: 4 },

    // HOBBY ACTIVO (cocinar, música, manualidades, etc.)
    { matrix_id: 'IM_HOBB_1', var_id: 'HOBBY_ACTIVE', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_HOBB_2', var_id: 'HOBBY_ACTIVE', hormone_id: 'SEROTONINA', effect_size: 20, duration_hours: 6 },
    { matrix_id: 'IM_HOBB_3', var_id: 'HOBBY_ACTIVE', hormone_id: 'CORTISOL', effect_size: -15, duration_hours: 6 },
    { matrix_id: 'IM_HOBB_4', var_id: 'HOBBY_ACTIVE', hormone_id: 'DOPA_LOAD', effect_size: -5, duration_hours: 6 },
    { matrix_id: 'IM_HOBB_5', var_id: 'HOBBY_ACTIVE', hormone_id: 'ENERGY', effect_size: 10, duration_hours: 6 },

    // JUEGO SOCIAL (juegos de mesa, deportes recreativos con otros)
    { matrix_id: 'IM_GSOC_1', var_id: 'GAME_SOCIAL', hormone_id: 'OXITOCINA', effect_size: 20, duration_hours: 4 },
    { matrix_id: 'IM_GSOC_2', var_id: 'GAME_SOCIAL', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 4 },
    { matrix_id: 'IM_GSOC_3', var_id: 'GAME_SOCIAL', hormone_id: 'SEROTONINA', effect_size: 15, duration_hours: 4 },
    { matrix_id: 'IM_GSOC_4', var_id: 'GAME_SOCIAL', hormone_id: 'CORTISOL', effect_size: -10, duration_hours: 4 },
    { matrix_id: 'IM_GSOC_5', var_id: 'GAME_SOCIAL', hormone_id: 'DOPA_LOAD', effect_size: -5, duration_hours: 4 },

    // SOCIAL NUTRITIVO
    { matrix_id: 'IM_SOC_1', var_id: 'SOCIAL_OK', hormone_id: 'CORTISOL', effect_size: -20, duration_hours: 6 },
    { matrix_id: 'IM_SOC_2', var_id: 'SOCIAL_OK', hormone_id: 'DOPAMINA', effect_size: 15, duration_hours: 6 },
    { matrix_id: 'IM_SOC_3', var_id: 'SOCIAL_OK', hormone_id: 'SEROTONINA', effect_size: 30, duration_hours: 6 },
    { matrix_id: 'IM_SOC_4', var_id: 'SOCIAL_OK', hormone_id: 'FOCUS', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_SOC_5', var_id: 'SOCIAL_OK', hormone_id: 'ENERGY', effect_size: 10, duration_hours: 6 },
    { matrix_id: 'IM_SOC_6', var_id: 'SOCIAL_OK', hormone_id: 'OXITOCINA', effect_size: 50, duration_hours: 6 },

    // ABRAZO
    { matrix_id: 'IM_HUG_1', var_id: 'HUG', hormone_id: 'OXITOCINA',   effect_size:  45, duration_hours: 4 },
    { matrix_id: 'IM_HUG_2', var_id: 'HUG', hormone_id: 'CORTISOL',    effect_size: -20, duration_hours: 4 },
    { matrix_id: 'IM_HUG_3', var_id: 'HUG', hormone_id: 'SEROTONINA',  effect_size:  20, duration_hours: 4 },
    { matrix_id: 'IM_HUG_4', var_id: 'HUG', hormone_id: 'DOPAMINA',    effect_size:  10, duration_hours: 4 },
    { matrix_id: 'IM_HUG_5', var_id: 'HUG', hormone_id: 'ENERGY',      effect_size:   8, duration_hours: 4 },

    // CONVERSACIÓN PROFUNDA
    { matrix_id: 'IM_DCONV_1', var_id: 'DEEP_CONV', hormone_id: 'SEROTONINA',  effect_size:  25, duration_hours: 8 },
    { matrix_id: 'IM_DCONV_2', var_id: 'DEEP_CONV', hormone_id: 'OXITOCINA',   effect_size:  30, duration_hours: 8 },
    { matrix_id: 'IM_DCONV_3', var_id: 'DEEP_CONV', hormone_id: 'DOPAMINA',    effect_size:  12, duration_hours: 8 },
    { matrix_id: 'IM_DCONV_4', var_id: 'DEEP_CONV', hormone_id: 'CORTISOL',    effect_size: -15, duration_hours: 8 },
    { matrix_id: 'IM_DCONV_5', var_id: 'DEEP_CONV', hormone_id: 'FOCUS',       effect_size:  10, duration_hours: 8 },

    // REÍR
    { matrix_id: 'IM_LAUG_1', var_id: 'LAUGHTER', hormone_id: 'SEROTONINA',  effect_size:  25, duration_hours: 6 },
    { matrix_id: 'IM_LAUG_2', var_id: 'LAUGHTER', hormone_id: 'OXITOCINA',   effect_size:  20, duration_hours: 6 },
    { matrix_id: 'IM_LAUG_3', var_id: 'LAUGHTER', hormone_id: 'CORTISOL',    effect_size: -20, duration_hours: 6 },
    { matrix_id: 'IM_LAUG_4', var_id: 'LAUGHTER', hormone_id: 'DOPAMINA',    effect_size:  10, duration_hours: 6 },
    { matrix_id: 'IM_LAUG_5', var_id: 'LAUGHTER', hormone_id: 'ENERGY',      effect_size:  10, duration_hours: 6 },

    // DISCUSIÓN
    { matrix_id: 'IM_ARG_1', var_id: 'ARGUMENT', hormone_id: 'CORTISOL',    effect_size:  30, duration_hours: 12 },
    { matrix_id: 'IM_ARG_2', var_id: 'ARGUMENT', hormone_id: 'SEROTONINA',  effect_size: -20, duration_hours: 12 },
    { matrix_id: 'IM_ARG_3', var_id: 'ARGUMENT', hormone_id: 'OXITOCINA',   effect_size: -25, duration_hours: 12 },
    { matrix_id: 'IM_ARG_4', var_id: 'ARGUMENT', hormone_id: 'FOCUS',       effect_size: -15, duration_hours: 12 },
    { matrix_id: 'IM_ARG_5', var_id: 'ARGUMENT', hormone_id: 'DOPAMINA',    effect_size: -10, duration_hours: 12 },
    { matrix_id: 'IM_ARG_6', var_id: 'ARGUMENT', hormone_id: 'ENERGY',      effect_size: -10, duration_hours: 12 },

    // RECHAZO SOCIAL
    { matrix_id: 'IM_REJ_1', var_id: 'SOCIAL_REJECTION', hormone_id: 'CORTISOL',    effect_size:  40, duration_hours: 72 },
    { matrix_id: 'IM_REJ_2', var_id: 'SOCIAL_REJECTION', hormone_id: 'SEROTONINA',  effect_size: -35, duration_hours: 72 },
    { matrix_id: 'IM_REJ_3', var_id: 'SOCIAL_REJECTION', hormone_id: 'DOPAMINA',    effect_size: -25, duration_hours: 72 },
    { matrix_id: 'IM_REJ_4', var_id: 'SOCIAL_REJECTION', hormone_id: 'OXITOCINA',   effect_size: -30, duration_hours: 72 },
    { matrix_id: 'IM_REJ_5', var_id: 'SOCIAL_REJECTION', hormone_id: 'FOCUS',       effect_size: -20, duration_hours: 72 },
    { matrix_id: 'IM_REJ_6', var_id: 'SOCIAL_REJECTION', hormone_id: 'ENERGY',      effect_size: -15, duration_hours: 72 },

    // SENTIDO / PROPÓSITO
    { matrix_id: 'IM_PURP_1', var_id: 'PURPOSE_SENSE', hormone_id: 'SEROTONINA',  effect_size:  30, duration_hours: 72 },
    { matrix_id: 'IM_PURP_2', var_id: 'PURPOSE_SENSE', hormone_id: 'DOPAMINA',    effect_size:  20, duration_hours: 72 },
    { matrix_id: 'IM_PURP_3', var_id: 'PURPOSE_SENSE', hormone_id: 'CORTISOL',    effect_size: -20, duration_hours: 72 },
    { matrix_id: 'IM_PURP_4', var_id: 'PURPOSE_SENSE', hormone_id: 'FOCUS',       effect_size:  15, duration_hours: 72 },
    { matrix_id: 'IM_PURP_5', var_id: 'PURPOSE_SENSE', hormone_id: 'ENERGY',      effect_size:  10, duration_hours: 72 },

    // ACTUAR SEGÚN VALORES
    { matrix_id: 'IM_VALS_1', var_id: 'VALUES_ACTION', hormone_id: 'SEROTONINA',  effect_size:  25, duration_hours: 72 },
    { matrix_id: 'IM_VALS_2', var_id: 'VALUES_ACTION', hormone_id: 'DOPAMINA',    effect_size:  15, duration_hours: 72 },
    { matrix_id: 'IM_VALS_3', var_id: 'VALUES_ACTION', hormone_id: 'CORTISOL',    effect_size: -15, duration_hours: 72 },
    { matrix_id: 'IM_VALS_4', var_id: 'VALUES_ACTION', hormone_id: 'FOCUS',       effect_size:  10, duration_hours: 72 },

    // AYUDAR A ALGUIEN
    { matrix_id: 'IM_HELP_1', var_id: 'HELP_OTHERS', hormone_id: 'OXITOCINA',   effect_size:  35, duration_hours: 48 },
    { matrix_id: 'IM_HELP_2', var_id: 'HELP_OTHERS', hormone_id: 'SEROTONINA',  effect_size:  25, duration_hours: 48 },
    { matrix_id: 'IM_HELP_3', var_id: 'HELP_OTHERS', hormone_id: 'CORTISOL',    effect_size: -15, duration_hours: 48 },
    { matrix_id: 'IM_HELP_4', var_id: 'HELP_OTHERS', hormone_id: 'DOPAMINA',    effect_size:  10, duration_hours: 48 },

    // LOGRO
    { matrix_id: 'IM_ACH_1', var_id: 'ACHIEVEMENT', hormone_id: 'DOPAMINA',    effect_size:  30, duration_hours: 48 },
    { matrix_id: 'IM_ACH_2', var_id: 'ACHIEVEMENT', hormone_id: 'SEROTONINA',  effect_size:  20, duration_hours: 48 },
    { matrix_id: 'IM_ACH_3', var_id: 'ACHIEVEMENT', hormone_id: 'CORTISOL',    effect_size: -10, duration_hours: 48 },
    { matrix_id: 'IM_ACH_4', var_id: 'ACHIEVEMENT', hormone_id: 'FOCUS',       effect_size:  15, duration_hours: 48 },
    { matrix_id: 'IM_ACH_5', var_id: 'ACHIEVEMENT', hormone_id: 'ENERGY',      effect_size:  10, duration_hours: 48 },

    // ORDEN ENTORNO
    { matrix_id: 'IM_ENVO_1', var_id: 'ENV_ORDER', hormone_id: 'CORTISOL',    effect_size: -25, duration_hours: 12 },
    { matrix_id: 'IM_ENVO_2', var_id: 'ENV_ORDER', hormone_id: 'FOCUS',       effect_size:  20, duration_hours: 12 },
    { matrix_id: 'IM_ENVO_3', var_id: 'ENV_ORDER', hormone_id: 'SEROTONINA',  effect_size:  15, duration_hours: 12 },
    { matrix_id: 'IM_ENVO_4', var_id: 'ENV_ORDER', hormone_id: 'ENERGY',      effect_size:  10, duration_hours: 12 },
    { matrix_id: 'IM_ENVO_5', var_id: 'ENV_ORDER', hormone_id: 'DOPAMINA',    effect_size:   8, duration_hours: 12 },

    // CAOS ENTORNO
    { matrix_id: 'IM_ENVC_1', var_id: 'ENV_CHAOS', hormone_id: 'CORTISOL',    effect_size:  25, duration_hours: 12 },
    { matrix_id: 'IM_ENVC_2', var_id: 'ENV_CHAOS', hormone_id: 'FOCUS',       effect_size: -20, duration_hours: 12 },
    { matrix_id: 'IM_ENVC_3', var_id: 'ENV_CHAOS', hormone_id: 'SEROTONINA',  effect_size: -15, duration_hours: 12 },
    { matrix_id: 'IM_ENVC_4', var_id: 'ENV_CHAOS', hormone_id: 'ENERGY',      effect_size: -10, duration_hours: 12 },

    // NATURALEZA
    { matrix_id: 'IM_NAT_1', var_id: 'NATURE_VIEW', hormone_id: 'CORTISOL',    effect_size: -20, duration_hours: 8 },
    { matrix_id: 'IM_NAT_2', var_id: 'NATURE_VIEW', hormone_id: 'SEROTONINA',  effect_size:  20, duration_hours: 8 },
    { matrix_id: 'IM_NAT_3', var_id: 'NATURE_VIEW', hormone_id: 'DOPAMINA',    effect_size:  10, duration_hours: 8 },
    { matrix_id: 'IM_NAT_4', var_id: 'NATURE_VIEW', hormone_id: 'FOCUS',       effect_size:  12, duration_hours: 8 },
    { matrix_id: 'IM_NAT_5', var_id: 'NATURE_VIEW', hormone_id: 'ENERGY',      effect_size:  10, duration_hours: 8 },

    // COMIDA SANA
    { matrix_id: 'IM_HEAL_1', var_id: 'HEALTHY_MEAL', hormone_id: 'ENERGY',      effect_size:  20, duration_hours: 12 },
    { matrix_id: 'IM_HEAL_2', var_id: 'HEALTHY_MEAL', hormone_id: 'SEROTONINA',  effect_size:  12, duration_hours: 12 },
    { matrix_id: 'IM_HEAL_3', var_id: 'HEALTHY_MEAL', hormone_id: 'CORTISOL',    effect_size:  -8, duration_hours: 12 },
    { matrix_id: 'IM_HEAL_4', var_id: 'HEALTHY_MEAL', hormone_id: 'FOCUS',       effect_size:  10, duration_hours: 12 },
    { matrix_id: 'IM_HEAL_5', var_id: 'HEALTHY_MEAL', hormone_id: 'DOPA_LOAD',   effect_size:  -8, duration_hours: 12 },

    // ULTRAPROCESADOS
    { matrix_id: 'IM_JUNK_1', var_id: 'ALIM_BASURA', hormone_id: 'ENERGY',      effect_size: -25, duration_hours: 12 },
    { matrix_id: 'IM_JUNK_2', var_id: 'ALIM_BASURA', hormone_id: 'SEROTONINA',  effect_size: -15, duration_hours: 12 },
    { matrix_id: 'IM_JUNK_3', var_id: 'ALIM_BASURA', hormone_id: 'CORTISOL',    effect_size:  10, duration_hours: 12 },
    { matrix_id: 'IM_JUNK_4', var_id: 'ALIM_BASURA', hormone_id: 'FOCUS',       effect_size: -15, duration_hours: 12 },
    { matrix_id: 'IM_JUNK_5', var_id: 'ALIM_BASURA', hormone_id: 'DOPA_LOAD',   effect_size:  20, duration_hours: 12 },
    { matrix_id: 'IM_JUNK_6', var_id: 'ALIM_BASURA', hormone_id: 'DOPAMINA',    effect_size:  25, duration_hours:  6 },

    // CAFEÍNA MODERADA
    { matrix_id: 'IM_CAFM_1', var_id: 'CAFFEINE_MOD', hormone_id: 'FOCUS',       effect_size:  25, duration_hours: 4 },
    { matrix_id: 'IM_CAFM_2', var_id: 'CAFFEINE_MOD', hormone_id: 'DOPAMINA',    effect_size:  15, duration_hours: 4 },
    { matrix_id: 'IM_CAFM_3', var_id: 'CAFFEINE_MOD', hormone_id: 'ENERGY',      effect_size:  20, duration_hours: 4 },
    { matrix_id: 'IM_CAFM_4', var_id: 'CAFFEINE_MOD', hormone_id: 'CORTISOL',    effect_size:   8, duration_hours: 4 },

    // CAFEÍNA EXCESIVA
    { matrix_id: 'IM_CAFE_1', var_id: 'CAFFEINE_EXC', hormone_id: 'CORTISOL',    effect_size:  25, duration_hours: 8 },
    { matrix_id: 'IM_CAFE_2', var_id: 'CAFFEINE_EXC', hormone_id: 'FOCUS',       effect_size: -15, duration_hours: 8 },
    { matrix_id: 'IM_CAFE_3', var_id: 'CAFFEINE_EXC', hormone_id: 'ENERGY',      effect_size: -15, duration_hours: 8 },
    { matrix_id: 'IM_CAFE_4', var_id: 'CAFFEINE_EXC', hormone_id: 'SEROTONINA',  effect_size: -10, duration_hours: 8 },

    // ALCOHOL MODERADO
    { matrix_id: 'IM_ALCM_1', var_id: 'ALCOHOL_MOD', hormone_id: 'CORTISOL',    effect_size:  15, duration_hours: 12 },
    { matrix_id: 'IM_ALCM_2', var_id: 'ALCOHOL_MOD', hormone_id: 'SEROTONINA',  effect_size: -10, duration_hours: 12 },
    { matrix_id: 'IM_ALCM_3', var_id: 'ALCOHOL_MOD', hormone_id: 'FOCUS',       effect_size: -15, duration_hours: 12 },
    { matrix_id: 'IM_ALCM_4', var_id: 'ALCOHOL_MOD', hormone_id: 'DOPA_LOAD',   effect_size:  15, duration_hours: 12 },
    { matrix_id: 'IM_ALCM_5', var_id: 'ALCOHOL_MOD', hormone_id: 'DOPAMINA',    effect_size:  20, duration_hours:  4 },

    // ALCOHOL ALTO
    { matrix_id: 'IM_ALCH_1', var_id: 'ALCOHOL_HIGH', hormone_id: 'CORTISOL',    effect_size:  40, duration_hours: 48 },
    { matrix_id: 'IM_ALCH_2', var_id: 'ALCOHOL_HIGH', hormone_id: 'SEROTONINA',  effect_size: -30, duration_hours: 48 },
    { matrix_id: 'IM_ALCH_3', var_id: 'ALCOHOL_HIGH', hormone_id: 'FOCUS',       effect_size: -35, duration_hours: 48 },
    { matrix_id: 'IM_ALCH_4', var_id: 'ALCOHOL_HIGH', hormone_id: 'ENERGY',      effect_size: -30, duration_hours: 48 },
    { matrix_id: 'IM_ALCH_5', var_id: 'ALCOHOL_HIGH', hormone_id: 'DOPA_LOAD',   effect_size:  40, duration_hours: 24 },
    { matrix_id: 'IM_ALCH_6', var_id: 'ALCOHOL_HIGH', hormone_id: 'DOPAMINA',    effect_size:  30, duration_hours:  6 },

    // REDES SOCIALES BREVES
    { matrix_id: 'IM_SMB_1', var_id: 'SOCIAL_MEDIA_BRIEF', hormone_id: 'DOPA_LOAD',   effect_size:  12, duration_hours: 4 },
    { matrix_id: 'IM_SMB_2', var_id: 'SOCIAL_MEDIA_BRIEF', hormone_id: 'FOCUS',       effect_size: -12, duration_hours: 4 },
    { matrix_id: 'IM_SMB_3', var_id: 'SOCIAL_MEDIA_BRIEF', hormone_id: 'CORTISOL',    effect_size:   5, duration_hours: 4 },
    { matrix_id: 'IM_SMB_4', var_id: 'SOCIAL_MEDIA_BRIEF', hormone_id: 'SEROTONINA',  effect_size:  -8, duration_hours: 4 },

    // GAMING INTENSO
    { matrix_id: 'IM_GAMI_1', var_id: 'GAMING_INTENSE', hormone_id: 'DOPA_LOAD',   effect_size:  30, duration_hours: 8 },
    { matrix_id: 'IM_GAMI_2', var_id: 'GAMING_INTENSE', hormone_id: 'CORTISOL',    effect_size:  15, duration_hours: 8 },
    { matrix_id: 'IM_GAMI_3', var_id: 'GAMING_INTENSE', hormone_id: 'FOCUS',       effect_size: -15, duration_hours: 8 },
    { matrix_id: 'IM_GAMI_4', var_id: 'GAMING_INTENSE', hormone_id: 'ENERGY',      effect_size: -20, duration_hours: 8 },
    { matrix_id: 'IM_GAMI_5', var_id: 'GAMING_INTENSE', hormone_id: 'SEROTONINA',  effect_size: -15, duration_hours: 8 },
    { matrix_id: 'IM_GAMI_6', var_id: 'GAMING_INTENSE', hormone_id: 'DOPAMINA',    effect_size:  20, duration_hours: 4 },
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

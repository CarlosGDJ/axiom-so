
import type { ColumnDef } from '@tanstack/react-table';
export type OverallState = 'OK' | 'RIESGO' | 'CRITICO';
export type LifeAreaName = 'Salud fÃ­sica' | 'Salud mental' | 'EmociÃ³n/RegulaciÃ³n' | 'Carrera/Estudios' | 'Finanzas' | 'Relaciones' | 'Entorno/Orden' | 'Dopamina/Ocio' | 'Creatividad/Proyectos' | 'PropÃ³sito/Espiritualidad';


export interface UserProfile {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  axiomAvatarDataUrl: string; // AI-generated avatar
  createdAt: string; // ISO String
}

export interface PlayerProfile {
  id: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  
  // Facet-Based Personality Model
  facet_mind_introverted: number;
  facet_mind_extraverted: number;
  facet_energy_intuitive: number;
  facet_energy_observant: number;
  facet_nature_thinking: number;
  facet_nature_feeling: number;
  facet_tactics_judging: number;
  facet_tactics_prospecting: number;
  facet_identity_assertive: number;
  facet_identity_turbulent: number;
  
  // Derived Big Five Model
  personality_openness: number;
  personality_conscientiousness: number;
  personality_extraversion: number;
  personality_agreeableness: number;
  personality_neuroticism: number;

  // Sensitivity Profile
  sensitivity_stress: number; 
  sensitivity_dopamine: number;
  sensitivity_sleep: number;
  sensitivity_emotional: number;
  sensitivity_environmental: number;
  sensitivity_pressure: number;

  mbti_type: string;
  enneagram_type: string;
}

export interface Area {
  id: string;
  area_id: string;
  area_nombre: string;
  peso_estrategico: number;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'OK' | 'RIESGO' | 'CRITICO';
  objetivo_12s: string;
  kpi_principal: string;
  umbral_riesgo: number;
  umbral_critico: number;
  ultima_revision: string; // ISO Date
  notas: string;
}

export interface Hormone {
  id: string;
  hormone_id: string;
  name: string;
  current_level: number;
  baseline: number;
  optimal_range: string;
  half_life_hours: number;
}

export interface Variable {
  id: string;
  var_id: string;
  var_nombre: string;
  area_id: string;
  tipo: 'FÃ­sica' | 'Física' | 'Mental' | 'Emocional' | 'Social' | 'Financiera' | 'Entorno' | 'Conductual';
  polaridad: 1 | -1;
  impacto_base: number;
  curva: 'Lineal' | 'Umbral' | 'Exponencial';
  delay_dias: number;
  duracion_dias: number;
  umbral_riesgo: number;
  controlabilidad: 'Alta' | 'Media' | 'Baja';
  activo: boolean;
}

export interface State {
    id: string;
    estado_id: 'OK' | 'RIESGO' | 'CRITICO';
    condicion: string;
    restricciones: string;
    prioridad: string;
}

export interface Protocol {
    id: string;
    protocolo_id: string;
    nombre: string;
    estado_disparador: 'OK' | 'RIESGO' | 'CRITICO';
    pasos: string;
    duracion_min: number;
}

export interface Event {
    id: string;
    evento_id: string;
    fecha: string; // ISO String
    var_id: string;
    intensidad: number;
    duracion_min: number;
    contexto: string;
    impulsivo: boolean;
    persona_id: string;
    monto: number;
    tipo: 'Variable' | 'Protocolo';
    milestone_id: string;
}

export interface Skill {
    id: string;
    habilidad_id: string;
    nombre: string;
    area_id: string;
    nivel_actual: number;
    nivel_objetivo: number;
    xp: number; // Experience points
    estado: 'Activa' | 'Pausa';
    kpi: string;
}

export interface System {
    id: string;
    sistema_id: string;
    habilidad_id: string;
    objetivo: string;
    frecuencia: 'Diaria' | '3xSemana' | 'Semanal' | 'Mensual';
    estado: 'Activo' | 'Pausa';
    protocolo_fallo: string;
}

export interface Habit {
    id: string;
    habito_id: string;
    sistema_id: string;
    var_id: string;
    frecuencia: 'Diaria' | '3xSemana' | 'Semanal' | 'Mensual';
    duracion_min: number;
    minimo_viable: boolean;
    description: string;
}

export interface Milestone {
    id: string;
    milestone_id: string;
    nombre: string;
    skill_id: string;
    system_id: string;
    fecha_objetivo: string; // ISO String
    estado: 'Pendiente' | 'Completado' | 'Omitido';
    fecha_completado: string; // ISO String
    notas: string;
    milestone_type: 'single' | 'recurring';
    progress_count: number;
    target_count: number;
}

export interface Relation {
    id: string;
    persona_id: string;
    nombre: string;
    rol: 'Familia' | 'Amigo' | 'Pareja' | 'Trabajo' | 'Mentor' | 'Conocido';
    energia_neta: number;
    respeto: number;
    frecuencia: 'Diaria' | 'Semanal' | 'Mensual' | 'Ocasional';
}

export interface Interaction {
    id: string;
    interaccion_id: string;
    fecha: string; // ISO String
    persona_id: string;
    energia_resultante: -1 | 0 | 1;
    respeto_percibido: -1 | 0 | 1;
    contexto: string;
}

export interface Account {
    id: string;
    cuenta_id: string;
    tipo: 'Banco' | 'Efectivo' | 'Inversion' | 'Otro';
    saldo: number;
}

export interface Transaction {
    id: string;
    transaccion_id: string;
    fecha: string; // ISO String
    tipo: 'Ingreso' | 'Gasto';
    categoria: 'Vivienda' | 'AlimentaciÃ³n' | 'Transporte' | 'Salud y Bienestar' | 'Ocio y Suscripciones' | 'Desarrollo Personal' | 'Compras' | 'Deudas' | 'Regalos y Donaciones' | 'Otros Gastos' | 'NÃ³mina' | 'Freelance/Negocio' | 'Ingresos Pasivos' | 'Regalos' | 'Otros Ingresos';
    monto: number;
    impulsivo: boolean;
    var_id: string;
    cuenta_id: string;
    deuda_id: string;
    notas: string;
}

export interface Debt {
    id: string;
    debt_id: string;
    nombre: string;
    tipo: 'Hipoteca' | 'PrÃ©stamo personal' | 'Préstamo personal' | 'Tarjeta' | 'LÃ­nea crÃ©dito' | 'Línea crédito' | 'Otro';
    principal_inicial: number;
    interes_tae: number;
    plazo_total_meses: number;
    cuota_mensual: number;
    saldo_actual: number;
    saldo_pendiente: number;
    fecha_inicio: string;
    tipo_amortizacion: 'FrancÃ©s' | 'AlemÃ¡n' | 'Revolving' | 'Otro';
    comision_amortizacion: number;
    permite_amortizacion: boolean;
    opcion_amortizacion: 'Reducir cuota' | 'Reducir plazo' | 'Ambos';
    prioridad_manual: 'Alta' | 'Media' | 'Baja';
    estres_psicologico: 'Alto' | 'Medio' | 'Bajo';
    porcentaje_pagado: number;
    estado_deuda: 'Activa' | 'Casi liquidada' | 'Liquidada';
}

export interface ImpactMatrix {
    id: string;
    matrix_id: string;
    var_id: string;
    hormone_id: string;
    effect_size: number;
    duration_hours: number;
}

export interface Kpi {
    id: string;
    metric_id: string;
    descripcion: string;
    formula: string;
    valor_actual: string;
    target: string;
    status: 'OK' | 'Riesgo';
}

export interface DashboardConfig {
    id: string;
    key: string;
    value: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    read: boolean;
    createdAt: any; // ISO String or Timestamp
    readAt?: any;
    updatedAt?: any;
    link: string;
    dedupe_key?: string;
    category?: 'finance' | 'habit' | 'milestone' | 'system' | 'state' | 'general';
    smart?: boolean;
}

// --- COMPUTED DATA TYPES ---

export interface DominantVariableInfo {
    var_id: string;
    nombre: string;
    hours_remaining: number;
    total_impact: number;
}

export interface Explanation {
    primary_cause: string;
    secondary_causes: string[];
    modifiers: string[];
}

export interface RPGStats {
    dopamina: number;
    serotonina: number;
    cortisol: number;
    foco: number;
    energia: number;
    sueno: number;
    conexion_social: number;
    carga_dopaminergica: number;
    player_score: number;
    sleep_debt_score?: number;     // 0-100 deuda crónica acumulada 7 noches
    systemic_resonance?: number;   // 0-100 acoplamiento sinérgico multi-eje
}

export interface ClinicalV2AxisScores {
    threat_load: number;
    reward_drive: number;
    executive_control: number;
    recovery_capacity: number;
    social_buffer: number;
}

export interface ClinicalV2ModelOutput {
    enabled: boolean;
    model_version: string;
    risk_score: number;
    risk_band: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
    confidence: number;
    data_quality: number;
    axis_scores: ClinicalV2AxisScores;
    markers: string[];
    /** Gradient severity for each active marker: 0 (threshold just crossed) → 1 (extreme). */
    marker_severities: Record<string, number>;
}

export interface ComputedGlobalState {
    id: string;
    estado_global: OverallState;
    reason_codes: string[];
    dominant_drain_vars_7d: DominantVariableInfo[];
    dominant_gain_vars_7d: string[];
    explanation: Explanation;
    updatedAt: any;
    rpg_stats: RPGStats;
    is_locked: boolean;
    lock_reason: string;
    lock_started_at: string | null;
    estimated_unlock_time: number; // minutes or hours
    model_version?: string;
    clinical_v2?: ClinicalV2ModelOutput | null;
    data_quality?: number | null;
}

export interface ComputedArea {
    id: string;
    area_id: string;
    score_7d: number;
    estado: 'OK' | 'RIESGO' | 'CRITICO';
}

export interface ComputedHormone {
    id: string;
    hormone_id: string;
    current_level: number;
    delta_24h: number;
}

export interface ComputedDailyScore {
    id: string;
    fecha: string;
    score_total: number;
}

export interface WeeklySnapshot {
    id: string;
    snapshot_id: string;
    fecha: any;
    estado_global: OverallState;
    scores_por_area: Array<{ area_id: string, score: number, estado: string }>;
    niveles_hormonales: Array<{ hormone_id: string, level: number }>;
    dominantes: {
        drain: string[];
        gain: string[];
    };
}


// --- UI-Specific Calculated Data ---

export interface ScoreByArea {
    area: string;
    shortArea: string;
    score: number;
}

export interface DailyScore {
    date: string;
    score: number;
    movingAverage: number;
}

export interface MonthlyFinancials {
    totalIncome: number;
    totalExpenses: number;
}

export interface RelationshipEnergy {
    outcome: string;
    count: number;
    fill: string;
}

export type { ScoreVelocity, VelocityDirection } from '@/lib/velocity';

export interface CalculatedKpis {
    scoresByArea: ScoreByArea[];
    dailyScoreTrend: DailyScore[];
    monthlyFinancials: MonthlyFinancials;
    relationshipEnergy: RelationshipEnergy[];
    scoreVelocity: import('@/lib/velocity').ScoreVelocity | null;
}

export interface UserData {
    userProfile: UserProfile | null;
    areas: Area[];
    hormones: Hormone[];
    variables: Variable[];
    impactMatrix: ImpactMatrix[];
    events: Event[];
    transactions: Transaction[];
    allTransactions: Transaction[];
    debtTransactions: Transaction[]; // Added this to have unfiltered debt payments
    interactions: Interaction[];
    skills: Skill[];
    systems: System[];
    habits: Habit[];
    milestones: Milestone[];
    protocols: Protocol[];
    states: State[];
    relations: Relation[];
    accounts: Account[];
    debts: Debt[];
    kpis: CalculatedKpis;
    overallState: OverallState;
    dominantVariables: DominantVariableInfo[];
    playerProfile: PlayerProfile | null;
    explanation: Explanation | null;
    rpg_stats: RPGStats;
    is_locked: boolean;
    lock_reason: string;
    estimated_unlock_time: number;
    clinical_v2: ClinicalV2ModelOutput | null;
}
export { ColumnDef };


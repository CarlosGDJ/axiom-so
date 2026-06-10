import { describe, it, expect } from 'vitest';
import { subHours, subDays, addHours } from 'date-fns';
import {
  computeAreaEventContributionAtTime,
  computeAreaScoreAtTime,
  getVariableDecayK,
  getPersonalityMultiplier,
} from '@/lib/area-scoring';
import type { Area, Event, PlayerProfile, Variable } from '@/lib/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date('2024-06-15T12:00:00Z');

function makeVariable(overrides: Partial<Variable> = {}): Variable {
  return {
    id: 'v1',
    var_id: 'TEST_VAR',
    var_nombre: 'Test Variable',
    area_id: 'area1',
    tipo: 'Mental',
    polaridad: 1,
    impacto_base: 10,
    curva: 'Lineal',
    delay_dias: 0,
    duracion_dias: 1,
    umbral_riesgo: 7,
    controlabilidad: 'Alta',
    activo: true,
    ...overrides,
  } as Variable;
}

function makeEvent(fecha: string, intensidad = 5, var_id = 'TEST_VAR'): Event {
  return {
    id: 'e1',
    evento_id: 'EVT_001',
    fecha,
    var_id,
    intensidad,
    duracion_min: 30,
    contexto: '',
    impulsivo: false,
    persona_id: '',
    monto: 0,
    tipo: 'Variable',
    milestone_id: '',
  } as Event;
}

function makeArea(overrides: Partial<Area> = {}): Area {
  return {
    id: 'a1',
    area_id: 'area1',
    area_nombre: 'Test Area',
    peso_estrategico: 1,
    prioridad: 'Alta',
    estado: 'OK',
    objetivo_12s: '',
    kpi_principal: '',
    umbral_riesgo: 7,
    umbral_critico: 4,
    ultima_revision: NOW.toISOString(),
    notas: '',
    ...overrides,
  } as Area;
}

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: 'p1',
    age: 28,
    weight_kg: 70,
    height_cm: 175,
    facet_mind_introverted: 50,
    facet_mind_extraverted: 50,
    facet_energy_intuitive: 50,
    facet_energy_observant: 50,
    facet_nature_thinking: 50,
    facet_nature_feeling: 50,
    facet_tactics_judging: 50,
    facet_tactics_prospecting: 50,
    facet_identity_assertive: 50,
    facet_identity_turbulent: 50,
    personality_openness: 50,
    personality_conscientiousness: 50,
    personality_extraversion: 50,
    personality_agreeableness: 50,
    personality_neuroticism: 50,
    sensitivity_stress: 1,
    sensitivity_dopamine: 1,
    sensitivity_sleep: 1,
    sensitivity_emotional: 1,
    sensitivity_environmental: 1,
    sensitivity_pressure: 1,
    mbti_type: 'INFP',
    enneagram_type: 'Tipo 4',
    ...overrides,
  } as PlayerProfile;
}

// ─── getVariableDecayK ────────────────────────────────────────────────────────

describe('getVariableDecayK', () => {
  it('returns fastest decay for Exponencial curve (impulsive)', () => {
    const v = makeVariable({ curva: 'Exponencial' });
    expect(getVariableDecayK(v)).toBe(0.22);
  });

  it('returns slowest decay for physical variables (tipo Física)', () => {
    const v = makeVariable({ tipo: 'Física' });
    expect(getVariableDecayK(v)).toBe(0.03);
  });

  it('returns slowest decay for sleep-related var_id', () => {
    const v = makeVariable({ tipo: 'Mental', var_id: 'SUEÑO_PROF' });
    expect(getVariableDecayK(v)).toBe(0.03);
  });

  it('returns slow decay for financial variables', () => {
    const v = makeVariable({ tipo: 'Financiera' });
    expect(getVariableDecayK(v)).toBe(0.04);
  });

  it('returns slow-medium decay for environmental variables', () => {
    const v = makeVariable({ tipo: 'Entorno' });
    expect(getVariableDecayK(v)).toBe(0.05);
  });

  it('returns medium decay for social variables', () => {
    const v = makeVariable({ tipo: 'Social' });
    expect(getVariableDecayK(v)).toBe(0.07);
  });

  it('returns medium decay for emotional variables', () => {
    const v = makeVariable({ tipo: 'Emocional' });
    expect(getVariableDecayK(v)).toBe(0.09);
  });

  it('returns default decay for unclassified variables', () => {
    const v = makeVariable({ tipo: 'Mental' });
    expect(getVariableDecayK(v)).toBe(0.11);
  });

  it('physical variables decay much slower than impulsive ones', () => {
    const physical  = makeVariable({ tipo: 'Física' });
    const impulsive = makeVariable({ curva: 'Exponencial' });
    expect(getVariableDecayK(physical)).toBeLessThan(getVariableDecayK(impulsive));
  });

  it('after 12 hours post-duration, physical event retains more than impulsive', () => {
    // Both at peak impact = 10, 12 hours after duration ends
    const tAfterPeak = 12;
    const physicalK  = 0.03;
    const impulsiveK = 0.22;
    const physicalRemaining  = 10 * Math.exp(-physicalK  * tAfterPeak);
    const impulsiveRemaining = 10 * Math.exp(-impulsiveK * tAfterPeak);
    expect(physicalRemaining).toBeGreaterThan(impulsiveRemaining * 3); // at least 3× more
  });
});

// ─── getPersonalityMultiplier ─────────────────────────────────────────────────

describe('getPersonalityMultiplier', () => {
  it('returns 1.0 when playerProfile is null', () => {
    const v = makeVariable({ polaridad: -1 });
    expect(getPersonalityMultiplier(v, null)).toBe(1.0);
  });

  it('returns 1.0 when playerProfile is undefined', () => {
    const v = makeVariable({ polaridad: -1 });
    expect(getPersonalityMultiplier(v, undefined)).toBe(1.0);
  });

  it('amplifies negative events for high-neuroticism users', () => {
    const v = makeVariable({ polaridad: -1, tipo: 'Mental' });
    const lowN  = makeProfile({ personality_neuroticism: 10 });
    const highN = makeProfile({ personality_neuroticism: 90 });
    const multLow  = getPersonalityMultiplier(v, lowN);
    const multHigh = getPersonalityMultiplier(v, highN);
    expect(multHigh).toBeGreaterThan(multLow);
    expect(multHigh).toBeGreaterThan(1.0);
    expect(multLow).toBeLessThan(1.0);
  });

  it('does not amplify POSITIVE events based on neuroticism', () => {
    const v = makeVariable({ polaridad: 1, tipo: 'Mental' });
    const highN = makeProfile({ personality_neuroticism: 90 });
    // Neuroticism only affects negative events
    expect(getPersonalityMultiplier(v, highN)).toBeCloseTo(1.0, 1);
  });

  it('amplifies positive behavioural events for high-conscientiousness users', () => {
    const v = makeVariable({ polaridad: 1, tipo: 'Conductual' });
    const lowC  = makeProfile({ personality_conscientiousness: 10 });
    const highC = makeProfile({ personality_conscientiousness: 90 });
    expect(getPersonalityMultiplier(v, highC)).toBeGreaterThan(getPersonalityMultiplier(v, lowC));
  });

  it('amplifies social events for high-extraversion users', () => {
    const v = makeVariable({ polaridad: 1, tipo: 'Social' });
    const introvert = makeProfile({ personality_extraversion: 10 });
    const extravert = makeProfile({ personality_extraversion: 90 });
    expect(getPersonalityMultiplier(v, extravert)).toBeGreaterThan(getPersonalityMultiplier(v, introvert));
  });

  it('clamps result to minimum 0.6', () => {
    // Extreme low neuroticism + negative event = most dampened
    const v = makeVariable({ polaridad: -1, tipo: 'Mental' });
    const minN = makeProfile({ personality_neuroticism: 0 });
    expect(getPersonalityMultiplier(v, minN)).toBeGreaterThanOrEqual(0.6);
  });

  it('clamps result to maximum 1.8', () => {
    // Extreme high neuroticism + negative event + high extraversion + social
    const v = makeVariable({ polaridad: -1, tipo: 'Social' });
    const maxN = makeProfile({ personality_neuroticism: 100, personality_extraversion: 100 });
    expect(getPersonalityMultiplier(v, maxN)).toBeLessThanOrEqual(1.8);
  });

  it('neutral profile (all 50) returns multiplier close to 1.0', () => {
    const v = makeVariable({ polaridad: -1, tipo: 'Social' });
    const neutral = makeProfile(); // all 50 by default
    expect(getPersonalityMultiplier(v, neutral)).toBeCloseTo(1.0, 1);
  });
});

// ─── computeAreaEventContributionAtTime ───────────────────────────────────────

describe('computeAreaEventContributionAtTime', () => {
  it('returns 0 for a future event', () => {
    const variable = makeVariable();
    const event = makeEvent(addHours(NOW, 1).toISOString());
    expect(computeAreaEventContributionAtTime(event, variable, NOW)).toBe(0);
  });

  it('returns 0 when within delay window', () => {
    const variable = makeVariable({ delay_dias: 1 }); // 24h delay
    const event = makeEvent(subHours(NOW, 12).toISOString()); // only 12h ago
    expect(computeAreaEventContributionAtTime(event, variable, NOW)).toBe(0);
  });

  it('returns peak impact during the active duration window', () => {
    const variable = makeVariable({
      polaridad: 1,
      impacto_base: 10,
      curva: 'Lineal',
      delay_dias: 0,
      duracion_dias: 2, // 48h window
    });
    const event = makeEvent(subHours(NOW, 24).toISOString(), 5);
    const result = computeAreaEventContributionAtTime(event, variable, NOW);
    // Linear at max intensity: factor = 1.0 → peakImpact = 1 * 10 * 1.0 * 1.0 (mult) = 10
    expect(result).toBeCloseTo(10, 5);
  });

  it('decays after the duration window using the variable-specific k', () => {
    const variable = makeVariable({
      polaridad: 1,
      impacto_base: 10,
      curva: 'Lineal',
      tipo: 'Mental',
      delay_dias: 0,
      duracion_dias: 1,
    });
    const event = makeEvent(subHours(NOW, 48).toISOString(), 5); // 24h after duration
    const k = 0.11; // Mental decay rate
    const expected = 10 * Math.exp(-k * 24);
    const result = computeAreaEventContributionAtTime(event, variable, NOW);
    expect(result).toBeCloseTo(expected, 2);
  });

  it('inverts contribution for negative polarity variables', () => {
    const variable = makeVariable({ polaridad: -1, impacto_base: 10, curva: 'Lineal' });
    const event = makeEvent(subHours(NOW, 1).toISOString(), 5);
    expect(computeAreaEventContributionAtTime(event, variable, NOW)).toBeLessThan(0);
  });

  it('applies exponential curve — higher intensity amplifies disproportionately', () => {
    const varBase = makeVariable({ curva: 'Exponencial', impacto_base: 10 });
    const lowEvent  = makeEvent(subHours(NOW, 1).toISOString(), 2);
    const highEvent = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const low  = computeAreaEventContributionAtTime(lowEvent, varBase, NOW);
    const high = computeAreaEventContributionAtTime(highEvent, varBase, NOW);
    expect(high / low).toBeCloseTo(6.25, 1);
  });

  it('applies personality multiplier when playerProfile is provided', () => {
    const variable = makeVariable({ polaridad: -1, tipo: 'Mental', curva: 'Lineal', impacto_base: 10 });
    const event    = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const neutral  = makeProfile({ personality_neuroticism: 50 });
    const highN    = makeProfile({ personality_neuroticism: 100 });
    const withNeutral = computeAreaEventContributionAtTime(event, variable, NOW, neutral);
    const withHighN   = computeAreaEventContributionAtTime(event, variable, NOW, highN);
    // High neuroticism makes negative events more negative
    expect(withHighN).toBeLessThan(withNeutral);
  });

  it('without playerProfile gives same result as with neutral profile', () => {
    const variable = makeVariable({ polaridad: -1, tipo: 'Mental', impacto_base: 10 });
    const event    = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const neutral  = makeProfile({ personality_neuroticism: 50, personality_extraversion: 50, personality_conscientiousness: 50 });
    const withoutProfile = computeAreaEventContributionAtTime(event, variable, NOW);
    const withNeutral    = computeAreaEventContributionAtTime(event, variable, NOW, neutral);
    expect(withoutProfile).toBeCloseTo(withNeutral, 1);
  });

  it('threshold curve — low intensity below threshold is dampened', () => {
    const variable = makeVariable({ curva: 'Umbral', impacto_base: 10 });
    const lowEvent = makeEvent(subHours(NOW, 1).toISOString(), 2);
    const low = computeAreaEventContributionAtTime(lowEvent, variable, NOW);
    expect(low).toBeCloseTo(10 * 0.18, 4);
  });
});

// ─── computeAreaScoreAtTime ───────────────────────────────────────────────────

describe('computeAreaScoreAtTime', () => {
  it('returns base score of 70 when no events are present', () => {
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events: [], variableById: new Map(), at: NOW });
    expect(score).toBe(70);
  });

  it('increases score above 70 with a positive event', () => {
    const variable = makeVariable({ polaridad: 1, impacto_base: 10 });
    const event    = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events: [event], variableById: new Map([['TEST_VAR', variable]]), at: NOW });
    expect(score).toBeGreaterThan(70);
  });

  it('decreases score below 70 with a negative event', () => {
    const variable = makeVariable({ polaridad: -1, impacto_base: 10 });
    const event    = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events: [event], variableById: new Map([['TEST_VAR', variable]]), at: NOW });
    expect(score).toBeLessThan(70);
  });

  it('ignores events with unknown var_id', () => {
    const event = makeEvent(subHours(NOW, 1).toISOString(), 5, 'UNKNOWN_VAR');
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events: [event], variableById: new Map(), at: NOW });
    expect(score).toBe(70);
  });

  it('clamps score to maximum 100', () => {
    const variable = makeVariable({ polaridad: 1, impacto_base: 100 });
    const events   = Array.from({ length: 10 }, (_, i) => makeEvent(subHours(NOW, i + 1).toISOString(), 5));
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events, variableById: new Map([['TEST_VAR', variable]]), at: NOW });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('clamps score to minimum 0', () => {
    const variable = makeVariable({ polaridad: -1, impacto_base: 100 });
    const events   = Array.from({ length: 10 }, (_, i) => makeEvent(subHours(NOW, i + 1).toISOString(), 5));
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events, variableById: new Map([['TEST_VAR', variable]]), at: NOW });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('caps score at 49 when globalState is CRITICO', () => {
    const variable = makeVariable({ polaridad: 1, impacto_base: 10 });
    const event    = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events: [event], variableById: new Map([['TEST_VAR', variable]]), at: NOW, globalState: 'CRITICO' });
    expect(score).toBeLessThanOrEqual(49);
  });

  it('caps score at 74 when globalState is RIESGO', () => {
    const variable = makeVariable({ polaridad: 1, impacto_base: 100 });
    const event    = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const { score } = computeAreaScoreAtTime({ area: makeArea(), events: [event], variableById: new Map([['TEST_VAR', variable]]), at: NOW, globalState: 'RIESGO' });
    expect(score).toBeLessThanOrEqual(74);
  });

  it('resolves state OK when score is above riskThreshold', () => {
    const variable = makeVariable({ polaridad: 1, impacto_base: 5 });
    const event    = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const { state } = computeAreaScoreAtTime({ area: makeArea({ umbral_riesgo: 5, umbral_critico: 3 }), events: [event], variableById: new Map([['TEST_VAR', variable]]), at: NOW });
    expect(state).toBe('OK');
  });

  it('resolves state RIESGO when score is between critical and risk threshold', () => {
    const { state } = computeAreaScoreAtTime({ area: makeArea({ umbral_riesgo: 8, umbral_critico: 4 }), events: [], variableById: new Map(), at: NOW });
    expect(state).toBe('RIESGO');
  });

  it('resolves state CRITICO when score falls below critical threshold', () => {
    const { state } = computeAreaScoreAtTime({ area: makeArea({ umbral_riesgo: 9, umbral_critico: 8 }), events: [], variableById: new Map(), at: NOW });
    expect(state).toBe('CRITICO');
  });

  it('high-neuroticism profile amplifies negative event impact on score', () => {
    const variable  = makeVariable({ polaridad: -1, tipo: 'Mental', impacto_base: 10 });
    const event     = makeEvent(subHours(NOW, 1).toISOString(), 5);
    const neutral   = makeProfile({ personality_neuroticism: 50 });
    const highN     = makeProfile({ personality_neuroticism: 100 });
    const scoreNeutral = computeAreaScoreAtTime({ area: makeArea(), events: [event], variableById: new Map([['TEST_VAR', variable]]), at: NOW, playerProfile: neutral }).score;
    const scoreHighN   = computeAreaScoreAtTime({ area: makeArea(), events: [event], variableById: new Map([['TEST_VAR', variable]]), at: NOW, playerProfile: highN }).score;
    // High-N user gets a lower score from the same negative event
    expect(scoreHighN).toBeLessThan(scoreNeutral);
  });

  it('accumulates contributions from multiple events', () => {
    const variable = makeVariable({ polaridad: 1, impacto_base: 5 });
    const events   = [makeEvent(subHours(NOW, 1).toISOString(), 5), makeEvent(subHours(NOW, 2).toISOString(), 5), makeEvent(subHours(NOW, 3).toISOString(), 5)];
    const single   = computeAreaScoreAtTime({ area: makeArea(), events: [events[0]], variableById: new Map([['TEST_VAR', variable]]), at: NOW });
    const triple   = computeAreaScoreAtTime({ area: makeArea(), events, variableById: new Map([['TEST_VAR', variable]]), at: NOW });
    expect(triple.score).toBeGreaterThan(single.score);
  });
});

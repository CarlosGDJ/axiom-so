import { describe, it, expect } from 'vitest';
import { computeClinicalModelV2 } from '@/lib/model-v2-clinical';
import type { ClinicalModelV2Input } from '@/lib/model-v2-clinical';
import type { RPGStats } from '@/lib/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<RPGStats> = {}): RPGStats {
  return {
    dopamina: 50,
    serotonina: 50,
    cortisol: 20,
    foco: 50,
    energia: 50,
    sueno: 50,
    conexion_social: 50,
    carga_dopaminergica: 20,
    player_score: 50,
    ...overrides,
  };
}

function makeInput(overrides: Partial<ClinicalModelV2Input> = {}): ClinicalModelV2Input {
  return {
    enabled: true,
    stats: makeStats(),
    events7d: 15,
    interactions7d: 5,
    transactions7d: 5,
    calibrationConfidence: 0.7,
    ...overrides,
  };
}

// ─── computeClinicalModelV2 ───────────────────────────────────────────────────

describe('computeClinicalModelV2', () => {
  it('returns null when model is disabled', () => {
    const result = computeClinicalModelV2(makeInput({ enabled: false }));
    expect(result).toBeNull();
  });

  it('returns a complete output shape when enabled', () => {
    const result = computeClinicalModelV2(makeInput());
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      enabled: true,
      model_version: 'clinical-v2.1',
      risk_score: expect.any(Number),
      risk_band: expect.any(String),
      confidence: expect.any(Number),
      data_quality: expect.any(Number),
      axis_scores: {
        threat_load: expect.any(Number),
        reward_drive: expect.any(Number),
        executive_control: expect.any(Number),
        recovery_capacity: expect.any(Number),
        social_buffer: expect.any(Number),
      },
      markers: expect.any(Array),
      marker_severities: expect.any(Object),
    });
  });

  it('produces LOW risk band for ideal stats', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({
        cortisol: 10,
        carga_dopaminergica: 5,
        energia: 90,
        dopamina: 80,
        foco: 80,
        serotonina: 80,
        sueno: 85,
        conexion_social: 80,
      }),
    }));
    expect(result?.risk_band).toBe('LOW');
    expect(result?.risk_score).toBeLessThan(40);
  });

  it('produces SEVERE risk band for worst-case stats', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({
        cortisol: 100,
        carga_dopaminergica: 100,
        energia: 0,
        dopamina: 0,
        foco: 0,
        serotonina: 0,
        sueno: 0,
        conexion_social: 0,
      }),
    }));
    expect(result?.risk_band).toBe('SEVERE');
    expect(result?.risk_score).toBeGreaterThanOrEqual(75);
  });

  it('all axis scores are within 0–100', () => {
    const result = computeClinicalModelV2(makeInput());
    const axes = result!.axis_scores;
    for (const [key, value] of Object.entries(axes)) {
      expect(value, `${key} out of range`).toBeGreaterThanOrEqual(0);
      expect(value, `${key} out of range`).toBeLessThanOrEqual(100);
    }
  });

  it('risk_score is within 0–100', () => {
    const result = computeClinicalModelV2(makeInput());
    expect(result?.risk_score).toBeGreaterThanOrEqual(0);
    expect(result?.risk_score).toBeLessThanOrEqual(100);
  });

  it('confidence is within 0–1', () => {
    const result = computeClinicalModelV2(makeInput());
    expect(result?.confidence).toBeGreaterThanOrEqual(0);
    expect(result?.confidence).toBeLessThanOrEqual(1);
  });

  it('higher signal count increases data quality', () => {
    const low = computeClinicalModelV2(makeInput({ events7d: 0, interactions7d: 0, transactions7d: 0 }));
    const high = computeClinicalModelV2(makeInput({ events7d: 30, interactions7d: 10, transactions7d: 5 }));
    expect(high!.data_quality).toBeGreaterThan(low!.data_quality);
  });

  it('higher calibration confidence increases overall confidence', () => {
    const low = computeClinicalModelV2(makeInput({ calibrationConfidence: 0 }));
    const high = computeClinicalModelV2(makeInput({ calibrationConfidence: 1 }));
    expect(high!.confidence).toBeGreaterThan(low!.confidence);
  });

  it('detects HIGH_THREAT_LOAD marker when cortisol and dopaminergic load are high', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 100, carga_dopaminergica: 100 }),
    }));
    expect(result?.markers).toContain('HIGH_THREAT_LOAD');
  });

  it('detects LOW_RECOVERY_CAPACITY marker with low sleep and energy', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ sueno: 0, energia: 0, serotonina: 0, cortisol: 100 }),
    }));
    expect(result?.markers).toContain('LOW_RECOVERY_CAPACITY');
  });

  it('detects LOW_EXECUTIVE_CONTROL marker with low focus and sleep', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ foco: 0, sueno: 0, cortisol: 100 }),
    }));
    expect(result?.markers).toContain('LOW_EXECUTIVE_CONTROL');
  });

  it('detects SLEEP_DISRUPTION marker when sleep is critically low', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ sueno: 20 }),
    }));
    expect(result?.markers).toContain('SLEEP_DISRUPTION');
  });

  it('detects LOW_CONFIDENCE_DATA marker when signal count is near zero', () => {
    const result = computeClinicalModelV2(makeInput({
      events7d: 0,
      interactions7d: 0,
      transactions7d: 0,
      calibrationConfidence: 0,
    }));
    expect(result?.markers).toContain('LOW_CONFIDENCE_DATA');
  });

  it('produces no markers for healthy stats with high confidence', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({
        cortisol: 10,
        carga_dopaminergica: 5,
        foco: 80,
        sueno: 80,
        energia: 80,
        serotonina: 80,
        dopamina: 80,
        conexion_social: 80,
      }),
      events7d: 20,
      interactions7d: 8,
      transactions7d: 5,
      calibrationConfidence: 0.9,
    }));
    expect(result?.markers).toHaveLength(0);
  });

  it('reads sleep from "sueño" key (accented) as fallback', () => {
    const statsWithAccent = {
      ...makeStats({ sueno: 0 }),
      sueño: 80, // accented key
    } as unknown as RPGStats;
    const result = computeClinicalModelV2(makeInput({ stats: statsWithAccent }));
    // With sleep=80 (from accented key), SLEEP_DISRUPTION should NOT fire
    expect(result?.markers).not.toContain('SLEEP_DISRUPTION');
  });

  it('risk_score is a rounded integer', () => {
    const result = computeClinicalModelV2(makeInput());
    expect(Number.isInteger(result?.risk_score)).toBe(true);
  });

  it('higher threat load correlates with higher risk score', () => {
    const lowThreat = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 5, carga_dopaminergica: 5, energia: 80 }),
    }));
    const highThreat = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 90, carga_dopaminergica: 90, energia: 10 }),
    }));
    expect(highThreat!.risk_score).toBeGreaterThan(lowThreat!.risk_score);
  });

  // ─── marker_severities ────────────────────────────────────────────────────

  it('marker_severities is empty when no markers are active', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({
        cortisol: 10,
        carga_dopaminergica: 5,
        foco: 80,
        sueno: 80,
        energia: 80,
        serotonina: 80,
        dopamina: 80,
        conexion_social: 80,
      }),
      events7d: 20,
      interactions7d: 8,
      transactions7d: 5,
      calibrationConfidence: 0.9,
    }));
    expect(result?.marker_severities).toEqual({});
  });

  it('marker_severities keys match active markers', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 100, carga_dopaminergica: 100 }),
    }));
    const severityKeys = Object.keys(result!.marker_severities).sort();
    const markersSorted = [...result!.markers].sort();
    expect(severityKeys).toEqual(markersSorted);
  });

  it('HIGH_THREAT_LOAD severity is within (0, 1] when active', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 100, carga_dopaminergica: 100 }),
    }));
    const sev = result!.marker_severities['HIGH_THREAT_LOAD'];
    expect(sev).toBeGreaterThan(0);
    expect(sev).toBeLessThanOrEqual(1);
  });

  it('HIGH_THREAT_LOAD severity increases as threatLoad increases', () => {
    const moderate = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 60, carga_dopaminergica: 50, energia: 30 }),
    }));
    const severe = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 100, carga_dopaminergica: 100, energia: 0 }),
    }));
    const modSev = moderate?.marker_severities['HIGH_THREAT_LOAD'] ?? 0;
    const sevSev = severe?.marker_severities['HIGH_THREAT_LOAD'] ?? 0;
    expect(sevSev).toBeGreaterThan(modSev);
  });

  it('SLEEP_DISRUPTION severity is close to 1 at sleep=0', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ sueno: 0 }),
    }));
    expect(result?.marker_severities['SLEEP_DISRUPTION']).toBeCloseTo(1, 2);
  });

  it('SLEEP_DISRUPTION severity is near 0 just past the threshold (sleep=34)', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ sueno: 34 }),
    }));
    const sev = result?.marker_severities['SLEEP_DISRUPTION'];
    expect(sev).toBeDefined();
    expect(sev!).toBeGreaterThan(0);
    expect(sev!).toBeLessThan(0.1);
  });

  it('LOW_CONFIDENCE_DATA severity is close to 1 at zero signals and zero calibration', () => {
    const result = computeClinicalModelV2(makeInput({
      events7d: 0,
      interactions7d: 0,
      transactions7d: 0,
      calibrationConfidence: 0,
    }));
    expect(result?.marker_severities['LOW_CONFIDENCE_DATA']).toBeCloseTo(1, 2);
  });

  it('all marker severities are rounded to 3 decimal places', () => {
    const result = computeClinicalModelV2(makeInput({
      stats: makeStats({ cortisol: 80, carga_dopaminergica: 80, sueno: 10, foco: 10, energia: 10 }),
    }));
    for (const [id, sev] of Object.entries(result!.marker_severities)) {
      const decimals = (sev.toString().split('.')[1] ?? '').length;
      expect(decimals, `${id} has more than 3 decimal places`).toBeLessThanOrEqual(3);
    }
  });
});

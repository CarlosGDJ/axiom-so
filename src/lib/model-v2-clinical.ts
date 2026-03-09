import type { ClinicalV2ModelOutput, RPGStats } from '@/lib/types';

type RiskBand = ClinicalV2ModelOutput['risk_band'];

export interface ClinicalModelV2Input {
  enabled: boolean;
  stats: RPGStats;
  events7d: number;
  interactions7d: number;
  transactions7d: number;
  calibrationConfidence: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function getSleepValue(stats: RPGStats): number {
  const sleepRaw = (stats as unknown as Record<string, number>)['sueño'];
  if (typeof sleepRaw === 'number') return sleepRaw;
  const fallback = (stats as unknown as Record<string, number>)['sueno'];
  return typeof fallback === 'number' ? fallback : 50;
}

function toRiskBand(score: number): RiskBand {
  if (score >= 75) return 'SEVERE';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

export function computeClinicalModelV2(input: ClinicalModelV2Input): ClinicalV2ModelOutput | null {
  if (!input.enabled) return null;

  const sleep = getSleepValue(input.stats);
  const s = input.stats;

  const threatLoad = clamp(
    (s.cortisol * 0.45) +
    (s.carga_dopaminergica * 0.35) +
    (Math.max(0, 55 - s.energia) * 0.2),
  );

  const rewardDrive = clamp(
    (s.dopamina * 0.55) +
    (s.foco * 0.25) +
    (s.energia * 0.2) -
    (s.carga_dopaminergica * 0.2),
  );

  const executiveControl = clamp(
    (s.foco * 0.55) +
    (sleep * 0.2) +
    (s.serotonina * 0.15) -
    (s.cortisol * 0.2),
  );

  const recoveryCapacity = clamp(
    (sleep * 0.4) +
    (s.energia * 0.3) +
    (s.serotonina * 0.2) +
    (s.conexion_social * 0.1) -
    (s.cortisol * 0.2),
  );

  const socialBuffer = clamp(
    (s.conexion_social * 0.7) +
    (s.serotonina * 0.3) -
    (s.cortisol * 0.15),
  );

  const riskScore = clamp(
    (threatLoad * 0.34) +
    ((100 - recoveryCapacity) * 0.24) +
    ((100 - executiveControl) * 0.2) +
    ((100 - rewardDrive) * 0.12) +
    ((100 - socialBuffer) * 0.1),
  );

  const signalCount = input.events7d + input.interactions7d + input.transactions7d;
  const signalDensity = clamp01(signalCount / 45);
  const calibrationSignal = clamp01(input.calibrationConfidence);
  const dataQuality = clamp01((signalDensity * 0.7) + (calibrationSignal * 0.3));
  const confidence = clamp01((dataQuality * 0.6) + (calibrationSignal * 0.4));

  const markers: string[] = [];
  if (threatLoad >= 65) markers.push('HIGH_THREAT_LOAD');
  if (recoveryCapacity <= 40) markers.push('LOW_RECOVERY_CAPACITY');
  if (executiveControl <= 45) markers.push('LOW_EXECUTIVE_CONTROL');
  if (rewardDrive <= 40) markers.push('LOW_REWARD_DRIVE');
  if (sleep <= 35) markers.push('SLEEP_DISRUPTION');
  if (confidence <= 0.4) markers.push('LOW_CONFIDENCE_DATA');

  return {
    enabled: true,
    model_version: 'clinical-v2.0',
    risk_score: Math.round(riskScore),
    risk_band: toRiskBand(riskScore),
    confidence: Number(confidence.toFixed(3)),
    data_quality: Number(dataQuality.toFixed(3)),
    axis_scores: {
      threat_load: Math.round(threatLoad),
      reward_drive: Math.round(rewardDrive),
      executive_control: Math.round(executiveControl),
      recovery_capacity: Math.round(recoveryCapacity),
      social_buffer: Math.round(socialBuffer),
    },
    markers,
  };
}

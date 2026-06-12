import type { DailyScore } from '@/lib/types';

export type VelocityDirection = 'rising' | 'stable' | 'drifting' | 'falling' | 'plunging';

export interface ScoreVelocity {
  daily: number;        // pts change last 1 day
  weekly: number;       // pts/day avg over last 7-day window
  acceleration: number; // change in daily velocity (negative = fall is speeding up)
  direction: VelocityDirection;
  momentum: number;     // -100 to +100 composite urgency signal
  earlyWarning: boolean; // rapid fall toward CRITICO despite score > 40
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function computeScoreVelocity(trend: DailyScore[]): ScoreVelocity | null {
  if (!trend || trend.length < 2) return null;

  const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;

  const daily = sorted[n - 1].score - sorted[n - 2].score;

  const weekWindow = sorted.slice(Math.max(0, n - 7));
  const weekly =
    weekWindow.length >= 2
      ? (weekWindow[weekWindow.length - 1].score - weekWindow[0].score) / (weekWindow.length - 1)
      : daily;

  let acceleration = 0;
  if (n >= 3) {
    const vRecent = sorted[n - 1].score - sorted[n - 2].score;
    const vPrior = sorted[n - 2].score - sorted[n - 3].score;
    acceleration = vRecent - vPrior;
  }

  let direction: VelocityDirection;
  if (weekly > 3) direction = 'rising';
  else if (weekly > -2) direction = 'stable';
  else if (weekly > -5) direction = 'drifting';
  else if (weekly > -9) direction = 'falling';
  else direction = 'plunging';

  // Weekly is the core signal; daily adds responsiveness; acceleration adds urgency
  const momentum = clamp((weekly * 7) + (daily * 2) + (acceleration * 1.5), -100, 100);

  const currentScore = sorted[n - 1].score;
  // Exige ≥4 días: con 2-3 puntos el "delta diario" es ruido, no una tendencia,
  // y disparaba falsas alarmas de caída acelerada.
  const earlyWarning = n >= 4 && weekly <= -7 && currentScore < 58;

  return { daily, weekly, acceleration, direction, momentum, earlyWarning };
}

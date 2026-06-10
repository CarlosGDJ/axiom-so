import { format, subDays, parseISO } from 'date-fns';
import type { Skill, Event, DailyScore } from './types';

// ── Rank definitions ──────────────────────────────────────────────────────────

export interface Rank {
  id: string;
  name: string;
  minXP: number;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export const RANKS: Rank[] = [
  {
    id: 'INICIADO',
    name: 'INICIADO',
    minXP: 0,
    colorClass: 'text-slate-500 dark:text-slate-400',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/20',
    description: 'Primeros pasos en el sistema.',
  },
  {
    id: 'OPERADOR',
    name: 'OPERADOR',
    minXP: 800,
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    description: 'Uso regular del sistema consolidado.',
  },
  {
    id: 'ANALISTA',
    name: 'ANALISTA',
    minXP: 2500,
    colorClass: 'text-violet-500 dark:text-violet-400',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/20',
    description: 'Patrones identificados, hábitos sólidos.',
  },
  {
    id: 'ESTRATEGA',
    name: 'ESTRATEGA',
    minXP: 7000,
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    description: 'Dominio multi-área y consistencia a largo plazo.',
  },
  {
    id: 'MAESTRO',
    name: 'MAESTRO',
    minXP: 15000,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/20',
    description: 'Rendimiento de élite sostenido.',
  },
];

// ── XP computation ────────────────────────────────────────────────────────────

/** Reconstructs total historical XP for a skill from nivel_actual + current xp. */
export function computeSkillXP(skills: Skill[]): number {
  return skills.reduce((acc, skill) => {
    const level = Math.max(1, skill.nivel_actual || 1);
    // Sum of XP spent across all past levels: 200 + 400 + ... + (level-1)*200
    const pastXP = ((level - 1) * level) / 2 * 200;
    return acc + pastXP + (skill.xp || 0);
  }, 0);
}

/**
 * XP from consistent event/habit logging over the last `lookbackDays`.
 * A day with logged events earns 10 + 3 per extra event, capped at 40.
 * Recent days (last 7) earn an extra ×1.5 if they're inside an active score streak.
 */
export function computeHabitXP(
  events: Event[],
  scoreStreakDays: Set<string>,
  lookbackDays = 90,
): number {
  const cutoff = subDays(new Date(), lookbackDays);
  const dailyCounts: Record<string, number> = {};

  events.forEach(e => {
    try {
      const d = parseISO(e.fecha);
      if (d < cutoff) return;
      const day = format(d, 'yyyy-MM-dd');
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    } catch {
      // ignore invalid dates
    }
  });

  return Object.entries(dailyCounts).reduce((acc, [day, count]) => {
    const base = Math.min(40, 10 + Math.max(0, count - 1) * 3);
    const multiplied = scoreStreakDays.has(day) ? base * 1.5 : base;
    return acc + multiplied;
  }, 0);
}

/** XP from maintaining score ≥70 (10 pts) or ≥85 (20 pts) per day. */
export function computeScoreXP(dailyScores: DailyScore[]): number {
  return dailyScores.reduce((acc, day) => {
    if (day.score >= 85) return acc + 20;
    if (day.score >= 70) return acc + 10;
    return acc;
  }, 0);
}

/**
 * Returns the set of date strings (yyyy-MM-dd) that qualify for the streak bonus:
 * the last N consecutive days (starting from today going backwards) where score ≥ 70.
 * Used to apply the habit XP multiplier only during the streak window.
 */
export function computeScoreStreakDays(dailyScores: DailyScore[]): Set<string> {
  const sorted = [...dailyScores].sort((a, b) => b.date.localeCompare(a.date));
  const streakDays = new Set<string>();
  for (const day of sorted) {
    if (day.score >= 70) streakDays.add(day.date);
    else break;
  }
  return streakDays;
}

/**
 * Active multiplier for FUTURE XP gains (shown as a badge in the UI).
 * ×1.5 for 7+ consecutive days with score ≥70.
 * ×1.2 for 3-6 consecutive days.
 */
export function computeStreakMultiplier(dailyScores: DailyScore[]): number {
  if (dailyScores.length < 3) return 1.0;
  const sorted = [...dailyScores].sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  for (const day of sorted) {
    if (day.score >= 70) streak++;
    else break;
  }

  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

// ── Main aggregator ───────────────────────────────────────────────────────────

export interface ProgressionData {
  totalXP: number;
  rank: Rank;
  nextRank: Rank | null;
  progressToNext: number;   // 0–100
  xpToNext: number;
  streakMultiplier: number;
  activeStreakDays: number; // consecutive days with score ≥70
  xpBreakdown: {
    skills: number;
    habits: number;
    score: number;
  };
}

export function computeProgression(
  skills: Skill[],
  events: Event[],
  dailyScores: DailyScore[],
): ProgressionData {
  const scoreStreakDays = computeScoreStreakDays(dailyScores);
  const streakMultiplier = computeStreakMultiplier(dailyScores);

  const skillsXP  = Math.round(computeSkillXP(skills));
  const habitsXP  = Math.round(computeHabitXP(events, scoreStreakDays));
  const scoreXP   = Math.round(computeScoreXP(dailyScores));
  const totalXP   = skillsXP + habitsXP + scoreXP;

  // Find current rank
  let rankIdx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (totalXP >= RANKS[i].minXP) rankIdx = i;
    else break;
  }
  const rank     = RANKS[rankIdx];
  const nextRank = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1] : null;

  let progressToNext = 100;
  let xpToNext = 0;
  if (nextRank) {
    const xpInThisRank     = totalXP - rank.minXP;
    const xpNeededForRank  = nextRank.minXP - rank.minXP;
    progressToNext = Math.min(100, Math.round((xpInThisRank / xpNeededForRank) * 100));
    xpToNext       = nextRank.minXP - totalXP;
  }

  return {
    totalXP,
    rank,
    nextRank,
    progressToNext,
    xpToNext,
    streakMultiplier,
    activeStreakDays: scoreStreakDays.size,
    xpBreakdown: { skills: skillsXP, habits: habitsXP, score: scoreXP },
  };
}

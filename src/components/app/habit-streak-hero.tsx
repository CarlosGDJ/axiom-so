'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Habit, Event } from '@/lib/types';
import { isSameDay, parseISO, startOfDay, subDays, differenceInCalendarDays } from 'date-fns';
import { Flame, Trophy, PartyPopper, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Racha global + celebración de hitos — patrón de apps de hábitos (Duolingo/Streaks):
// la racha es el indicador motivador nº1, bien grande, y los hitos (7/30/100/365)
// se celebran una vez al alcanzarlos.

const MILESTONES = [7, 30, 100, 365];

interface HabitStreakHeroProps {
  habits: Habit[];
  events: Event[];
}

/** Días (yyyy-mm-dd) en que se registró al menos un hábito. */
function activeDaySet(events: Event[]): Set<string> {
  const set = new Set<string>();
  for (const e of events) {
    if (!e.habito_id) continue;
    try {
      const d = startOfDay(parseISO(e.fecha));
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    } catch { /* fecha inválida → ignora */ }
  }
  return set;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Racha actual: días consecutivos con actividad terminando hoy o ayer. */
function currentStreak(active: Set<string>, today: Date): number {
  // La racha sigue viva si hubo actividad hoy o ayer (margen de 1 día).
  let cursor = active.has(dayKey(today)) ? today : subDays(today, 1);
  if (!active.has(dayKey(cursor))) return 0;
  let streak = 0;
  while (active.has(dayKey(cursor))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** Racha más larga registrada. */
function bestStreak(active: Set<string>): number {
  if (active.size === 0) return 0;
  const days = [...active]
    .map(k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m, d).getTime(); })
    .sort((a, b) => a - b);
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = differenceInCalendarDays(new Date(days[i]), new Date(days[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export default function HabitStreakHero({ habits, events }: HabitStreakHeroProps) {
  const today = startOfDay(new Date());

  const { streak, best, doneToday, totalPositive } = useMemo(() => {
    const active = activeDaySet(events);
    const done = habits.filter(h =>
      events.some(e =>
        (e.habito_id === h.id || (!e.habito_id && h.var_id && e.var_id === h.var_id)) &&
        isSameDay(parseISO(e.fecha), today),
      ),
    ).length;
    return {
      streak: currentStreak(active, today),
      best: bestStreak(active),
      doneToday: done,
      totalPositive: habits.length,
    };
  }, [habits, events, today]);

  // Hito alcanzado: celebra una vez por hito (persistido en localStorage).
  const reachedMilestone = MILESTONES.includes(streak) ? streak : null;
  const [celebrate, setCelebrate] = useState<number | null>(null);

  useEffect(() => {
    if (reachedMilestone == null) return;
    const key = 'axiom_habit_streak_celebrated';
    let seen: number[] = [];
    try { seen = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* corrupto → reinicia */ }
    if (!seen.includes(reachedMilestone)) {
      setCelebrate(reachedMilestone);
      try { localStorage.setItem(key, JSON.stringify([...seen, reachedMilestone])); } catch { /* sin storage */ }
    }
  }, [reachedMilestone]);

  const nextMilestone = MILESTONES.find(m => m > streak) ?? null;
  const progressBase = nextMilestone ? (MILESTONES[MILESTONES.indexOf(nextMilestone) - 1] ?? 0) : 0;
  const progressPct = nextMilestone
    ? Math.round(((streak - progressBase) / (nextMilestone - progressBase)) * 100)
    : 100;

  const hasStreak = streak > 0;

  return (
    <div className="space-y-3">
      {/* Celebración de hito */}
      {celebrate != null && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <PartyPopper className="h-8 w-8 text-amber-500 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                ¡{celebrate} días de racha! <Sparkles className="h-4 w-4" />
              </p>
              <p className="text-sm text-muted-foreground">
                {celebrate >= 100 ? 'Esto ya es identidad, no esfuerzo. Imparable.'
                  : celebrate >= 30 ? 'Un mes entero. El hábito ya forma parte de ti.'
                  : 'Una semana seguida. Así se construye el momentum.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCelebrate(null)}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              aria-label="Cerrar celebración"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Héroe de racha */}
      <div className={cn(
        'rounded-2xl border p-5 flex items-center gap-5',
        hasStreak ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent' : 'border-border bg-muted/20',
      )}>
        <div className="shrink-0 flex flex-col items-center">
          <Flame className={cn('h-9 w-9', hasStreak ? 'text-orange-500' : 'text-muted-foreground/40')} />
          <span className={cn('text-3xl font-black tabular-nums leading-none mt-1', hasStreak ? 'text-orange-500' : 'text-muted-foreground')}>
            {streak}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {streak === 1 ? 'día' : 'días'}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-bold">
              {hasStreak ? 'Racha activa' : 'Empieza tu racha hoy'}
            </p>
            {best > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Trophy className="h-3 w-3 text-amber-500" /> Mejor: {best}d
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {totalPositive > 0
              ? <>Hoy: <span className="font-semibold text-foreground">{doneToday}/{totalPositive}</span> hábitos
                  {doneToday >= totalPositive && totalPositive > 0 && <span className="text-green-500 font-semibold"> · ¡Día completo!</span>}</>
              : 'Marca un hábito para encender la llama.'}
          </p>

          {nextMilestone && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Próximo hito</span>
                <span className="font-semibold text-foreground tabular-nums">{streak}/{nextMilestone} días</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

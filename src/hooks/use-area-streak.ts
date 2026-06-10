'use client';

import { useMemo } from 'react';

export function useAreaStreak(
  events: Array<{ fecha: string; var_id: string }> | undefined,
  varIds: string[],
): number {
  return useMemo(() => {
    if (!events || events.length === 0 || varIds.length === 0) return 0;

    const relevant = events.filter(e => varIds.includes(e.var_id));
    if (relevant.length === 0) return 0;

    const daySet = new Set<string>();
    relevant.forEach(e => daySet.add(e.fecha.split('T')[0]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    const startOffset = daySet.has(todayKey) ? 0 : 1;

    let streak = 0;
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (daySet.has(key)) streak++;
      else break;
    }

    return streak;
  }, [events, varIds]);
}

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Flame, Shield, TrendingDown, Zap } from 'lucide-react';
import type { UserData } from '@/lib/types';
import { differenceInCalendarDays, parseISO, subDays, format } from 'date-fns';

interface HabitMomentumCardProps {
  userData: UserData;
}

function parseModifier(modifiers: string[], key: string): number | null {
  const entry = modifiers.find(m => m.startsWith(`${key}:`));
  if (!entry) return null;
  const raw = entry.split(':')[1];
  if (!raw) return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function parseDays(modifiers: string[], key: string): number | null {
  const entry = modifiers.find(m => m.startsWith(`${key}:`));
  if (!entry) return null;
  const raw = entry.split(':')[1]?.replace('d', '');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export default function HabitMomentumCard({ userData }: HabitMomentumCardProps) {
  const modifiers: string[] = useMemo(
    () => userData.explanation?.modifiers ?? [],
    [userData.explanation],
  );

  const resBufDays = parseDays(modifiers, 'RESILIENCE_BUFFER') ?? 0;
  const alloWeeks  = parseModifier(modifiers, 'ALLOSTATIC_WEEKS') ?? 0;

  // Streak: consecutive days in the last 30 with at least 1 positive physical/mental/protocol event
  const streak = useMemo(() => {
    const now = new Date();
    const positiveVarIds = new Set(
      userData.variables
        .filter(v => (v.tipo === 'Física' || (v.tipo as string) === 'FÃ­sica' || v.tipo === 'Mental') && (v.polaridad ?? 1) > 0)
        .map(v => v.var_id),
    );
    let count = 0;
    for (let d = 1; d <= 30; d++) {
      const target = format(subDays(now, d), 'yyyy-MM-dd');
      const hasHabit = userData.events.some(
        e => e.fecha.startsWith(target) && (e.tipo === 'Protocolo' || positiveVarIds.has(e.var_id)),
      );
      if (hasHabit) count++;
      else break;
    }
    return count;
  }, [userData.events, userData.variables]);

  const bufferPct   = Math.round((resBufDays / 14) * 100);
  const bufferLevel = resBufDays >= 10 ? 'ok' : resBufDays >= 5 ? 'warn' : 'low';
  const streakLevel = streak >= 7 ? 'ok' : streak >= 3 ? 'warn' : 'low';

  const COLORS = {
    ok:   { text: 'text-green-500',  bar: 'bg-green-500',  bg: 'bg-green-500/10  border-green-500/20' },
    warn: { text: 'text-orange-500', bar: 'bg-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
    low:  { text: 'text-red-500',    bar: 'bg-red-500',    bg: 'bg-red-500/10    border-red-500/20' },
  };

  const bc = COLORS[bufferLevel];
  const sc = COLORS[streakLevel];

  // 14-day dot grid
  const dots = useMemo(() => {
    const now = new Date();
    const positiveVarIds = new Set(
      userData.variables
        .filter(v => (v.tipo === 'Física' || (v.tipo as string) === 'FÃ­sica' || v.tipo === 'Mental') && (v.polaridad ?? 1) > 0)
        .map(v => v.var_id),
    );
    return Array.from({ length: 14 }, (_, i) => {
      const d = 14 - i; // oldest first → newest last
      const target = format(subDays(now, d), 'yyyy-MM-dd');
      const hasHabit = userData.events.some(
        e => e.fecha.startsWith(target) && (e.tipo === 'Protocolo' || positiveVarIds.has(e.var_id)),
      );
      return { d, hasHabit };
    });
  }, [userData.events, userData.variables]);

  return (
    <div className="rounded-xl border bg-card/80 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">

      {/* Streak */}
      <div className="flex items-center gap-4">
        <div className={cn('rounded-xl p-3 border', sc.bg)}>
          <Flame className={cn('h-5 w-5', sc.text)} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Racha actual</p>
          <p className={cn('text-3xl font-black tabular-nums leading-none', sc.text)}>
            {streak}
            <span className="text-sm font-normal text-muted-foreground ml-1">días</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {streak === 0 ? 'Sin hábito registrado ayer' : streak >= 7 ? 'Momentum activo' : 'Construyendo hábito'}
          </p>
        </div>
      </div>

      {/* Buffer de resiliencia + dot grid */}
      <div className="space-y-2 sm:col-span-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className={cn('h-3.5 w-3.5', bc.text)} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Buffer 14 días</span>
          </div>
          <span className={cn('text-xs font-black tabular-nums', bc.text)}>{resBufDays}/14</span>
        </div>
        {/* dot grid */}
        <div className="flex gap-1">
          {dots.map(({ d, hasHabit }) => (
            <div
              key={d}
              title={`Hace ${d} días`}
              className={cn(
                'flex-1 h-2.5 rounded-sm transition-colors',
                hasHabit ? bc.bar : 'bg-muted',
              )}
            />
          ))}
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', bc.bar)} style={{ width: `${bufferPct}%` }} />
        </div>
        <p className="text-[9px] text-muted-foreground">
          {bufferLevel === 'ok' ? 'Resiliencia estructural alta' : bufferLevel === 'warn' ? 'Buffer parcial — sigue construyendo' : 'Sin buffer — vulnerable a shocks'}
        </p>
      </div>

      {/* Carga alostática */}
      <div className="flex items-center gap-4">
        <div className={cn(
          'rounded-xl p-3 border',
          alloWeeks >= 3 ? 'bg-red-500/10 border-red-500/20' : alloWeeks >= 1 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20',
        )}>
          <TrendingDown className={cn(
            'h-5 w-5',
            alloWeeks >= 3 ? 'text-red-500' : alloWeeks >= 1 ? 'text-orange-500' : 'text-green-500',
          )} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Carga crónica</p>
          <p className={cn(
            'text-3xl font-black tabular-nums leading-none',
            alloWeeks >= 3 ? 'text-red-500' : alloWeeks >= 1 ? 'text-orange-500' : 'text-green-500',
          )}>
            {alloWeeks}
            <span className="text-sm font-normal text-muted-foreground ml-1">sem.</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {alloWeeks === 0 ? 'Sin deuda alostática' : alloWeeks >= 3 ? 'Saturación — recuperación limitada' : 'Acumulando — revisa patrones'}
          </p>
        </div>
      </div>

    </div>
  );
}

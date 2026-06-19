'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addHours, parseISO, differenceInHours } from 'date-fns';
import { computeAreaEventContributionAtTime, getVariableDecayK, AREA_BASE_SCORE, AREA_SCORE_MULTIPLIER } from '@/lib/area-scoring';
import type { UserData } from '@/lib/types';

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
// Mismas constantes que el motor de áreas (importadas, no duplicadas) para que la
// proyección no derive del cálculo real si cambian.
const BASE = AREA_BASE_SCORE;
const MULT = AREA_SCORE_MULTIPLIER;

const HORIZONS = [
  { label: 'Ahora',  hours: 0 },
  { label: '+6h',   hours: 6 },
  { label: '+12h',  hours: 12 },
  { label: '+24h',  hours: 24 },
  { label: '+48h',  hours: 48 },
] as const;

function stateFromScore(score: number): 'OK' | 'RIESGO' | 'CRITICO' {
  if (score >= 60) return 'OK';
  if (score >= 40) return 'RIESGO';
  return 'CRITICO';
}

const STATE_STYLE = {
  OK:      { text: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  RIESGO:  { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  CRITICO: { text: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
};

interface HormonalForecastCardProps {
  userData: UserData;
}

export default function HormonalForecastCard({ userData }: HormonalForecastCardProps) {
  const now = useMemo(() => new Date(), []);

  // Index variables by var_id
  const variableMap = useMemo(() => {
    const m = new Map<string, typeof userData.variables[0]>();
    (userData.variables ?? []).forEach(v => m.set(v.var_id, v));
    return m;
  }, [userData.variables]);

  // Events from the last 72h (long enough to still have active effects)
  const activeEvents = useMemo(() => {
    const cutoff = addHours(now, -72).getTime();
    return (userData.events ?? []).filter(e => new Date(e.fecha).getTime() > cutoff);
  }, [userData.events, now]);

  // Project score at each horizon
  const projections = useMemo(() =>
    HORIZONS.map(({ label, hours }) => {
      const at = addHours(now, hours);
      const total = activeEvents.reduce((acc, event) => {
        const variable = variableMap.get(event.var_id);
        if (!variable) return acc;
        return acc + computeAreaEventContributionAtTime(event, variable, at, userData.playerProfile);
      }, 0);
      const score = Math.round(clamp(BASE + total * MULT));
      return { label, hours, score, state: stateFromScore(score) };
    }),
  [activeEvents, variableMap, userData.playerProfile, now]);

  // Upcoming notable transitions: events that will expire within the next 48h
  const upcomingExpirations = useMemo(() => {
    const seen = new Set<string>();
    return activeEvents
      .filter(e => {
        const variable = variableMap.get(e.var_id);
        if (!variable) return false;
        const key = variable.var_id;
        if (seen.has(key)) return false;
        seen.add(key);

        const elapsed = differenceInHours(now, parseISO(e.fecha));
        const peakEnd = Math.max(1, (variable.duracion_dias || 0) * 24);

        // Only show if currently in peak window AND will expire within 48h
        const expiresAt = peakEnd; // hours from event start until peak ends
        const remainingPeak = expiresAt - elapsed;
        return remainingPeak > 0 && remainingPeak <= 48;
      })
      .map(e => {
        const variable = variableMap.get(e.var_id)!;
        const elapsed = differenceInHours(now, parseISO(e.fecha));
        const peakEnd = Math.max(1, (variable.duracion_dias || 0) * 24);
        const remaining = Math.max(0, peakEnd - elapsed);
        return {
          nombre: variable.var_nombre,
          remaining: Math.round(remaining),
          polaridad: variable.polaridad,
          var_id: variable.var_id,
        };
      })
      .sort((a, b) => a.remaining - b.remaining)
      .slice(0, 4);
  }, [activeEvents, variableMap, now]);

  // Trajectory: is the system going up, flat, or down?
  const trajectory = useMemo(() => {
    const first = projections[0].score;
    const last = projections[projections.length - 1].score;
    const delta = last - first;
    if (delta >= 5) return 'up';
    if (delta <= -5) return 'down';
    return 'flat';
  }, [projections]);

  const trajectoryConfig = {
    up:   { icon: TrendingUp,   label: 'Recuperación prevista', cls: 'text-green-500' },
    down: { icon: TrendingDown, label: 'Declive previsto',      cls: 'text-orange-500' },
    flat: { icon: Minus,        label: 'Sistema estable',       cls: 'text-muted-foreground' },
  }[trajectory];
  const TrajectoryIcon = trajectoryConfig.icon;

  // Min score for bar scaling
  const scores = projections.map(p => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = Math.max(maxScore - minScore, 10);

  if (activeEvents.length === 0) return null;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Proyección del sistema
          </CardTitle>
          <span className={cn('flex items-center gap-1 text-[10px] font-semibold', trajectoryConfig.cls)}>
            <TrajectoryIcon className="h-3 w-3" />
            {trajectoryConfig.label}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timeline de scores */}
        <div className="grid grid-cols-5 gap-1">
          {projections.map((p, i) => {
            const style = STATE_STYLE[p.state];
            const barH = Math.round(((p.score - minScore) / range) * 40) + 16;
            const isNow = i === 0;
            return (
              <div key={p.label} className="flex flex-col items-center gap-1">
                {/* Barra proporcional */}
                <div className="flex items-end h-12 w-full justify-center">
                  <div
                    className={cn(
                      'w-full max-w-[32px] rounded-t-sm transition-all',
                      style.bg,
                      isNow ? 'opacity-100' : 'opacity-70',
                    )}
                    style={{ height: `${barH}px` }}
                  />
                </div>
                {/* Score */}
                <span className={cn('text-xs font-black tabular-nums', style.text)}>
                  {p.score}
                </span>
                {/* Estado */}
                <Badge
                  variant="outline"
                  className={cn('text-[8px] px-1 py-0 h-4', style.text, style.border)}
                >
                  {p.state}
                </Badge>
                {/* Label tiempo */}
                <span className={cn(
                  'text-[9px] font-semibold',
                  isNow ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Efectos próximos a expirar */}
        {upcomingExpirations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Efectos activos próximos a decaer
            </p>
            <div className="space-y-1">
              {upcomingExpirations.map(exp => (
                <div key={exp.var_id} className="flex items-center justify-between text-[10px]">
                  <span className={cn(
                    'flex items-center gap-1',
                    exp.polaridad === 1 ? 'text-green-500' : 'text-red-500'
                  )}>
                    <span>{exp.polaridad === 1 ? '↑' : '↓'}</span>
                    <span className="truncate max-w-[160px] text-foreground">{exp.nombre}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    pico termina en ~{exp.remaining}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insight de transición de estado */}
        {(() => {
          const currentState = projections[0].state;
          const future = projections.find(p => p.state !== currentState);
          if (!future) return null;
          const style = STATE_STYLE[future.state];
          return (
            <p className={cn('text-[10px] font-semibold leading-relaxed border-l-2 pl-3', style.text, 'border-current/40')}>
              Transición prevista a <strong>{future.state}</strong> en ~{future.hours}h
              {future.state === 'OK' ? ' — la recuperación está en marcha.' : ' — considera activar protocolos preventivos.'}
            </p>
          );
        })()}
      </CardContent>
    </Card>
  );
}

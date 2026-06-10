'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, CalendarDays, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { UserData, DailyScore } from '@/lib/types';

type DailyScoreEntry = DailyScore;

interface WeeklySummaryCardProps {
  userData: UserData;
}

function scoreDelta(thisWeek: number[], lastWeek: number[]): number | null {
  if (!thisWeek.length || !lastWeek.length) return null;
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.round(avg(thisWeek) - avg(lastWeek));
}

export default function WeeklySummaryCard({ userData }: WeeklySummaryCardProps) {
  const now = Date.now();
  const W = 7 * 864e5;

  // ── Scores por período ───────────────────────────────────────────────────────
  const { thisWeekScores, lastWeekScores, bestDay, worstDay } = useMemo(() => {
    const trend = userData.kpis.dailyScoreTrend ?? [];
    const thisW: number[] = [];
    const lastW: number[] = [];
    let best: DailyScoreEntry | null = null;
    let worst: DailyScoreEntry | null = null;

    trend.forEach(d => {
      const t = new Date(d.date).getTime();
      const age = now - t;
      if (age <= W) {
        thisW.push(d.score);
        if (!best || d.score > best.score) best = d;
        if (!worst || d.score < worst.score) worst = d;
      } else if (age <= 2 * W) {
        lastW.push(d.score);
      }
    });

    return {
      thisWeekScores: thisW,
      lastWeekScores: lastW,
      bestDay: best as DailyScore | null,
      worstDay: worst as DailyScore | null,
    };
  }, [userData.kpis.dailyScoreTrend]);

  const delta = scoreDelta(thisWeekScores, lastWeekScores);

  // ── Actividad semanal ────────────────────────────────────────────────────────
  const { activeDays, topGain, topDrain, totalPositive, totalNegative } = useMemo(() => {
    const cutoff = now - W;
    const weekEvents = (userData.events ?? []).filter(e => new Date(e.fecha).getTime() > cutoff);

    const days = new Set(weekEvents.map(e => new Date(e.fecha).toDateString())).size;

    // Agrupar por var_id y sumar impacto
    const varMap: Record<string, { nombre: string; total: number; polaridad: number; count: number }> = {};
    weekEvents.forEach(e => {
      const v = userData.variables?.find(v => v.var_id === e.var_id);
      if (!v) return;
      if (!varMap[e.var_id]) varMap[e.var_id] = { nombre: v.var_nombre, total: 0, polaridad: v.polaridad, count: 0 };
      varMap[e.var_id].total += e.intensidad * v.polaridad;
      varMap[e.var_id].count += 1;
    });

    const sorted = Object.values(varMap).sort((a, b) => b.total - a.total);
    const positives = sorted.filter(v => v.polaridad === 1);
    const negatives = sorted.filter(v => v.polaridad === -1);

    return {
      activeDays: days,
      topGain: positives[0] ?? null,
      topDrain: negatives[negatives.length - 1] ?? null,
      totalPositive: positives.reduce((s, v) => s + v.count, 0),
      totalNegative: negatives.reduce((s, v) => s + v.count, 0),
    };
  }, [userData.events, userData.variables]);

  // ── Áreas mejor y peor ───────────────────────────────────────────────────────
  const { bestArea, worstArea } = useMemo(() => {
    const areas = [...(userData.kpis.scoresByArea ?? [])].sort((a, b) => b.score - a.score);
    return { bestArea: areas[0] ?? null, worstArea: areas[areas.length - 1] ?? null };
  }, [userData.kpis.scoresByArea]);

  // ── Insight textual ──────────────────────────────────────────────────────────
  const insight = useMemo(() => {
    if (!thisWeekScores.length) return 'Registra más eventos para obtener tu resumen semanal.';
    if (activeDays === 0) return 'Sin actividad registrada esta semana. Empieza con un registro de sueño.';
    if (delta !== null && delta >= 8) return `+${delta} pts vs. la semana pasada${topGain ? ` — ${topGain.nombre} fue tu principal palanca.` : '.'}`;
    if (delta !== null && delta <= -8) return `Caída de ${Math.abs(delta)} pts${topDrain ? ` — ${topDrain.nombre} fue el mayor drenaje.` : '.'} Revisa los protocolos.`;
    if (activeDays >= 6) return `Registro consistente: ${activeDays} días activos — la frecuencia compone el sistema.`;
    if (topGain && totalPositive > totalNegative * 2) return `Semana neta positiva — ${topGain.nombre} (×${topGain.count}) lideró la recuperación.`;
    if (topDrain) return `${topDrain.nombre} fue el drenaje principal esta semana. Revisa frecuencia.`;
    return `Semana equilibrada — ${activeDays} días activos, ${totalPositive} eventos positivos.`;
  }, [thisWeekScores, activeDays, delta, topGain, topDrain, totalPositive, totalNegative]);

  const DeltaIcon = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta === null ? 'text-muted-foreground'
    : delta >= 5 ? 'text-green-500'
    : delta <= -5 ? 'text-red-500'
    : 'text-muted-foreground';

  // No mostrar si no hay datos
  if (!thisWeekScores.length && activeDays === 0) return null;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Resumen de la semana
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(now - W), 'd MMM', { locale: es })} – {format(new Date(), 'd MMM', { locale: es })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Fila de métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Delta de score */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">vs. semana ant.</p>
            <div className={cn('flex items-center gap-1 font-black text-xl tabular-nums', deltaColor)}>
              <DeltaIcon className="h-4 w-4" />
              {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
            </div>
            <p className="text-[9px] text-muted-foreground">puntos promedio</p>
          </div>

          {/* Días activos */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Días activos</p>
            <div className={cn(
              'font-black text-xl tabular-nums',
              activeDays >= 5 ? 'text-green-500' : activeDays >= 3 ? 'text-orange-500' : 'text-red-500'
            )}>
              {activeDays}<span className="text-xs font-normal text-muted-foreground">/7</span>
            </div>
            <p className="text-[9px] text-muted-foreground">{totalPositive}+ · {totalNegative}−</p>
          </div>

          {/* Mejor día */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Mejor día</p>
            <div className="font-black text-xl tabular-nums text-green-500">
              {bestDay ? Math.round(bestDay.score) : '—'}
            </div>
            <p className="text-[9px] text-muted-foreground">
              {bestDay ? format(new Date(bestDay.date), 'EEE d', { locale: es }) : 'sin datos'}
            </p>
          </div>

          {/* Peor día */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Peor día</p>
            <div className="font-black text-xl tabular-nums text-orange-500">
              {worstDay ? Math.round(worstDay.score) : '—'}
            </div>
            <p className="text-[9px] text-muted-foreground">
              {worstDay ? format(new Date(worstDay.date), 'EEE d', { locale: es }) : 'sin datos'}
            </p>
          </div>
        </div>

        {/* Variables clave */}
        <div className="flex flex-wrap gap-2">
          {topGain && (
            <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-600 dark:text-green-400 gap-1">
              <Zap className="h-2.5 w-2.5" />
              {topGain.nombre} ×{topGain.count}
            </Badge>
          )}
          {topDrain && (
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500 gap-1">
              <ShieldAlert className="h-2.5 w-2.5" />
              {topDrain.nombre} ×{topDrain.count}
            </Badge>
          )}
          {bestArea && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              ↑ {bestArea.shortArea || bestArea.area.split('/')[0]} {bestArea.score}
            </Badge>
          )}
          {worstArea && worstArea.area !== bestArea?.area && (
            <Badge variant="secondary" className="text-[10px] text-muted-foreground gap-1">
              ↓ {worstArea.shortArea || worstArea.area.split('/')[0]} {worstArea.score}
            </Badge>
          )}
        </div>

        {/* Insight */}
        <p className="text-[11px] text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 italic">
          {insight}
        </p>
      </CardContent>
    </Card>
  );
}

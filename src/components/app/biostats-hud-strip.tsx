'use client';

import type { RPGStats, OverallState } from '@/lib/types';
import type { ScoreVelocity } from '@/lib/velocity';
import { cn } from '@/lib/utils';
import { Brain, Heart, AlertTriangle, Target, Battery, Moon, Trophy, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface BiostatsHudStripProps {
  rpgStats: RPGStats;
  overallState: OverallState;
  scoreVelocity?: ScoreVelocity | null;
}

const STATS = [
  { key: 'dopamina',   label: 'Dopamina',   icon: Brain,         invert: false },
  { key: 'serotonina', label: 'Serotonina',  icon: Heart,         invert: false },
  { key: 'cortisol',   label: 'Cortisol',    icon: AlertTriangle, invert: true  },
  { key: 'foco',       label: 'Foco',        icon: Target,        invert: false },
  { key: 'energia',    label: 'Energía',     icon: Battery,       invert: false },
  { key: 'sueno',      label: 'Sueño',       icon: Moon,          invert: false },
] as const;

function getLevel(value: number, invert: boolean) {
  const effective = invert ? 100 - value : value;
  if (effective >= 60) return 'ok';
  if (effective >= 40) return 'risk';
  return 'critical';
}

const LEVEL_STYLES = {
  ok:       { text: 'text-green-500 dark:text-green-400',  bar: 'bg-green-500',  bg: 'bg-green-500/10' },
  risk:     { text: 'text-orange-500 dark:text-orange-400', bar: 'bg-orange-500', bg: 'bg-orange-500/10' },
  critical: { text: 'text-red-500 dark:text-red-400',      bar: 'bg-red-500',    bg: 'bg-red-500/10'   },
};

const VELOCITY_CONFIG: Record<string, { label: string; icon: typeof TrendingUp; cls: string }> = {
  rising:   { label: 'Subiendo',   icon: TrendingUp,   cls: 'text-green-500 dark:text-green-400' },
  stable:   { label: 'Estable',    icon: Minus,        cls: 'text-muted-foreground' },
  drifting: { label: 'Derivando',  icon: TrendingDown, cls: 'text-yellow-500 dark:text-yellow-400' },
  falling:  { label: 'Cayendo',    icon: TrendingDown, cls: 'text-orange-500 dark:text-orange-400' },
  plunging: { label: 'Desplome',   icon: AlertCircle,  cls: 'text-red-500 dark:text-red-400 animate-pulse' },
};

export default function BiostatsHudStrip({ rpgStats, scoreVelocity }: BiostatsHudStripProps) {
  const score = Math.round(rpgStats.player_score ?? 0);
  const scoreLevel = getLevel(score, false);
  const velCfg = scoreVelocity ? VELOCITY_CONFIG[scoreVelocity.direction] : null;

  return (
    <div className="rounded-xl border bg-card/80 backdrop-blur-sm px-3 sm:px-5 py-4 space-y-4">
      {/* 6 bio-stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-3">
        {STATS.map(({ key, label, icon: Icon, invert }) => {
          const value = Math.round((rpgStats as any)[key] ?? 0);
          const level = getLevel(value, invert);
          const styles = LEVEL_STYLES[level];
          const isSleep = key === 'sueno';
          const debtScore = isSleep ? (rpgStats.sleep_debt_score ?? 0) : 0;
          const debtLevel = debtScore >= 40 ? 'critical' : debtScore >= 20 ? 'risk' : null;
          return (
            <div key={key} className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <Icon className={cn('h-3 w-3 shrink-0', styles.text)} />
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide text-muted-foreground truncate">
                  {label}
                </span>
              </div>
              <div className={cn('text-xl font-black tabular-nums leading-none', styles.text)}>
                {value}
                <span className="text-[9px] font-normal text-muted-foreground ml-0.5">/100</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', styles.bar)}
                  style={{ width: `${value}%` }}
                />
              </div>
              {isSleep && debtLevel && (
                <span className={cn(
                  'text-[8px] font-bold uppercase tracking-wider',
                  debtLevel === 'critical' ? 'text-red-500' : 'text-orange-500',
                )}>
                  Deuda {debtScore}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Resonancia sistémica */}
      {(() => {
        const res = rpgStats.systemic_resonance ?? 0;
        if (res < 15) return null;
        const resLevel = res >= 72 ? 'critical' : res >= 45 ? 'risk' : 'ok';
        const resLabel = res >= 72 ? 'Colapso sistémico' : res >= 45 ? 'Resonancia alta' : 'Resonancia moderada';
        const resBarColor = res >= 72 ? 'bg-red-500' : res >= 45 ? 'bg-orange-500' : 'bg-yellow-500';
        const resTextColor = res >= 72
          ? 'text-red-500 dark:text-red-400'
          : res >= 45
          ? 'text-orange-500 dark:text-orange-400'
          : 'text-yellow-600 dark:text-yellow-400';
        return (
          <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={cn('text-[9px] font-bold uppercase tracking-widest', resTextColor)}>
                ⚡ Resonancia sistémica
              </span>
              <span className={cn('text-[9px] font-black tabular-nums', resTextColor)}>
                {Math.round(res)}/100 · {resLabel}
              </span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', resBarColor, res >= 72 && 'animate-pulse')}
                style={{ width: `${res}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Score global */}
      <div className="pt-3 border-t border-border/50 flex items-center gap-3">
        <Trophy className={cn('h-4 w-4 shrink-0', LEVEL_STYLES[scoreLevel].text)} />
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
              Score Global
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {velCfg && scoreVelocity && (
                <span className={cn('flex items-center gap-0.5 text-[9px] font-semibold tabular-nums', velCfg.cls)}>
                  <velCfg.icon className="h-3 w-3" />
                  {scoreVelocity.weekly > 0 ? '+' : ''}{scoreVelocity.weekly.toFixed(1)} pts/d
                </span>
              )}
              <span className={cn('text-sm font-black tabular-nums', LEVEL_STYLES[scoreLevel].text)}>
                {score}/100
              </span>
            </div>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-1000', LEVEL_STYLES[scoreLevel].bar)}
              style={{ width: `${score}%` }}
            />
          </div>
          {scoreVelocity?.earlyWarning && (
            <p className="text-[9px] font-bold text-orange-500 dark:text-orange-400 flex items-center gap-1 pt-0.5">
              <AlertCircle className="h-2.5 w-2.5" />
              Caída acelerada detectada — revisa drenajes activos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

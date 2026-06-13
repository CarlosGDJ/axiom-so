'use client';

import type { UserData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldX, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

// "Una cosa grande": el Score Global como protagonista (estilo WHOOP Recovery /
// Oura Readiness) — número grande a color + qué hacer ahora. Los biomarcadores
// quedan debajo como detalle secundario.

interface ScoreHeroProps {
  userData: UserData;
}

const STATE_CONFIG = {
  OK:      { label: 'Estable', tone: 'text-green-500',  ring: 'border-green-500/30 bg-green-500/5',  bar: 'bg-green-500',  icon: ShieldCheck, hint: 'Mantén el ritmo — la consistencia acumula.' },
  RIESGO:  { label: 'Riesgo',  tone: 'text-orange-500', ring: 'border-orange-500/30 bg-orange-500/5', bar: 'bg-orange-500', icon: ShieldAlert, hint: 'Intervención leve ahora evita el modo crítico.' },
  CRITICO: { label: 'Crítico', tone: 'text-red-500',    ring: 'border-red-500/30 bg-red-500/5',       bar: 'bg-red-500',    icon: ShieldX,     hint: 'Ejecuta el protocolo de rescate cuanto antes.' },
} as const;

export default function ScoreHero({ userData }: ScoreHeroProps) {
  const score = Math.round(userData.rpg_stats?.player_score ?? 0);
  const state = (userData.overallState ?? 'OK') as keyof typeof STATE_CONFIG;
  const learning = userData.isLearningMode;
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.OK;
  const Icon = learning ? Sparkles : cfg.icon;
  const velocity = userData.kpis?.scoreVelocity;

  const tone = learning ? 'text-muted-foreground' : cfg.tone;
  const ring = learning ? 'border-border bg-muted/20' : cfg.ring;
  const bar = learning ? 'bg-muted-foreground/40' : cfg.bar;
  const directive = learning
    ? 'Calibrando — registra eventos unos días para datos precisos.'
    : cfg.hint;

  const VelIcon = !velocity ? null
    : velocity.direction === 'rising' ? TrendingUp
    : velocity.direction === 'stable' ? Minus
    : TrendingDown;

  return (
    <div className={cn('rounded-2xl border p-5 sm:p-6', ring)}>
      <div className="flex items-center gap-5">
        {/* Número protagonista */}
        <div className="shrink-0">
          <div className={cn('flex items-end gap-1 leading-none', tone)}>
            <span className="text-5xl sm:text-6xl font-black tabular-nums">{score}</span>
            <span className="text-base font-semibold text-muted-foreground mb-1">/100</span>
          </div>
        </div>

        {/* Estado + directiva */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide', tone)}>
              <Icon className="h-4 w-4" />
              {learning ? 'Calibrando' : cfg.label}
            </span>
            {!learning && velocity && VelIcon && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full',
                velocity.direction === 'rising' ? 'text-green-500 bg-green-500/10'
                  : velocity.direction === 'stable' ? 'text-muted-foreground bg-muted/50'
                  : 'text-orange-500 bg-orange-500/10',
              )}>
                <VelIcon className="h-3 w-3" />
                {velocity.weekly > 0 ? '+' : ''}{velocity.weekly.toFixed(1)}/d
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-snug">{directive}</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', bar)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

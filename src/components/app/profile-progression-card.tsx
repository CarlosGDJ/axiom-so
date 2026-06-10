'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Zap, Flame, Star, Trophy } from 'lucide-react';
import type { ProgressionData } from '@/lib/progression';

interface ProfileProgressionCardProps {
  data: ProgressionData;
}

const XP_SOURCE_ICONS = [
  { key: 'skills',  label: 'Habilidades', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { key: 'habits',  label: 'Hábitos',     color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  { key: 'score',   label: 'Rendimiento', color: 'text-green-500',  bg: 'bg-green-500/10'  },
] as const;

export default function ProfileProgressionCard({ data }: ProfileProgressionCardProps) {
  const { rank, nextRank, totalXP, progressToNext, xpToNext, streakMultiplier, activeStreakDays, xpBreakdown } = data;

  return (
    <Card className={cn('shadow-sm border-l-4', rank.borderClass)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3">
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border', rank.bgClass, rank.borderClass)}>
            <Trophy size={13} className={rank.colorClass} />
            <span className={cn('text-sm font-black uppercase tracking-tight', rank.colorClass)}>
              {rank.name}
            </span>
          </div>
          <span className="text-xl font-black tabular-nums text-foreground">
            {totalXP.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground ml-1">XP</span>
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress to next rank */}
        {nextRank ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Progreso a {nextRank.name}</span>
              <span className="font-semibold tabular-nums">
                {xpToNext.toLocaleString()} XP restantes
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
            <p className="text-[10px] text-muted-foreground text-right">{progressToNext}% completado</p>
          </div>
        ) : (
          <div className={cn('rounded-lg px-3 py-2 text-xs font-bold text-center uppercase tracking-widest', rank.bgClass, rank.colorClass)}>
            Rango máximo alcanzado
          </div>
        )}

        {/* XP Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {XP_SOURCE_ICONS.map(src => (
            <TooltipProvider key={src.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn('rounded-lg p-2.5 text-center space-y-0.5 cursor-default', src.bg)}>
                    <p className={cn('text-sm font-black tabular-nums', src.color)}>
                      {xpBreakdown[src.key].toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{src.label}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{xpBreakdown[src.key].toLocaleString()} XP de {src.label.toLowerCase()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Streak info */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Flame size={13} className={activeStreakDays >= 7 ? 'text-yellow-500' : 'text-orange-500'} />
            <span className="text-xs font-semibold">
              {activeStreakDays > 0 ? `${activeStreakDays} días de racha` : 'Sin racha activa'}
            </span>
          </div>
          {streakMultiplier > 1 ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Star size={10} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-500">×{streakMultiplier} XP activo</span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">Sin bonus</span>
          )}
        </div>

        {rank.description && (
          <p className="text-[11px] text-muted-foreground italic">"{rank.description}"</p>
        )}
      </CardContent>
    </Card>
  );
}

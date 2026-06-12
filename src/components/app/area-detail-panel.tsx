'use client';

import { useMemo } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Zap, Star, Activity } from 'lucide-react';
import type { Skill, Habit } from '@/lib/types';

interface AreaDetailPanelProps {
  /** Substring to match against area_nombre (case-insensitive) */
  areaNameMatch: string;
}

function skillColor(level: number) {
  if (level >= 8) return 'text-primary';
  if (level >= 5) return 'text-violet-500';
  if (level >= 3) return 'text-blue-500';
  return 'text-muted-foreground';
}

function SkillRow({ skill }: { skill: Skill }) {
  const xpNeeded = skill.nivel_actual * 200;
  const pct = Math.min(100, Math.round(((skill.xp || 0) / xpNeeded) * 100));
  const col = skillColor(skill.nivel_actual);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Star size={10} className={cn(col, 'shrink-0')} />
          <span className="text-xs font-medium truncate">{skill.nombre}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-muted-foreground tabular-nums">{skill.xp || 0}/{xpNeeded} XP</span>
          <Badge
            variant="outline"
            className={cn('text-[9px] font-black px-1.5 py-0 leading-none', col)}
          >
            Nv.{skill.nivel_actual}
          </Badge>
        </div>
      </div>
      <Progress value={pct} className="h-1" />
    </div>
  );
}

export default function AreaDetailPanel({ areaNameMatch }: AreaDetailPanelProps) {
  const { data: userData } = useUserData();

  const { area, skills, activeHabitsToday } = useMemo(() => {
    if (!userData) return { area: null, skills: [], activeHabitsToday: 0 };

    const matchLower = areaNameMatch.toLowerCase();

    // Find area
    const area = userData.areas?.find(a =>
      a.area_nombre?.toLowerCase().includes(matchLower) ||
      a.area_id?.toLowerCase().includes(matchLower),
    ) ?? null;

    if (!area) return { area: null, skills: [], activeHabitsToday: 0 };

    // Skills for this area
    const skills = (userData.skills || []).filter(
      s => s.area_id === area.area_id && s.estado !== 'Pausa',
    );

    // Systems linked to those skills
    const skillIds = new Set(skills.map(s => s.habilidad_id));
    const systems = (userData.systems || []).filter(s => skillIds.has(s.habilidad_id));
    const sysIds = new Set(systems.map(s => s.sistema_id));

    // Habits for those systems
    const habits: Habit[] = (userData.habits || []).filter(h => h.sistema_id && sysIds.has(h.sistema_id));

    // Today's logged events with var_ids from those habits
    const habitVarIds = new Set(habits.map(h => h.var_id));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeHabitsToday = (userData.events || []).filter(e =>
      habitVarIds.has(e.var_id) && new Date(e.fecha) >= today,
    ).length;

    return { area, skills, activeHabitsToday };
  }, [userData, areaNameMatch]);

  const areaScore = useMemo(() => {
    if (!area) return null;
    return userData?.kpis?.scoresByArea?.find(s =>
      s.area.toLowerCase().includes(areaNameMatch.toLowerCase()),
    )?.score ?? null;
  }, [userData, area, areaNameMatch]);

  if (!area && !skills.length) return null;

  const scoreColor =
    areaScore === null ? 'text-muted-foreground' :
    areaScore >= 75 ? 'text-green-500' :
    areaScore >= 50 ? 'text-orange-500' :
    'text-red-500';

  const stateLabel =
    area?.estado === 'CRITICO' ? 'CRÍTICO' :
    area?.estado === 'RIESGO' ? 'RIESGO' :
    'ESTABLE';

  const stateBadgeClass =
    area?.estado === 'CRITICO' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
    area?.estado === 'RIESGO' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' :
    'bg-green-500/10 text-green-600 border-green-500/30';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-tour="area-variables">

      {/* ── Area KPI card ── */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Activity size={11} />
            Estado del área
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className={cn('text-4xl font-black tabular-nums leading-none', scoreColor)}>
                {areaScore !== null ? areaScore : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">puntuación actual</p>
            </div>
            <div className="text-right space-y-1">
              {area?.estado && (
                <Badge variant="outline" className={cn('text-[9px] font-bold uppercase', stateBadgeClass)}>
                  {stateLabel}
                </Badge>
              )}
              {area?.prioridad && (
                <p className="text-[10px] text-muted-foreground">
                  Prioridad <span className="font-semibold">{area.prioridad}</span>
                </p>
              )}
            </div>
          </div>

          {area?.objetivo_12s && (
            <div className="rounded-lg bg-muted/40 px-2.5 py-2 space-y-0.5">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Objetivo 12 semanas</p>
              <p className="text-xs leading-snug">{area.objetivo_12s}</p>
            </div>
          )}

          {activeHabitsToday > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-green-500">
              <Zap size={10} />
              <span className="font-semibold">{activeHabitsToday} hábito{activeHabitsToday > 1 ? 's' : ''} registrado{activeHabitsToday > 1 ? 's' : ''} hoy</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Skills progress card ── */}
      {skills.length > 0 && (
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Star size={11} />
              Habilidades del área
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {skills.slice(0, 4).map(skill => (
              <SkillRow key={skill.id} skill={skill} />
            ))}
            {skills.length > 4 && (
              <p className="text-[10px] text-muted-foreground text-right">
                +{skills.length - 4} más
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

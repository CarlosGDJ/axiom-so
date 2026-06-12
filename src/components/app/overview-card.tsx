'use client';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';
import { cn } from '@/lib/utils';
import {
  ShieldCheck, ShieldAlert, ShieldX,
  Zap, Sparkles, TrendingUp, TrendingDown, Minus,
  Wind, Footprints, PenLine, Dumbbell, Moon,
  Info,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { OverallState, UserData } from '@/lib/types';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DiagnosticDialog from '@/components/app/diagnostic-dialog';
import Link from 'next/link';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const stateConfig = {
  OK: {
    label: 'ESTABLE',
    accent: 'border-l-green-500',
    badgeClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
    icon: <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />,
    description: 'Biomarcadores en equilibrio.',
    hint: 'Mantén el ritmo — la consistencia acumula.',
  },
  RIESGO: {
    label: 'RIESGO',
    accent: 'border-l-orange-500',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800',
    icon: <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
    description: 'Desviación detectada.',
    hint: 'Intervención leve ahora evita el modo crítico.',
  },
  CRITICO: {
    label: 'CRÍTICO',
    accent: 'border-l-red-500',
    badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
    icon: <ShieldX className="h-4 w-4 text-red-600 dark:text-red-400" />,
    description: 'Sistema en protección.',
    hint: 'Ejecuta el protocolo de rescate inmediatamente.',
  },
};

interface OverviewCardProps {
  overallState: OverallState;
  dominantVariables: UserData['dominantVariables'];
  onActivateProtocol: () => void;
  userData: UserData;
  isLearningMode?: boolean;
}

function VelocityBadge({ velocity }: { velocity: UserData['kpis']['scoreVelocity'] }) {
  if (!velocity) return null;
  const Icon = velocity.direction === 'rising' ? TrendingUp
    : velocity.direction === 'stable' ? Minus
    : TrendingDown;
  const cls = velocity.direction === 'rising' ? 'text-green-500 bg-green-500/10'
    : velocity.direction === 'stable' ? 'text-muted-foreground bg-muted/50'
    : velocity.direction === 'plunging' ? 'text-red-500 bg-red-500/10 animate-pulse'
    : velocity.direction === 'falling' ? 'text-orange-500 bg-orange-500/10'
    : 'text-yellow-500 bg-yellow-500/10';
  return (
    <span className={cn('flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full', cls)}>
      <Icon className="h-2.5 w-2.5" />
      {velocity.weekly > 0 ? '+' : ''}{velocity.weekly.toFixed(1)}/d
    </span>
  );
}

export default function OverviewCard({ overallState, dominantVariables = [], onActivateProtocol, userData, isLearningMode }: OverviewCardProps) {
  const config = stateConfig[overallState || 'OK'];
  const { user, uid } = useUser();
  const { toast } = useToast();
  const [isDiagOpen, setIsDiagOpen] = useState(false);
  const showDiag = overallState === 'RIESGO' || overallState === 'CRITICO';

  const logQuickAction = (varId: string, label: string, context: string, intensidad = 5) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_QUICK_${Date.now()}`,
      var_id: varId,
      intensidad,
      contexto: context,
      tipo: 'Protocolo',
      impulsivo: false,
    });
    toast({ title: `${label} registrado`, description: 'El motor actualizará el estado en breve.' });
  };

  const score = userData.rpg_stats?.player_score ?? 0;

  // Botones dinámicos según estado + hora + biomarcadores
  const dynamicActions = useMemo(() => {
    const hour = new Date().getHours();
    const cortisol = userData.rpg_stats?.cortisol ?? 50;
    const energia = userData.rpg_stats?.energia ?? 50;
    const sueno = userData.rpg_stats?.sueno ?? 50;
    const deuda = userData.rpg_stats?.sleep_debt_score ?? 0;
    const dopamina = userData.rpg_stats?.dopamina ?? 50;
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 18;
    const isEvening = hour >= 18 && hour < 23;

    const pool: { var_id: string; label: string; icon: any; context: string; intensidad: number; score: number }[] = [
      {
        var_id: 'BREATHING', label: 'Respirar', icon: Wind,
        context: 'Protocolo de respiración 4-7-8, 5 minutos.',
        intensidad: 5,
        score: (cortisol > 65 ? 4 : cortisol > 50 ? 2 : 1) + (isEvening ? 2 : 0) + (hour >= 23 ? 2 : 0),
      },
      {
        var_id: 'WALK', label: 'Caminar', icon: Footprints,
        context: 'Caminata de 10-15 minutos al aire libre.',
        intensidad: 6,
        score: (isMorning ? 3 : isAfternoon ? 2 : 0) + (cortisol > 55 ? 2 : 0) + (energia > 30 ? 1 : -2),
      },
      {
        var_id: 'MEDITATION', label: 'Meditar', icon: PenLine,
        context: 'Sesión breve de meditación o mindfulness.',
        intensidad: 7,
        score: (cortisol > 60 ? 3 : 1) + (isEvening ? 3 : 0) + (overallState === 'RIESGO' ? 2 : 0),
      },
      {
        var_id: 'CARDIO', label: 'Cardio', icon: Footprints,
        context: 'Ejercicio aeróbico — carrera, bici o elíptica.',
        intensidad: 8,
        score: isMorning && energia > 45 && dopamina < 55 ? 4 : -1,
      },
      {
        var_id: 'FUERZA', label: 'Ejercitar', icon: Dumbbell,
        context: 'Entrenamiento de fuerza — pesas o calistenia.',
        intensidad: 8,
        score: isMorning && energia > 50 ? 3 : -1,
      },
      {
        var_id: 'SIESTA', label: 'Siesta', icon: Moon,
        context: 'Siesta corta de recuperación (20-30 min).',
        intensidad: 6,
        score: isAfternoon && (energia < 35 || deuda > 20) ? 4 : -2,
      },
      {
        var_id: 'SUEÑO_PROF', label: 'Log sueño', icon: Moon,
        context: 'Registrar calidad del sueño de anoche.',
        intensidad: 8,
        score: isMorning && (sueno < 50 || deuda > 15) ? 5 : -3,
      },
    ];

    return pool
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [userData, overallState]);

  const AREA_ROUTES: Record<string, string> = {
    'salud f': '/dashboard/physical',
    'sueño': '/dashboard/sleep',
    'relac': '/dashboard/relations',
    'dopam': '/dashboard/dopamine',
    'ocio': '/dashboard/dopamine',
    'creativ': '/dashboard/creativity',
    'estudio': '/dashboard/studies',
    'propósit': '/dashboard/purpose',
    'entorno': '/dashboard/environment',
    'finanz': '/dashboard/finances',
  };

  const getAreaRoute = (areaName: string) => {
    const lower = areaName.toLowerCase();
    for (const [key, route] of Object.entries(AREA_ROUTES)) {
      if (lower.includes(key)) return route;
    }
    return null;
  };

  // Top 2 best / worst areas — deduplicated
  const areas = userData.kpis?.scoresByArea ?? [];
  const sorted = [...areas].sort((a, b) => b.score - a.score);
  const topAreas = sorted.slice(0, 2);
  const topIds = new Set(topAreas.map(a => a.area));
  const worstAreas = [...areas]
    .sort((a, b) => a.score - b.score)
    .filter(a => !topIds.has(a.area))
    .slice(0, 2);

  return (
    <>
    <Card className={cn('h-full flex flex-col shadow-sm border-primary/10 border-l-4', config.accent)}>
      <CardHeader className="pb-3 space-y-3">
        {/* Modo aprendizaje */}
        {isLearningMode && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>El motor está calibrando. Registra eventos durante unos días para obtener métricas precisas.</span>
          </div>
        )}

        {/* Estado + score */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge className={cn('py-1 px-2.5 rounded-full flex items-center gap-1.5 text-xs', config.badgeClass)}>
              {config.icon}
              <span className="font-bold">{config.label}</span>
            </Badge>
            {showDiag && (
              <button
                onClick={() => setIsDiagOpen(true)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                <Info className="h-3 w-3" />
                ¿Por qué?
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <VelocityBadge velocity={userData.kpis?.scoreVelocity} />
            <span className="text-3xl font-black tabular-nums leading-none">
              {score}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </span>
          </div>
        </div>

        {/* Descripción + hint */}
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">{config.description}</p>
          <p className="text-[11px] text-muted-foreground leading-snug">{config.hint}</p>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-4">
        {/* Drenajes activos */}
        {dominantVariables.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={11} className="text-primary" /> Drenajes activos
            </p>
            <div className="flex flex-wrap gap-1.5">
              <TooltipProvider>
                {dominantVariables.map((v, idx) => (
                  <Tooltip key={`${v.var_id}-${idx}`}>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="px-2 py-0.5 text-[10px] cursor-help bg-muted/50 hover:bg-muted">
                        {v.nombre || v.var_id}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold">Impacto: {v.total_impact.toFixed(1)}</p>
                      <p className="text-[10px]">~{v.hours_remaining}h de efecto restante</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Snapshot de áreas */}
        {areas.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {/* Best areas */}
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">↑ Mejor</p>
                {topAreas.map(a => {
                  const route = getAreaRoute(a.area);
                  const inner = (
                    <div className="flex items-center justify-between text-[10px] group">
                      <span className={cn('text-muted-foreground truncate max-w-[72px]', route && 'group-hover:text-foreground transition-colors')}>{a.area.split('/')[0]}</span>
                      <span className="font-bold text-green-500 tabular-nums">{a.score}</span>
                    </div>
                  );
                  return route
                    ? <Link key={a.area} href={route}>{inner}</Link>
                    : <div key={a.area}>{inner}</div>;
                })}
              </div>
              {/* Worst areas */}
              {worstAreas.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">↓ Mejorar</p>
                  {worstAreas.map(a => {
                    const route = getAreaRoute(a.area);
                    const inner = (
                      <div className="flex items-center justify-between text-[10px] group">
                        <span className={cn('text-muted-foreground truncate max-w-[72px]', route && 'group-hover:text-foreground transition-colors')}>{a.area.split('/')[0]}</span>
                        <span className={cn('font-bold tabular-nums', a.score < 40 ? 'text-red-500' : 'text-orange-500')}>{a.score}</span>
                      </div>
                    );
                    return route
                      ? <Link key={a.area} href={route}>{inner}</Link>
                      : <div key={a.area}>{inner}</div>;
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alerta clínica — solo SEVERE */}
        {userData.clinical_v2?.enabled && userData.clinical_v2.risk_band === 'SEVERE' && (
          <div className="rounded-lg px-2.5 py-1.5 bg-red-500/10 border border-red-500/30 text-[10px] font-bold text-red-500 uppercase tracking-widest">
            Riesgo clínico severo · {userData.clinical_v2.markers[0]?.replace(/_/g, ' ')}
          </div>
        )}
        {/* Acciones rápidas */}
        <div className="pt-2">
          {overallState === 'CRITICO' ? (
            <Button variant="destructive" className="w-full font-bold" onClick={onActivateProtocol}>
              <Sparkles className="mr-2 h-4 w-4" /> ACTIVAR PROTOCOLO IA
            </Button>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 w-full">
              {dynamicActions.map(action => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.var_id}
                    variant="outline"
                    size="sm"
                    className="text-[11px] flex-col h-auto py-2 gap-1 min-w-0 px-1"
                    onClick={() => logQuickAction(action.var_id, action.label, action.context, action.intensidad)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate w-full text-center">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* ── Diagnóstico ── */}
    <DiagnosticDialog
      open={isDiagOpen}
      onClose={() => setIsDiagOpen(false)}
      userData={userData}
      overallState={overallState}
      dominantVariables={dominantVariables}
    />
    </>
  );
}


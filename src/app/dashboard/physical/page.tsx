'use client';

import { useMemo } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { useToast } from '@/hooks/use-toast';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import NavigationReady from '@/components/app/navigation-ready';
import { useAreaStreak } from '@/hooks/use-area-streak';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dumbbell, Wind, Footprints, Sun, Apple, AlertTriangle,
  Coffee, Zap, Clock,
} from 'lucide-react';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const EXERCISE_ACTIONS = [
  {
    var_id: 'FUERZA', label: 'Fuerza', icon: Dumbbell,
    context: 'Entrenamiento de fuerza — pesas o calistenia.',
    color: 'text-blue-500', border: 'hover:border-blue-500/40',
    intensidad: 8, badge: 'Dopamina +20 · 48h',
  },
  {
    var_id: 'CARDIO', label: 'Cardio', icon: Footprints,
    context: 'Ejercicio aeróbico — carrera, bici o elíptica.',
    color: 'text-green-500', border: 'hover:border-green-500/40',
    intensidad: 8, badge: 'Serotonina +25 · 24h',
  },
  {
    var_id: 'WALK', label: 'Caminata', icon: Wind,
    context: 'Caminata de 15-30 min, preferiblemente en naturaleza.',
    color: 'text-emerald-500', border: 'hover:border-emerald-500/40',
    intensidad: 6, badge: 'Cortisol −20 · 12h',
  },
  {
    var_id: 'SUNLIGHT', label: 'Luz solar', icon: Sun,
    context: 'Exposición a luz solar matutina, 10-20 minutos.',
    color: 'text-amber-500', border: 'hover:border-amber-500/40',
    intensidad: 5, badge: 'Serotonina +15 · 12h',
  },
] as const;

const NUTRITION_POSITIVE = [
  {
    var_id: 'HEALTHY_MEAL', label: 'Comida sana', icon: Apple,
    context: 'Comida nutritiva — proteína, verduras, sin procesados.',
    color: 'text-green-500', border: 'hover:border-green-500/40',
    intensidad: 5, badge: '+Energía · 12h', positive: true,
  },
  {
    var_id: 'CAFFEINE_MOD', label: 'Café/té', icon: Coffee,
    context: 'Cafeína moderada — 1-2 tazas.',
    color: 'text-amber-500', border: 'hover:border-amber-500/40',
    intensidad: 4, badge: '+Foco · 4h', positive: true,
  },
] as const;

const NUTRITION_NEGATIVE = [
  {
    var_id: 'ALIM_BASURA', label: 'Ultraprocesados', icon: AlertTriangle,
    context: 'Comida ultraprocesada o fast food.',
    color: 'text-orange-500', border: 'hover:border-orange-500/40',
    intensidad: 7, badge: '−Energía · 12h', positive: false,
  },
  {
    var_id: 'AZUCAR', label: 'Azúcar alta', icon: Zap,
    context: 'Consumo alto de azúcar o carbohidratos refinados.',
    color: 'text-red-500', border: 'hover:border-red-500/40',
    intensidad: 8, badge: '−Energía · 12h', positive: false,
  },
  {
    var_id: 'CAFFEINE_EXC', label: 'Cafeína excesiva', icon: Coffee,
    context: 'Cafeína excesiva — más de 3 tazas o después de las 15h.',
    color: 'text-red-500', border: 'hover:border-red-500/40',
    intensidad: 6, badge: '−Sueño · 12h', positive: false,
  },
] as const;

const ALL_VAR_IDS = [
  ...EXERCISE_ACTIONS.map(a => a.var_id),
  ...NUTRITION_POSITIVE.map(a => a.var_id),
  ...NUTRITION_NEGATIVE.map(a => a.var_id),
];

const ALL_ACTIONS = [...EXERCISE_ACTIONS, ...NUTRITION_POSITIVE, ...NUTRITION_NEGATIVE];

export default function PhysicalPage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();

  const areaScore = useMemo(
    () => userData?.kpis.scoresByArea.find(a =>
      a.area.toLowerCase().includes('salud f') || a.area.toLowerCase().includes('físic')
    )?.score ?? null,
    [userData],
  );

  const streak = useAreaStreak(userData?.events, ALL_VAR_IDS as unknown as string[]);

  const recentEvents = useMemo(() =>
    (userData?.events ?? [])
      .filter(e => ALL_VAR_IDS.includes(e.var_id as any))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10),
    [userData],
  );

  // Stats de los últimos 7 días
  const weekStats = useMemo(() => {
    const cutoff = Date.now() - 7 * 864e5;
    const week = recentEvents.filter(e => new Date(e.fecha).getTime() > cutoff);
    return {
      exercise: week.filter(e => ['FUERZA', 'CARDIO', 'WALK'].includes(e.var_id)).length,
      junk: week.filter(e => ['ALIM_BASURA', 'AZUCAR'].includes(e.var_id)).length,
      sunlight: week.filter(e => e.var_id === 'SUNLIGHT').length,
    };
  }, [recentEvents]);

  const log = (action: { var_id: string; label: string; context: string; intensidad: number; badge: string }) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_PHYS_${Date.now()}`,
      var_id: action.var_id,
      intensidad: action.intensidad,
      contexto: action.context,
      tipo: 'Variable',
      impulsivo: false,
    });
    toast({ title: `${action.label} registrado`, description: action.badge });
  };

  const scoreColor = areaScore === null ? 'text-muted-foreground'
    : areaScore >= 75 ? 'text-green-500'
    : areaScore >= 50 ? 'text-orange-500'
    : 'text-red-500';

  if (isLoading && !userData) return <AreaPageSkeleton />;

  return (
    <div className="space-y-8 pb-16">
      <NavigationReady />

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Dumbbell className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Salud física</h1>
          {areaScore !== null && (
            <Badge variant="outline" className={cn('font-mono font-bold', scoreColor)}>
              {areaScore}/100
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Ejercicio, nutrición y ritmo circadiano.</span>
          {streak > 0 && (
            <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
              🔥 {streak}d racha
            </Badge>
          )}
        </div>
      </div>

      <AreaDetailPanel areaNameMatch="salud" />

      {/* Stats rápidos de la semana */}
      {(weekStats.exercise > 0 || weekStats.junk > 0 || weekStats.sunlight > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/30 p-3 text-center space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Ejercicio 7d</p>
            <p className={cn('text-xl font-black tabular-nums',
              weekStats.exercise >= 3 ? 'text-green-500' : weekStats.exercise >= 1 ? 'text-orange-500' : 'text-red-500'
            )}>{weekStats.exercise}</p>
            <p className="text-[9px] text-muted-foreground">sesiones</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-center space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Luz solar 7d</p>
            <p className={cn('text-xl font-black tabular-nums',
              weekStats.sunlight >= 5 ? 'text-green-500' : weekStats.sunlight >= 2 ? 'text-orange-500' : 'text-muted-foreground'
            )}>{weekStats.sunlight}</p>
            <p className="text-[9px] text-muted-foreground">días</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-center space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Basura 7d</p>
            <p className={cn('text-xl font-black tabular-nums',
              weekStats.junk === 0 ? 'text-green-500' : weekStats.junk <= 2 ? 'text-orange-500' : 'text-red-500'
            )}>{weekStats.junk}</p>
            <p className="text-[9px] text-muted-foreground">episodios</p>
          </div>
        </div>
      )}

      {/* Ejercicio y movimiento */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Ejercicio y movimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EXERCISE_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.var_id}
                  variant="outline"
                  className={cn('flex flex-col h-auto py-4 gap-2', action.border)}
                  onClick={() => log(action)}
                >
                  <Icon className={cn('h-5 w-5', action.color)} />
                  <span className="text-xs font-semibold">{action.label}</span>
                  <span className="text-[9px] text-muted-foreground">{action.badge}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Nutrición */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Nutrición
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {NUTRITION_POSITIVE.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.var_id}
                  variant="outline"
                  className={cn('flex flex-col h-auto py-3 gap-1.5', action.border)}
                  onClick={() => log(action)}
                >
                  <Icon className={cn('h-4 w-4', action.color)} />
                  <span className="text-xs font-semibold">{action.label}</span>
                  <span className="text-[9px] text-green-500">{action.badge}</span>
                </Button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {NUTRITION_NEGATIVE.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.var_id}
                  variant="outline"
                  className={cn('flex flex-col h-auto py-3 gap-1.5 opacity-80', action.border)}
                  onClick={() => log(action)}
                >
                  <Icon className={cn('h-4 w-4', action.color)} />
                  <span className="text-xs font-semibold">{action.label}</span>
                  <span className={cn('text-[9px]', 'text-red-500')}>{action.badge}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Actividad reciente
          </CardTitle>
          <CardDescription>Últimas entradas de salud física.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin registros aún. El ejercicio aeróbico tiene efectos de serotonina de 24h y endorfinas de 24h.
            </p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(ev => {
                const action = ALL_ACTIONS.find(a => a.var_id === ev.var_id);
                const Icon = action?.icon ?? Dumbbell;
                const isPositive = (action as any)?.positive !== false && action?.var_id !== 'ALIM_BASURA' && action?.var_id !== 'AZUCAR' && action?.var_id !== 'CAFFEINE_EXC';
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                    <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', action?.color ?? 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ev.contexto || ev.var_id}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(ev.fecha), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[9px] shrink-0 font-semibold px-1.5 py-0.5 rounded-full border',
                      isPositive
                        ? 'border-green-500/40 text-green-500 bg-green-500/20'
                        : 'border-red-500/40 text-red-500 bg-red-500/20'
                    )}>
                      {isPositive ? '+' : '−'}{ev.intensidad}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Dumbbell className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Impacto en el sistema</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
                <span>Fuerza → <strong className="text-blue-400">Dopamina +20, Endorfinas +40</strong> · 48h</span>
                <span>Cardio → <strong className="text-green-400">Serotonina +25, Energía +30</strong> · 24h</span>
                <span>Caminata → <strong className="text-emerald-400">Cortisol −20, Serotonina +25</strong> · 12h</span>
                <span>Luz solar → <strong className="text-amber-400">Serotonina +15</strong> · activa ritmo circadiano</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




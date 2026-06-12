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
import { Compass, Heart, Star, Users, Zap, Clock, CheckCircle2, Circle } from 'lucide-react';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const PURPOSE_VARS = ['PURPOSE_SENSE', 'VALUES_ACTION', 'HELP_OTHERS', 'ACHIEVEMENT'];

const QUICK_ACTIONS = [
  { var_id: 'PURPOSE_SENSE', label: 'Sentido', icon: Compass, context: 'Momento de claridad y sentido de propósito.', color: 'text-purple-500', border: 'hover:border-purple-500/40', badge: 'Serotonina +25 · 72h', intensidad: 8 },
  { var_id: 'VALUES_ACTION', label: 'Valores', icon: Star, context: 'Acción alineada con mis valores.', color: 'text-amber-500', border: 'hover:border-amber-500/40', badge: 'Serotonina +20 · 48h', intensidad: 7 },
  { var_id: 'HELP_OTHERS', label: 'Ayudar', icon: Heart, context: 'Ayudé a alguien de forma significativa.', color: 'text-rose-500', border: 'hover:border-rose-500/40', badge: 'Oxitocina +20 · 48h', intensidad: 7 },
  { var_id: 'ACHIEVEMENT', label: 'Logro', icon: Zap, context: 'Logro importante alcanzado.', color: 'text-green-500', border: 'hover:border-green-500/40', badge: 'Dopamina +25 · 48h', intensidad: 8 },
];

export default function PurposePage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();

  const areaScore = useMemo(() => {
    return userData?.kpis.scoresByArea.find(a => a.area.includes('Propósito') || a.area.includes('Proposito'))?.score ?? null;
  }, [userData]);

  const purposeVarIds = useMemo(() => {
    return (userData?.variables ?? [])
      .filter(v => v.area_id === 'PROPOSITO')
      .map(v => v.var_id);
  }, [userData]);

  const recentEvents = useMemo(() => {
    const ids = purposeVarIds.length > 0 ? purposeVarIds : PURPOSE_VARS;
    return (userData?.events ?? [])
      .filter(e => ids.includes(e.var_id))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 8);
  }, [userData, purposeVarIds]);

  const activeMilestones = useMemo(() => {
    return (userData?.milestones ?? []).filter(m => m.estado === 'Pendiente').slice(0, 5);
  }, [userData]);

  const streak = useAreaStreak(userData?.events, PURPOSE_VARS);

  const last7Events = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const ids = purposeVarIds.length > 0 ? purposeVarIds : PURPOSE_VARS;
    return (userData?.events ?? []).filter(e => ids.includes(e.var_id) && new Date(e.fecha).getTime() > cutoff).length;
  }, [userData, purposeVarIds]);

  const logAction = (varId: string, label: string, context: string, intensidad: number, badge: string) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_PURPOSE_${Date.now()}`,
      var_id: varId,
      intensidad,
      contexto: context,
      tipo: 'Variable',
      impulsivo: false,
    });
    toast({ title: `${label} registrado`, description: badge });
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
        <div className="flex items-center gap-2" data-tour="area-header">
          <Compass className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Propósito</h1>
          {areaScore !== null && (
            <Badge variant="outline" className={cn('ml-2 font-mono font-bold', scoreColor)}>
              {areaScore}/100
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Alineación con valores, sentido de vida y contribución. {last7Events > 0 && `${last7Events} registros en los últimos 7 días.`}</span>
          {streak > 0 && (
            <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
              🔥 {streak}d racha
            </Badge>
          )}
        </div>
      </div>

      <AreaDetailPanel areaNameMatch="propósit" />

      {/* Quick Log */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Registrar acción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ var_id, label, icon: Icon, context, color, border, badge, intensidad }) => (
              <Button
                key={var_id}
                variant="outline"
                className={cn('flex flex-col h-auto py-4 gap-2', border)}
                onClick={() => logAction(var_id, label, context, intensidad, badge)}
              >
                <Icon className={cn('h-5 w-5', color)} />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[9px] text-muted-foreground">{badge}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eventos recientes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Actividad reciente
            </CardTitle>
            <CardDescription>Últimas acciones de propósito registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin registros aún. Usa los botones de arriba para empezar.</p>
            ) : (
              <div className="space-y-2">
                {recentEvents.map(ev => {
                  const action = QUICK_ACTIONS.find(a => a.var_id === ev.var_id);
                  const Icon = action?.icon ?? Zap;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                      <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', action?.color ?? 'text-muted-foreground')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{ev.contexto || ev.var_id}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(ev.fecha), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{ev.intensidad}/10</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hitos activos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" /> Hitos activos
            </CardTitle>
            <CardDescription>Objetivos estratégicos en curso.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeMilestones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin hitos activos. Créalos en Habit Tracker.</p>
            ) : (
              <div className="space-y-2">
                {activeMilestones.map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                    {m.milestone_type === 'recurring'
                      ? <Circle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      : <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.nombre}</p>
                      {m.fecha_objetivo && (
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(m.fecha_objetivo), { addSuffix: true, locale: es })}
                        </p>
                      )}
                    </div>
                    {m.milestone_type === 'recurring' && m.target_count > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {m.progress_count}/{m.target_count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Contexto */}
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">¿Por qué importa?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Las variables de propósito tienen la mayor <strong>duración de efecto</strong> del sistema (2-3 días). Un solo acto alineado con tus valores genera serotonina sostenida y reduce cortisol de forma duradera — más que cualquier protocolo de recuperación.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




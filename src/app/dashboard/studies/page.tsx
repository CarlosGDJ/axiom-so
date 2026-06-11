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
import { GraduationCap, BookOpenCheck, TrendingUp, Wrench, Brain, Clock } from 'lucide-react';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const QUICK_ACTIONS = [
  {
    var_id: 'SKILL_PRACTICE', label: 'Práctica', icon: Wrench,
    context: 'Práctica deliberada — repetición enfocada de una habilidad.',
    color: 'text-blue-500', border: 'hover:border-blue-500/40',
    intensidad: 8, badge: 'Dopamina +20 · 24h',
  },
  {
    var_id: 'DEEP_READING', label: 'Lectura técnica', icon: BookOpenCheck,
    context: 'Lectura técnica o no-ficción con toma de notas.',
    color: 'text-indigo-500', border: 'hover:border-indigo-500/40',
    intensidad: 7, badge: 'Foco +15 · 12h',
  },
  {
    var_id: 'COURSE_PROGRESS', label: 'Formación', icon: TrendingUp,
    context: 'Avance en curso, formación o certificación.',
    color: 'text-emerald-500', border: 'hover:border-emerald-500/40',
    intensidad: 7, badge: 'Serotonina +20 · 48h',
  },
  {
    var_id: 'LEARNING', label: 'Aprendizaje', icon: Brain,
    context: 'Sesión general de aprendizaje — vídeos, tutoriales, investigación.',
    color: 'text-purple-500', border: 'hover:border-purple-500/40',
    intensidad: 6, badge: 'Foco +10 · 12h',
  },
] as const;

const STUDY_VAR_IDS = QUICK_ACTIONS.map(a => a.var_id);

export default function StudiesPage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();

  const areaScore = useMemo(
    () => userData?.kpis.scoresByArea.find(a => a.area.toLowerCase().includes('estudio') || a.area.toLowerCase().includes('aprendiz'))?.score ?? null,
    [userData],
  );

  const recentEvents = useMemo(() =>
    (userData?.events ?? [])
      .filter(e => STUDY_VAR_IDS.includes(e.var_id as any))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 8),
    [userData],
  );

  const last7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 864e5;
    return recentEvents.filter(e => new Date(e.fecha).getTime() > cutoff).length;
  }, [recentEvents]);

  const streak = useAreaStreak(userData?.events, STUDY_VAR_IDS as unknown as string[]);

  // Minutos/sesiones por día en los últimos 7 días
  const weeklySessionMap = useMemo(() => {
    const cutoff = Date.now() - 7 * 864e5;
    const events = (userData?.events ?? []).filter(e =>
      STUDY_VAR_IDS.includes(e.var_id as any) && new Date(e.fecha).getTime() > cutoff
    );
    const map: Record<string, number> = {};
    events.forEach(e => {
      const day = new Date(e.fecha).toLocaleDateString('es-ES', { weekday: 'short' });
      map[day] = (map[day] ?? 0) + 1;
    });
    return map;
  }, [userData]);

  const activeMilestones = useMemo(
    () => (userData?.milestones ?? []).filter(m => m.estado === 'Pendiente').slice(0, 3),
    [userData],
  );

  const log = (action: typeof QUICK_ACTIONS[number]) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_STUDY_${Date.now()}`,
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
          <GraduationCap className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Estudios</h1>
          {areaScore !== null && (
            <Badge variant="outline" className={cn('font-mono font-bold', scoreColor)}>
              {areaScore}/100
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Aprendizaje deliberado y desarrollo de habilidades. {last7 > 0 ? `${last7} sesiones en los últimos 7 días.` : 'Sin actividad esta semana.'}</span>
          {streak > 0 && (
            <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
              🔥 {streak}d racha
            </Badge>
          )}
        </div>
      </div>

      <AreaDetailPanel areaNameMatch="estudio" />

      {/* Actividad semanal mini-heatmap */}
      {Object.keys(weeklySessionMap).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(weeklySessionMap).map(([day, count]) => (
            <div key={day} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-8 w-8 rounded-md flex items-center justify-center text-[10px] font-bold',
                  count >= 3 ? 'bg-blue-500 text-white' :
                  count === 2 ? 'bg-blue-400/60 text-blue-900 dark:text-white' :
                  'bg-blue-200/50 text-blue-700 dark:text-blue-300'
                )}
              >
                {count}
              </div>
              <span className="text-[9px] text-muted-foreground">{day}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick log */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Registrar sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(action => {
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

      {/* Hitos de aprendizaje */}
      {activeMilestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Hitos en curso
            </CardTitle>
            <CardDescription>Objetivos de formación activos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeMilestones.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Sesiones recientes
          </CardTitle>
          <CardDescription>Últimas entradas de la zona de estudios.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin registros aún. La práctica deliberada tiene el mayor impacto a 24h del sistema de estudios.
            </p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(ev => {
                const action = QUICK_ACTIONS.find(a => a.var_id === ev.var_id);
                const Icon = action?.icon ?? GraduationCap;
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

      <Separator />

      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Por qué importa</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La <strong>práctica deliberada</strong> activa dopamina intrínseca por 24h — más sostenida que el entretenimiento. El avance en formación genera serotonina por <strong>48h</strong> (el doble que la mayoría de variables). El aprendizaje acumulado es la única fuente de crecimiento compuesto del sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




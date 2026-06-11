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
import { Palette, Zap, Rocket, Sparkles, BookOpen, Gamepad2, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import EventHistoryList from '@/components/app/event-history-list';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const CREATIVE_AREA_IDS = ['CREATIVIDAD', 'DOPAMINA'];

const QUICK_ACTIONS = [
  {
    var_id: 'FLOW_STATE', label: 'Flow', icon: Zap,
    context: 'Entré en estado de flow — concentración total y sin fricción.',
    color: 'text-violet-500', border: 'hover:border-violet-500/40',
    intensidad: 9, badge: 'Foco +40 · 4h',
  },
  {
    var_id: 'CREATIVE_OUTPUT', label: 'Output', icon: Palette,
    context: 'Produje output creativo significativo.',
    color: 'text-purple-500', border: 'hover:border-purple-500/40',
    intensidad: 8, badge: 'Dopamina +25 · 8h',
  },
  {
    var_id: 'PROJECT_PROGRESS', label: 'Proyecto', icon: Rocket,
    context: 'Avance concreto en un proyecto personal.',
    color: 'text-blue-500', border: 'hover:border-blue-500/40',
    intensidad: 7, badge: 'Serotonina +15 · 24h',
  },
  {
    var_id: 'CREATIVITY', label: 'Creativo', icon: Sparkles,
    context: 'Sesión creativa general — dibujo, escritura, diseño, música.',
    color: 'text-pink-500', border: 'hover:border-pink-500/40',
    intensidad: 6, badge: 'Dopamina +15 · 8h',
  },
  {
    var_id: 'READING', label: 'Lectura', icon: BookOpen,
    context: 'Lectura de ocio o ficción.',
    color: 'text-emerald-500', border: 'hover:border-emerald-500/40',
    intensidad: 6, badge: 'Serotonina +10 · 8h',
  },
  {
    var_id: 'HOBBY_ACTIVE', label: 'Hobby', icon: Gamepad2,
    context: 'Hobby activo — construcción, cocina, música, deporte recreativo.',
    color: 'text-orange-500', border: 'hover:border-orange-500/40',
    intensidad: 7, badge: 'Dopamina +20 · 8h',
  },
] as const;

const CREATIVE_VAR_IDS = QUICK_ACTIONS.map(a => a.var_id);

export default function CreativityPage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();

  const areaScore = useMemo(
    () => userData?.kpis.scoresByArea.find(a => a.area.toLowerCase().includes('creativ'))?.score ?? null,
    [userData],
  );

  const recentEvents = useMemo(() =>
    (userData?.events ?? [])
      .filter(e => CREATIVE_VAR_IDS.includes(e.var_id as any))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [userData],
  );

  const last7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 864e5;
    return recentEvents.filter(e => new Date(e.fecha).getTime() > cutoff).length;
  }, [recentEvents]);

  const streak = useAreaStreak(userData?.events, CREATIVE_VAR_IDS as unknown as string[]);

  const log = (action: typeof QUICK_ACTIONS[number]) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_CREAT_${Date.now()}`,
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
          <Palette className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Creatividad</h1>
          {areaScore !== null && (
            <Badge variant="outline" className={cn('font-mono font-bold', scoreColor)}>
              {areaScore}/100
            </Badge>
          )}
          {streak > 1 && (
            <Badge variant="secondary" className="text-amber-500 border-amber-500/30 text-[10px]">
              🔥 {streak} días seguidos
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Proyectos, flow y ocio activo. {last7 > 0 ? `${last7} registros en los últimos 7 días.` : 'Sin actividad esta semana.'}
        </p>
      </div>

      <AreaDetailPanel areaNameMatch="creativ" />

      {/* Factores que afectan la creatividad */}
      {userData && (userData.rpg_stats?.dopamina ?? 100) < 40 && (
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Dopamina baja detectada</p>
                <p className="text-[10px] text-muted-foreground">La motivación creativa requiere dopamina basal. Reduce drenajes para restaurar el impulso.</p>
                <Link href="/dashboard/dopamine" className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 hover:underline w-fit">
                  Ver Dopamina & Ocio <span className="font-mono font-bold">{Math.round(userData.rpg_stats?.dopamina ?? 0)}</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick log */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Registrar actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

      {/* Historial */}
      <EventHistoryList
        events={recentEvents}
        description="Últimas entradas de la zona creativa."
        emptyMessage="Sin registros aún. El flow y el output creativo tienen el mayor impacto en dopamina del sistema."
        renderIcon={ev => {
          const action = QUICK_ACTIONS.find(a => a.var_id === ev.var_id);
          const Icon = action?.icon ?? Palette;
          return <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', action?.color ?? 'text-muted-foreground')} />;
        }}
        renderBadge={ev => (
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{ev.intensidad}/10</span>
        )}
      />

      <Separator />

      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Por qué importa</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El <strong>estado de flow</strong> es el pico de dopamina intrínseca del sistema — <strong>Foco +40 durante 4h</strong> sin resaca dopaminérgica. A diferencia del entretenimiento pasivo, el output creativo construye identidad y genera serotonina sostenida.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

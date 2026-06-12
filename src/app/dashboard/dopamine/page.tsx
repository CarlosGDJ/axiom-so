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
  BookOpen, Gamepad2, Palette, Smartphone, TrendingDown,
  Wine, Clock, Zap, Activity,
} from 'lucide-react';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const HEALTHY_ACTIONS = [
  {
    var_id: 'READING', label: 'Lectura', icon: BookOpen,
    context: 'Lectura activa — libro, artículo o ensayo.',
    color: 'text-blue-500', border: 'hover:border-blue-500/40',
    intensidad: 6, badge: 'Dopamina +15 · 8h',
  },
  {
    var_id: 'HOBBY_ACTIVE', label: 'Hobby activo', icon: Palette,
    context: 'Actividad creativa o hobby con implicación activa.',
    color: 'text-indigo-500', border: 'hover:border-indigo-500/40',
    intensidad: 7, badge: 'Dopamina +20 · 12h',
  },
  {
    var_id: 'GAME_SOCIAL', label: 'Juego social', icon: Gamepad2,
    context: 'Juego con otras personas — tablero, videojuego cooperativo.',
    color: 'text-emerald-500', border: 'hover:border-emerald-500/40',
    intensidad: 6, badge: 'Dopamina +15 · 8h',
  },
] as const;

const DRAIN_ACTIONS = [
  {
    var_id: 'SOCIAL_MEDIA_BRIEF', label: 'Redes breve', icon: Smartphone,
    context: 'Uso de redes sociales o contenido corto — menos de 30 min.',
    color: 'text-yellow-500', border: 'hover:border-yellow-500/40',
    intensidad: 3, badge: 'Dopamina −10 · 4h',
  },
  {
    var_id: 'DOOMSCROLLING', label: 'Doomscrolling', icon: TrendingDown,
    context: 'Scroll pasivo de contenido corto — reels, TikTok, noticias.',
    color: 'text-orange-500', border: 'hover:border-orange-500/40',
    intensidad: 9, badge: 'Dopamina −35 · 12h',
  },
  {
    var_id: 'GAMING_INTENSE', label: 'Gaming intenso', icon: Gamepad2,
    context: 'Videojuegos intensivos o compulsivos — más de 2h solo.',
    color: 'text-red-400', border: 'hover:border-red-400/40',
    intensidad: 7, badge: 'Dopamina −25 · 8h',
  },
  {
    var_id: 'ALCOHOL_MOD', label: 'Alcohol moderado', icon: Wine,
    context: '1-2 bebidas alcohólicas.',
    color: 'text-orange-400', border: 'hover:border-orange-400/40',
    intensidad: 5, badge: 'Cortisol +15 · 24h',
  },
  {
    var_id: 'ALCOHOL_HIGH', label: 'Alcohol excesivo', icon: Wine,
    context: 'Consumo alto de alcohol — 3+ bebidas.',
    color: 'text-red-500', border: 'hover:border-red-500/40',
    intensidad: 9, badge: 'Cortisol +40 · 48h',
  },
  {
    var_id: 'PORNO', label: 'Pornografía', icon: Activity,
    context: 'Consumo de pornografía.',
    color: 'text-red-500', border: 'hover:border-red-500/40',
    intensidad: 10, badge: 'Dopamina −40 · 24h',
  },
] as const;

const ALL_VAR_IDS = [...HEALTHY_ACTIONS, ...DRAIN_ACTIONS].map(a => a.var_id);
const ALL_ACTIONS = [...HEALTHY_ACTIONS, ...DRAIN_ACTIONS];

export default function DopaminePage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();

  const areaScore = useMemo(
    () => userData?.kpis.scoresByArea.find(a =>
      a.area.toLowerCase().includes('ocio') || a.area.toLowerCase().includes('dopam')
    )?.score ?? null,
    [userData],
  );

  const streak = useAreaStreak(userData?.events, ALL_VAR_IDS as unknown as string[]);

  const dopamineStat = useMemo(
    () => userData?.rpg_stats?.dopamina ?? null,
    [userData],
  );

  const recentEvents = useMemo(() =>
    (userData?.events ?? [])
      .filter(e => ALL_VAR_IDS.includes(e.var_id as any))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10),
    [userData],
  );

  // 7-day dopamine economy balance
  const balance = useMemo(() => {
    const cutoff = Date.now() - 7 * 864e5;
    const week = (userData?.events ?? []).filter(e =>
      ALL_VAR_IDS.includes(e.var_id as any) && new Date(e.fecha).getTime() > cutoff,
    );
    const healthy = week.filter(e => HEALTHY_ACTIONS.some(a => a.var_id === e.var_id)).length;
    const drain = week.filter(e => DRAIN_ACTIONS.some(a => a.var_id === e.var_id)).length;
    const heavyDrain = week.filter(e =>
      ['DOOMSCROLLING', 'ALCOHOL_HIGH', 'PORNO'].includes(e.var_id)
    ).length;
    return { healthy, drain, total: healthy + drain, heavyDrain };
  }, [userData]);

  const balanceRatio = balance.total > 0 ? Math.round((balance.healthy / balance.total) * 100) : null;

  const log = (action: { var_id: string; label: string; context: string; intensidad: number; badge: string }) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_DOP_${Date.now()}`,
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

  const dopamineColor = dopamineStat === null ? 'text-muted-foreground'
    : dopamineStat >= 60 ? 'text-green-500'
    : dopamineStat >= 40 ? 'text-orange-500'
    : 'text-red-500';

  if (isLoading && !userData) return <AreaPageSkeleton />;

  return (
    <div className="space-y-8 pb-16">
      <NavigationReady />

      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap" data-tour="area-header">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Dopamina y Ocio</h1>
          {areaScore !== null && (
            <Badge variant="outline" className={cn('font-mono font-bold', scoreColor)}>{areaScore}/100</Badge>
          )}
          {dopamineStat !== null && (
            <Badge variant="outline" className={cn('font-mono text-[10px]', dopamineColor)}>
              DA {Math.round(dopamineStat)}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Economía dopaminérgica — fuentes sanas vs drenajes de señal.</span>
          {streak > 0 && (
            <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
              🔥 {streak}d racha
            </Badge>
          )}
        </div>
      </div>

      <AreaDetailPanel areaNameMatch="dopam" />

      {/* Economía semanal */}
      {balance.total > 0 && (
        <Card className={cn('border-primary/10', balance.heavyDrain >= 3 && 'border-destructive/30')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Economía dopaminérgica — 7 días
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-indigo-500 font-semibold">{balance.healthy} fuentes sanas</span>
              <span className="text-orange-500 font-semibold">{balance.drain} drenajes</span>
            </div>
            <div className="h-2 bg-orange-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${balanceRatio ?? 50}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-muted-foreground">{balanceRatio ?? '—'}% saludable</p>
              {balance.heavyDrain > 0 && (
                <p className="text-[10px] text-red-500 font-semibold">
                  {balance.heavyDrain} drenaje{balance.heavyDrain !== 1 ? 's' : ''} severo{balance.heavyDrain !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fuentes saludables */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Fuentes saludables
          </CardTitle>
          <CardDescription className="text-[11px]">
            Actividades de alta recompensa con bajo coste neurológico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {HEALTHY_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <Button key={action.var_id} variant="outline"
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

      {/* Drenajes */}
      <Card className="border-destructive/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Registrar drenajes
          </CardTitle>
          <CardDescription className="text-[11px]">
            Registrar también los drenajes mantiene el modelo calibrado. Sin juicio — solo datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DRAIN_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <Button key={action.var_id} variant="outline"
                  className={cn('flex flex-col h-auto py-3 gap-1.5 opacity-75', action.border)}
                  onClick={() => log(action)}
                >
                  <Icon className={cn('h-4 w-4', action.color)} />
                  <span className="text-xs font-semibold">{action.label}</span>
                  <span className="text-[9px] text-orange-500">{action.badge}</span>
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
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin registros. El doomscrolling tiene el mayor impacto negativo en dopamina del sistema.
            </p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(ev => {
                const action = ALL_ACTIONS.find(a => a.var_id === ev.var_id);
                const Icon = action?.icon ?? Zap;
                const isHealthy = HEALTHY_ACTIONS.some(a => a.var_id === ev.var_id);
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
                      isHealthy
                        ? 'border-indigo-500/40 text-indigo-500 bg-indigo-500/20'
                        : 'border-orange-500/40 text-orange-500 bg-orange-500/20'
                    )}>
                      {isHealthy ? '+' : '−'}{ev.intensidad}
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
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Economía dopaminérgica</p>
              <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <p>El <strong>doomscrolling</strong> activa el sistema de recompensa con intensidad extrema y duración breve, dejando el umbral dopaminérgico elevado durante <strong>12h</strong>. Las actividades saludables requieren más esfuerzo inicial pero generan señal sostenida.</p>
                <p className="text-[10px] grid grid-cols-1 gap-0.5 mt-1">
                  <span>Hobby activo → <strong className="text-indigo-400">Dopamina +20 · 12h</strong></span>
                  <span>Doomscrolling → <strong className="text-red-400">Dopamina −35 · 12h</strong> (Exponencial)</span>
                  <span>Pornografía → <strong className="text-red-400">Dopamina −40 · 24h</strong> (Exponencial)</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




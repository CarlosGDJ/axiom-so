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
import { TreePine, LayoutGrid, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const ENTORNO_VARS = ['ENV_ORDER', 'ENV_CHAOS', 'NATURE_VIEW', 'WALK'];

const QUICK_ACTIONS = [
  { var_id: 'ENV_ORDER', label: 'Orden', icon: LayoutGrid, context: 'Organicé y ordené mi espacio.', color: 'text-green-500', border: 'hover:border-green-500/40', badge: 'Cortisol −6 · 24h', positive: true },
  { var_id: 'NATURE_VIEW', label: 'Naturaleza', icon: TreePine, context: 'Contemplé o estuve en contacto con la naturaleza.', color: 'text-emerald-500', border: 'hover:border-emerald-500/40', badge: 'Serotonina +25 · 12h', positive: true },
  { var_id: 'WALK', label: 'Caminata', icon: TrendingUp, context: 'Caminata al aire libre o en naturaleza.', color: 'text-blue-500', border: 'hover:border-blue-500/40', badge: 'Cortisol −20 · 12h', positive: true },
  { var_id: 'ENV_CHAOS', label: 'Caos', icon: AlertTriangle, context: 'Entorno desordenado o caótico.', color: 'text-orange-500', border: 'hover:border-orange-500/40', badge: 'Cortisol +8 · 24h', positive: false },
];

export default function EnvironmentPage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();

  const areaScore = useMemo(() => {
    return userData?.kpis.scoresByArea.find(a => a.area.includes('Entorno'))?.score ?? null;
  }, [userData]);

  const entornoVarIds = useMemo(() => {
    return (userData?.variables ?? [])
      .filter(v => v.area_id === 'ENTORNO')
      .map(v => v.var_id);
  }, [userData]);

  const recentEvents = useMemo(() => {
    const ids = entornoVarIds.length > 0 ? entornoVarIds : ENTORNO_VARS;
    return (userData?.events ?? [])
      .filter(e => ids.includes(e.var_id))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10);
  }, [userData, entornoVarIds]);

  const balanceStats = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recent = (userData?.events ?? []).filter(e =>
      ENTORNO_VARS.includes(e.var_id) && new Date(e.fecha).getTime() > cutoff
    );
    const order = recent.filter(e => ['ENV_ORDER', 'NATURE_VIEW', 'WALK'].includes(e.var_id)).length;
    const chaos = recent.filter(e => e.var_id === 'ENV_CHAOS').length;
    return { order, chaos, total: recent.length };
  }, [userData]);

  const logAction = (varId: string, label: string, context: string) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_ENV_${Date.now()}`,
      var_id: varId,
      intensidad: 6,
      contexto: context,
      tipo: 'Variable',
      impulsivo: false,
    });
    toast({ title: `${label} registrado`, description: 'El motor actualizará el estado en breve.' });
  };

  const scoreColor = areaScore === null ? 'text-muted-foreground'
    : areaScore >= 75 ? 'text-green-500'
    : areaScore >= 50 ? 'text-orange-500'
    : 'text-red-500';

  const streak = useAreaStreak(userData?.events, ENTORNO_VARS);

  const balanceRatio = balanceStats.total > 0
    ? Math.round((balanceStats.order / balanceStats.total) * 100)
    : null;

  if (isLoading && !userData) return <AreaPageSkeleton />;

  return (
    <div className="space-y-8 pb-16">
      <NavigationReady />

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Entorno y Orden</h1>
          {areaScore !== null && (
            <Badge variant="outline" className={cn('ml-2 font-mono font-bold', scoreColor)}>
              {areaScore}/100
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>El entorno físico modula el cortisol de fondo. Orden y naturaleza reducen la carga sostenida.</span>
          {streak > 0 && (
            <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
              🔥 {streak}d racha
            </Badge>
          )}
        </div>
      </div>

      <AreaDetailPanel areaNameMatch="entorno" />

      {/* Balance 14 días */}
      {balanceStats.total > 0 && (
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Balance últimos 14 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span className="text-green-500 font-semibold">{balanceStats.order} positivos</span>
                  <span className="text-orange-500 font-semibold">{balanceStats.chaos} caos</span>
                </div>
                <div className="h-2 bg-orange-500/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-700"
                    style={{ width: `${balanceRatio ?? 50}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                {(balanceRatio ?? 50) >= 60
                  ? <TrendingUp className="h-5 w-5 text-green-500 ml-auto" />
                  : <TrendingDown className="h-5 w-5 text-orange-500 ml-auto" />}
                <p className="text-[10px] text-muted-foreground">{balanceRatio ?? '--'}% positivo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Log */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Registrar acción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ var_id, label, icon: Icon, context, color, border, badge }) => (
              <Button
                key={var_id}
                variant="outline"
                className={cn('flex flex-col h-auto py-4 gap-2', border)}
                onClick={() => logAction(var_id, label, context)}
              >
                <Icon className={cn('h-5 w-5', color)} />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[9px] text-muted-foreground">{badge}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actividad reciente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Actividad reciente
          </CardTitle>
          <CardDescription>Últimas entradas del área Entorno.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin registros aún. Usa los botones de arriba para empezar.</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(ev => {
                const action = QUICK_ACTIONS.find(a => a.var_id === ev.var_id);
                const Icon = action?.icon ?? LayoutGrid;
                const isPositive = action?.positive !== false;
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
                        : 'border-orange-500/40 text-orange-500 bg-orange-500/20'
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

      {/* Contexto */}
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <TreePine className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Efecto en el sistema</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El entorno caótico eleva el cortisol de fondo de forma crónica — aunque no lo percibas como estrés agudo. Ordenar el espacio tiene un efecto <strong>cortisol −6 por 24h</strong>. La exposición a naturaleza añade <strong>serotonina +25h</strong>, comparable al ejercicio aeróbico.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




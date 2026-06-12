'use client';

import { useMemo, useState } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { useToast } from '@/hooks/use-toast';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import NavigationReady from '@/components/app/navigation-ready';
import { useAreaStreak } from '@/hooks/use-area-streak';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Heart, MessageCircle, Laugh, Flame, TrendingDown, AlertTriangle, ArrowRight, UserPlus } from 'lucide-react';
import Link from 'next/link';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import EventHistoryList from '@/components/app/event-history-list';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EditRelationForm from '@/components/app/data-table/forms/edit-relation-form';
const POSITIVE_ACTIONS = [
  {
    var_id: 'SOCIAL_OK', label: 'Social nutritivo', icon: Users,
    context: 'Tiempo de calidad con personas que me energizan.',
    color: 'text-blue-500', border: 'hover:border-blue-500/40',
    intensidad: 8, badge: 'Serotonina +20 · 24h',
  },
  {
    var_id: 'DEEP_CONV', label: 'Conversación profunda', icon: MessageCircle,
    context: 'Conversación auténtica, vulnerable o intelectualmente estimulante.',
    color: 'text-indigo-500', border: 'hover:border-indigo-500/40',
    intensidad: 7, badge: 'Oxitocina +20 · 24h',
  },
  {
    var_id: 'HUG', label: 'Abrazo', icon: Heart,
    context: 'Abrazo prolongado (mínimo 20 segundos).',
    color: 'text-rose-500', border: 'hover:border-rose-500/40',
    intensidad: 4, badge: 'Oxitocina +25 · 4h',
  },
  {
    var_id: 'LAUGHTER', label: 'Reír', icon: Laugh,
    context: 'Risa intensa y espontánea con otros.',
    color: 'text-amber-500', border: 'hover:border-amber-500/40',
    intensidad: 6, badge: 'Serotonina +20 · 8h',
  },
  {
    var_id: 'SEX', label: 'Intimidad', icon: Flame,
    context: 'Intimidad sexual o contacto físico profundo con pareja.',
    color: 'text-pink-500', border: 'hover:border-pink-500/40',
    intensidad: 9, badge: 'Oxitocina +40 · 24h',
  },
] as const;

const NEGATIVE_ACTIONS = [
  {
    var_id: 'ARGUMENT', label: 'Discusión', icon: AlertTriangle,
    context: 'Conflicto o discusión significativa con alguien.',
    color: 'text-orange-500', border: 'hover:border-orange-500/40',
    intensidad: 7, badge: 'Cortisol +25 · 24h',
  },
  {
    var_id: 'SOCIAL_REJECTION', label: 'Rechazo social', icon: TrendingDown,
    context: 'Rechazo, exclusión o desconexión social significativa.',
    color: 'text-red-500', border: 'hover:border-red-500/40',
    intensidad: 8, badge: 'Cortisol +35 · 72h',
  },
] as const;

const ALL_VAR_IDS = [...POSITIVE_ACTIONS, ...NEGATIVE_ACTIONS].map(a => a.var_id);
const ALL_ACTIONS = [...POSITIVE_ACTIONS, ...NEGATIVE_ACTIONS];

export default function RelationsPage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();
  const [isCreateRelationOpen, setIsCreateRelationOpen] = useState(false);

  const areaScore = useMemo(
    () => userData?.kpis.scoresByArea.find(a => a.area.toLowerCase().includes('relac'))?.score ?? null,
    [userData],
  );

  const recentEvents = useMemo(() =>
    (userData?.events ?? [])
      .filter(e => ALL_VAR_IDS.includes(e.var_id as any))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    [userData],
  );

  const streak = useAreaStreak(userData?.events, ALL_VAR_IDS as unknown as string[]);

  // Balance social de los últimos 7 días
  const balance = useMemo(() => {
    const cutoff = Date.now() - 7 * 864e5;
    const week = (userData?.events ?? []).filter(e =>
      ALL_VAR_IDS.includes(e.var_id as any) && new Date(e.fecha).getTime() > cutoff,
    );
    const pos = week.filter(e => POSITIVE_ACTIONS.some(a => a.var_id === e.var_id)).length;
    const neg = week.filter(e => NEGATIVE_ACTIONS.some(a => a.var_id === e.var_id)).length;
    return { pos, neg, total: week.length };
  }, [userData]);

  const log = (action: { var_id: string; label: string; context: string; intensidad: number; badge: string }) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_SOC_${Date.now()}`,
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

  const balanceRatio = balance.total > 0 ? Math.round((balance.pos / balance.total) * 100) : null;

  if (isLoading && !userData) return <AreaPageSkeleton />;

  return (
    <div className="space-y-8 pb-16">
      <NavigationReady />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap" data-tour="area-header">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Relaciones</h1>
            {areaScore !== null && (
              <Badge variant="outline" className={cn('font-mono font-bold', scoreColor)}>{areaScore}/100</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>Conexión social, calidad de vínculos e intimidad.</span>
            {streak > 0 && (
              <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
                🔥 {streak}d racha
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsCreateRelationOpen(true)} className="gap-1.5 shrink-0">
          <UserPlus size={14} />
          Nueva relación
        </Button>
      </div>

      <AreaDetailPanel areaNameMatch="relac" />

      {/* Factores que afectan las relaciones */}
      {userData && (userData.rpg_stats?.sueno ?? 100) < 50 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Factores que impactan tus relaciones</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/dashboard/sleep" className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                    Sueño bajo <span className="font-mono font-bold">{Math.round(userData.rpg_stats?.sueno ?? 0)}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
                <p className="text-[10px] text-muted-foreground">El sueño insuficiente reduce la tolerancia emocional y la capacidad de empatía.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance semanal */}
      {balance.total > 0 && (
        <Card className="border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Balance social — 7 días
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-blue-500 font-semibold">{balance.pos} nutritivos</span>
              <span className="text-orange-500 font-semibold">{balance.neg} conflictos</span>
            </div>
            <div className="h-2 bg-orange-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${balanceRatio ?? 50}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{balanceRatio ?? '—'}% positivo</p>
          </CardContent>
        </Card>
      )}

      {/* Positivos */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Conexión y vínculo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {POSITIVE_ACTIONS.map(action => {
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

      {/* Negativos */}
      <Card className="border-destructive/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Registro de conflictos
          </CardTitle>
          <CardDescription className="text-[11px]">
            Registrar también lo negativo mantiene el modelo calibrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {NEGATIVE_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <Button key={action.var_id} variant="outline"
                  className={cn('flex flex-col h-auto py-3 gap-1.5 opacity-80', action.border)}
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
      <EventHistoryList
        events={recentEvents}
        emptyMessage="Sin registros. La conexión social nutritiva genera serotonina y oxitocina de 24h."
        renderIcon={ev => {
          const action = ALL_ACTIONS.find(a => a.var_id === ev.var_id);
          const Icon = action?.icon ?? Users;
          return <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', action?.color ?? 'text-muted-foreground')} />;
        }}
        renderBadge={ev => {
          const isPos = POSITIVE_ACTIONS.some(a => a.var_id === ev.var_id);
          return (
            <span className={cn(
              'text-[9px] shrink-0 font-semibold px-1.5 py-0.5 rounded-full border',
              isPos
                ? 'border-blue-500/40 text-blue-500 bg-blue-500/20'
                : 'border-orange-500/40 text-orange-500 bg-orange-500/20'
            )}>
              {isPos ? '+' : '−'}{ev.intensidad}
            </span>
          );
        }}
      />

      <Dialog open={isCreateRelationOpen} onOpenChange={setIsCreateRelationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva relación</DialogTitle>
            <DialogDescription>Añade una persona a tu red de relaciones para que el modelo pueda calibrarse.</DialogDescription>
          </DialogHeader>
          <EditRelationForm closeDialog={() => setIsCreateRelationOpen(false)} />
        </DialogContent>
      </Dialog>

      <Separator />

      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Heart className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Por qué importa</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El <strong>rechazo social</strong> es el mayor drenaje de serotonina del sistema — mayor que el estrés laboral — y dura <strong>72h</strong>. Un abrazo de 20 segundos genera oxitocina suficiente para bajar el cortisol. La conexión nutritiva es el antídoto más eficiente al aislamiento crónico.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



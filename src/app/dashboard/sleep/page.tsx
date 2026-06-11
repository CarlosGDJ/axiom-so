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
import { Moon, Sun, Clock, AlertTriangle, Coffee, Bed, Minus, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import AreaDetailPanel from '@/components/app/area-detail-panel';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
const SLEEP_OPTIONS = [
  {
    var_id: 'SUEÑO_PROF',
    label: 'Profundo',
    sublabel: '8h+ sin interrupciones',
    intensidad: 10,
    color: 'border-green-500/40 hover:bg-green-500/5 hover:border-green-500',
    badge: 'text-green-500',
    icon: '😴',
  },
  {
    var_id: 'SUEÑO_PROF',
    label: 'Bueno',
    sublabel: '7h razonablemente continuo',
    intensidad: 7,
    color: 'border-emerald-500/30 hover:bg-emerald-500/5 hover:border-emerald-500/60',
    badge: 'text-emerald-500',
    icon: '🙂',
  },
  {
    var_id: 'SUEÑO_PROF',
    label: 'Regular',
    sublabel: '6h o con interrupciones',
    intensidad: 4,
    color: 'border-yellow-500/30 hover:bg-yellow-500/5 hover:border-yellow-500/60',
    badge: 'text-yellow-500',
    icon: '😐',
  },
  {
    var_id: 'SUEÑO_BAJO',
    label: 'Malo',
    sublabel: 'Menos de 6h o muy fragmentado',
    intensidad: 7,
    color: 'border-orange-500/30 hover:bg-orange-500/5 hover:border-orange-500/60',
    badge: 'text-orange-500',
    icon: '😕',
  },
  {
    var_id: 'SUEÑO_BAJO',
    label: 'Muy malo',
    sublabel: 'Menos de 5h o casi sin dormir',
    intensidad: 10,
    color: 'border-red-500/30 hover:bg-red-500/5 hover:border-red-500/60',
    badge: 'text-red-500',
    icon: '😞',
  },
] as const;

const SLEEP_VAR_IDS = ['SUEÑO_PROF', 'SUEÑO_BAJO', 'SIESTA'];

export default function SleepPage() {
  const { data: userData, isLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();
  const [sleepHours, setSleepHours] = useState(7);

  const sueno = userData?.rpg_stats?.sueno ?? 0;
  const debtScore = userData?.rpg_stats?.sleep_debt_score ?? 0;

  const debtLevel =
    debtScore >= 40 ? 'critical' :
    debtScore >= 20 ? 'risk' :
    'ok';

  const debtConfig = {
    critical: { label: 'Deuda severa', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', bar: 'bg-red-500' },
    risk:     { label: 'Deuda moderada', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', bar: 'bg-orange-500' },
    ok:       { label: 'Sin deuda', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30', bar: 'bg-green-500' },
  }[debtLevel];

  const streak = useAreaStreak(userData?.events, SLEEP_VAR_IDS);

  const recentSleep = useMemo(() => {
    return (userData?.events ?? [])
      .filter(e => SLEEP_VAR_IDS.includes(e.var_id))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 7);
  }, [userData]);

  // Detectar si ya registró sueño hoy
  const loggedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recentSleep.some(e => new Date(e.fecha) >= today && ['SUEÑO_PROF', 'SUEÑO_BAJO'].includes(e.var_id));
  }, [recentSleep]);

  const logSleep = (opt: typeof SLEEP_OPTIONS[number]) => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_SLEEP_${Date.now()}`,
      var_id: opt.var_id,
      intensidad: opt.intensidad,
      contexto: `Sueño ${opt.label.toLowerCase()} — ${sleepHours}h — ${opt.sublabel}`,
      tipo: 'Variable',
      impulsivo: false,
      duracion_horas: sleepHours,
    });
    toast({
      title: `Sueño registrado: ${opt.label} (${sleepHours}h)`,
      description: opt.var_id === 'SUEÑO_PROF'
        ? 'Serotonina +20, Energía +35 por 12h.'
        : 'Cortisol +30, Energía −35 por 12h.',
    });
  };

  const logSiesta = () => {
    if (!uid) return;
    addDocumentNonBlocking('events', {
      fecha: new Date().toISOString(),
      evento_id: `EVT_SIESTA_${Date.now()}`,
      var_id: 'SIESTA',
      intensidad: 6,
      contexto: 'Siesta corta de recuperación (20-30 min).',
      tipo: 'Variable',
      impulsivo: false,
    });
    toast({ title: 'Siesta registrada', description: 'Energía +20 por 4h.' });
  };

  const suenoColor =
    sueno >= 70 ? 'text-green-500' :
    sueno >= 45 ? 'text-orange-500' :
    'text-red-500';

  if (isLoading && !userData) return <AreaPageSkeleton />;

  return (
    <div className="space-y-8 pb-16">
      <NavigationReady />

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Sueño</h1>
          <Badge variant="outline" className={cn('ml-2 font-mono font-bold', suenoColor)}>
            {Math.round(sueno)}/100
          </Badge>
          {debtScore > 10 && (
            <Badge variant="outline" className={cn('font-mono text-[10px]', debtConfig.color)}>
              Deuda {Math.round(debtScore)}%
            </Badge>
          )}
          {streak > 0 && (
            <Badge variant="outline" className="font-mono text-[10px] text-amber-500 border-amber-500/40">
              🔥 {streak}d racha
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          La variable de mayor impacto del sistema. Afecta al 100% del resto de biomarcadores.
        </p>
      </div>

      <AreaDetailPanel areaNameMatch="sueño" />

      {/* Áreas afectadas cuando el sueño está bajo */}
      {sueno < 50 && userData && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Impacto en otras áreas</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Salud física', href: '/dashboard/physical', key: 'físic' },
                    { label: 'Relaciones', href: '/dashboard/relations', key: 'relac' },
                    { label: 'Estudios', href: '/dashboard/studies', key: 'estudio' },
                  ].map(({ label, href, key }) => {
                    const s = userData.kpis?.scoresByArea.find(a => a.area.toLowerCase().includes(key))?.score;
                    return (
                      <Link key={href} href={href} className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:underline">
                        {label} {s !== undefined && <span className="font-mono font-bold">{s}</span>}
                        <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deuda de sueño */}
      {debtScore > 5 && (
        <Card className={cn('border', debtConfig.bg)}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', debtConfig.color)} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className={cn('text-xs font-bold uppercase tracking-widest', debtConfig.color)}>
                    {debtConfig.label}
                  </p>
                  <span className={cn('text-xs font-mono font-bold', debtConfig.color)}>
                    {Math.round(debtScore)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', debtConfig.bar)}
                    style={{ width: `${Math.min(debtScore, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {debtLevel === 'critical'
                    ? 'Rendimiento cognitivo y emocional severamente comprometidos. La deuda acumulada requiere varias noches de sueño reparador para compensarse.'
                    : 'Acumulación de privación moderada. Un par de noches de buen sueño lo compensan.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log de anoche */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Bed className="h-3.5 w-3.5" />
            ¿Cómo dormiste anoche?
          </CardTitle>
          {loggedToday && (
            <CardDescription className="text-[11px] text-green-500">
              ✓ Ya registraste el sueño de hoy. Puedes actualizar si fue incorrecto.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de horas */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs font-semibold">Horas dormidas</p>
              <p className="text-[10px] text-muted-foreground">Tiempo total de sueño</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSleepHours(h => Math.max(3, parseFloat((h - 0.5).toFixed(1))))}
                className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xl font-black tabular-nums w-12 text-center">{sleepHours}h</span>
              <button
                onClick={() => setSleepHours(h => Math.min(12, parseFloat((h + 0.5).toFixed(1))))}
                className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {SLEEP_OPTIONS.map((opt) => (
              <button
                key={`${opt.var_id}-${opt.intensidad}`}
                onClick={() => logSleep(opt)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all active:scale-95 text-center',
                  opt.color
                )}
              >
                <span className="text-2xl leading-none">{opt.icon}</span>
                <span className={cn('text-xs font-bold', opt.badge)}>{opt.label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight">{opt.sublabel}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Siesta */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Sun className="h-3.5 w-3.5" />
            Recuperación diurna
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:border-primary/40"
            onClick={logSiesta}
          >
            <Coffee className="h-4 w-4 text-amber-500" />
            Siesta corta (20–30 min)
            <Badge variant="secondary" className="text-[9px] ml-1">+Energía 4h</Badge>
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Las siestas de 20-30 min restauran la energía sin entrar en sueño profundo (no genera inercia).
          </p>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" /> Historial reciente
          </CardTitle>
          <CardDescription>Últimas entradas de sueño registradas.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSleep.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin registros aún. Empieza registrando cómo dormiste anoche.
            </p>
          ) : (
            <div className="space-y-2">
              {recentSleep.map(ev => {
                const isPositive = ev.var_id === 'SUEÑO_PROF';
                const isSiesta = ev.var_id === 'SIESTA';
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <span className="text-base leading-none">
                      {isSiesta ? '☕' : isPositive ? '😴' : '😕'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ev.contexto || ev.var_id}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(ev.fecha), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[9px] shrink-0 font-semibold px-1.5 py-0.5 rounded-full border',
                      isPositive ? 'border-green-500/40 text-green-500 bg-green-500/20' :
                      isSiesta ? 'border-amber-500/40 text-amber-500 bg-amber-500/20' :
                      'border-red-500/40 text-red-500 bg-red-500/20'
                    )}>
                      {isSiesta ? 'siesta' : isPositive ? 'bueno' : 'malo'}
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
            <Moon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Impacto en el sistema</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
                <span>Cortisol (sueño prof.) <strong className="text-green-500">−30</strong> por 12h</span>
                <span>Cortisol (sueño malo) <strong className="text-red-500">+30</strong> por 12h</span>
                <span>Energía (sueño prof.) <strong className="text-green-500">+35</strong> por 12h</span>
                <span>Energía (sueño malo) <strong className="text-red-500">−35</strong> por 12h</span>
                <span>Serotonina (sueño prof.) <strong className="text-green-500">+20</strong> por 12h</span>
                <span>Foco (sueño prof.) <strong className="text-green-500">+30</strong> por 12h</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


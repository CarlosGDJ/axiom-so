'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Terminal, Loader2, Zap, CheckCircle2, Circle, Plus } from 'lucide-react';
import { getAIMorningBriefing } from '@/lib/actions';
import type { UserData } from '@/lib/types';
import type { MorningBriefingOutput } from '@/ai/flows/generate-morning-briefing';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, addDocumentNonBlocking, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface MorningBriefingProps {
  userData: UserData;
}

function getTimeContext(hour: number): { label: string; description: string } {
  if (hour >= 5 && hour < 12)  return { label: 'Directiva de mañana',  description: 'Plan táctico para las próximas horas.' };
  if (hour >= 12 && hour < 18) return { label: 'Revisión de mitad',    description: 'Ajuste de rumbo para el resto del día.' };
  return                               { label: 'Cierre del día',       description: 'Protocolo de recuperación y preparación nocturna.' };
}

export default function MorningBriefing({ userData }: MorningBriefingProps) {
  const [briefing, setBriefing]     = useState<MorningBriefingOutput | null>(null);
  const [loading, setLoading]       = useState(false);
  const [hasLoaded, setHasLoaded]   = useState(false);
  const [checked, setChecked]       = useState<boolean[]>([]);
  const [logged, setLogged]         = useState<boolean[]>([]);

  const { user }    = useUser();
  const firestore   = useFirestore();
  const { toast }   = useToast();
  const hour        = new Date().getHours();
  const timeCtx     = getTimeContext(hour);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const briefingDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, `users/${user.uid}/dailyBriefing`, today) : null),
    [user, firestore, today],
  );
  const { data: cachedBriefing } = useDoc<MorningBriefingOutput>(briefingDocRef);

  useEffect(() => {
    if (cachedBriefing && !hasLoaded) {
      setBriefing(cachedBriefing);
      setHasLoaded(true);
      setChecked(new Array(cachedBriefing.tacticalSteps?.length ?? 0).fill(false));
      setLogged(new Array(cachedBriefing.tacticalSteps?.length ?? 0).fill(false));
    }
  }, [cachedBriefing, hasLoaded]);

  const fetchBriefing = async () => {
    setLoading(true);
    setChecked([]);
    setLogged([]);
    try {
      const result = await getAIMorningBriefing({
        playerProfile: JSON.stringify(userData.playerProfile),
        currentStats:  JSON.stringify(userData.rpg_stats),
        recentEvents:  JSON.stringify(userData.events.slice(0, 10)),
        timeOfDay:     hour.toString(),
      });
      setBriefing(result);
      setHasLoaded(true);
      setChecked(new Array(result.tacticalSteps.length).fill(false));
      setLogged(new Array(result.tacticalSteps.length).fill(false));
      if (user && firestore) {
        setDoc(doc(firestore, `users/${user.uid}/dailyBriefing`, today), result).catch(() => {});
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (i: number) =>
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));

  const logStep = (i: number, step: string) => {
    if (!user || !firestore || logged[i]) return;
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/events`), {
      fecha: new Date().toISOString(),
      evento_id: `EVT_DIRECTIVE_${Date.now()}`,
      var_id: 'MEDITATION',
      intensidad: 5,
      contexto: `Directiva: ${step.slice(0, 120)}`,
      tipo: 'Protocolo',
      impulsivo: false,
    });
    setLogged(prev => prev.map((v, idx) => idx === i ? true : v));
    setChecked(prev => prev.map((v, idx) => idx === i ? true : v));
    toast({ title: 'Paso registrado', description: 'Añadido como protocolo al motor.' });
  };

  const completedCount = checked.filter(Boolean).length;

  /* ── Estado inicial ── */
  if (!hasLoaded && !loading) {
    return (
      <Card className="border border-primary/10 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Terminal className="h-4 w-4 text-primary" />
            {timeCtx.label}
          </CardTitle>
          <CardDescription>{timeCtx.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchBriefing} size="sm" className="gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Generar Directiva
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Cargando ── */
  if (loading) {
    return (
      <Card className="border border-primary/10 opacity-70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Generando directiva…
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </CardContent>
      </Card>
    );
  }

  /* ── Directiva cargada ── */
  return (
    <Card className="border-2 border-primary/20 shadow-xl shadow-primary/5 overflow-hidden">
      <div className="bg-primary text-primary-foreground px-4 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em]">
        <span className="flex items-center gap-2">
          <Zap size={11} className="animate-pulse" /> {timeCtx.label}
        </span>
        {briefing && (
          <span className="opacity-70">
            {completedCount}/{briefing.tacticalSteps.length} completados
          </span>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black italic tracking-tighter uppercase leading-tight">
              {briefing?.directive}
            </CardTitle>
            <CardDescription className="text-foreground/70 font-medium text-sm">
              {briefing?.diagnosis}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchBriefing} className="h-7 text-[10px] shrink-0 opacity-50 hover:opacity-100">
            Recalibrar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {briefing?.tacticalSteps.map((step, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border transition-colors',
              checked[i]
                ? 'bg-green-500/5 border-green-500/20 opacity-60'
                : 'bg-muted/40 border-border/50 hover:border-primary/20',
            )}
          >
            {/* Check */}
            <button onClick={() => toggleCheck(i)} className="mt-0.5 shrink-0">
              {checked[i]
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : <Circle className="h-4 w-4 text-muted-foreground" />}
            </button>

            {/* Texto del paso */}
            <p className={cn('text-sm flex-1 leading-snug', checked[i] && 'line-through text-muted-foreground')}>
              {step}
            </p>

            {/* Botón log */}
            <button
              onClick={() => logStep(i, step)}
              disabled={logged[i]}
              className={cn(
                'shrink-0 flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded border transition-colors',
                logged[i]
                  ? 'text-green-500 border-green-500/30 bg-green-500/10 cursor-default'
                  : 'text-muted-foreground border-border hover:text-primary hover:border-primary/40',
              )}
            >
              <Plus className="h-2.5 w-2.5" />
              {logged[i] ? 'Logueado' : 'Log'}
            </button>
          </div>
        ))}

        {/* Resultado esperado */}
        {briefing?.expectedOutcome && (
          <div className="bg-primary/5 px-3 py-2 rounded-lg border border-primary/10 flex items-start gap-2 mt-1">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground italic">
              <span className="font-bold text-primary not-italic">Resultado: </span>
              {briefing.expectedOutcome}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

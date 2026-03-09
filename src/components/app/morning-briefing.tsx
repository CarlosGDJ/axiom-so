'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Terminal, ShieldAlert, CheckCircle2, ChevronRight, Loader2, Zap } from 'lucide-react';
import { getAIMorningBriefing } from '@/lib/actions';
import type { UserData } from '@/lib/types';
import type { MorningBriefingOutput } from '@/ai/flows/generate-morning-briefing';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MorningBriefingProps {
  userData: UserData;
}

export default function MorningBriefing({ userData }: MorningBriefingProps) {
  const [briefing, setBriefing] = useState<MorningBriefingOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchBriefing = async () => {
    setLoading(true);
    try {
      const result = await getAIMorningBriefing({
        playerProfile: JSON.stringify(userData.playerProfile),
        currentStats: JSON.stringify(userData.rpg_stats),
        recentEvents: JSON.stringify(userData.events.slice(0, 10)),
        timeOfDay: new Date().getHours().toString(),
      });
      setBriefing(result);
      setHasLoaded(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!hasLoaded && !loading) {
    /*
      Bloque comentado bajo peticion:
      CTA "Recibir Directiva del Dia" (card inicial clicable)
    */
    return null;
  }

  return (
    <Card className={cn(
        "border-2 overflow-hidden transition-all duration-500",
        loading ? "opacity-70" : "border-primary/20 shadow-xl shadow-primary/5"
    )}>
      <div className="bg-primary text-white px-4 py-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
        <Zap size={12} className="animate-pulse" /> Sincronización de Núcleo Axiom v1.0
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2 text-2xl font-black italic tracking-tighter uppercase">
            {loading ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-5 w-5" /> Generando Informe...
                </div>
            ) : briefing?.directive}
          </CardTitle>
          {!loading && <Button variant="ghost" size="sm" onClick={fetchBriefing} className="h-7 text-[10px] font-bold opacity-50 hover:opacity-100">RE-CALIBRAR</Button>}
        </div>
        {loading ? <Skeleton className="h-4 w-3/4 mt-2" /> : <CardDescription className="text-foreground/80 font-medium">{briefing?.diagnosis}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)
          ) : (
            briefing?.tacticalSteps.map((step, index) => (
              <div key={index} className="bg-muted/50 p-4 rounded-xl border border-border/50 relative overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="absolute -top-2 -right-2 text-primary/10 font-black text-4xl group-hover:text-primary/20 transition-colors">{index + 1}</div>
                <div className="flex flex-col h-full justify-between">
                    <p className="text-sm font-bold leading-tight relative z-10">{step}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                        <CheckCircle2 size={12} /> Táctica {index + 1}
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
        {!loading && briefing && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-full"><Sparkles className="h-4 w-4 text-primary" /></div>
                <div className="text-xs italic text-muted-foreground">
                    <span className="font-bold text-primary not-italic">Resultado Esperado:</span> {briefing.expectedOutcome}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}


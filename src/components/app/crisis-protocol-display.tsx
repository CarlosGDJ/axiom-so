
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronLeft, Loader2, ShieldAlert, Zap, ArrowRight, Clock, TrendingUp, RefreshCcw } from 'lucide-react';
import { getAIProtocolRecommendations } from '@/lib/actions';
import type { UserData } from '@/lib/types';
import type { GenerateProtocolRecommendationsOutput } from '@/ai/flows/generate-protocol-recommendations';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CrisisProtocolDisplayProps {
  userData: UserData;
  onExit: () => void;
}

export default function CrisisProtocolDisplay({ userData, onExit }: CrisisProtocolDisplayProps) {
  const [protocol, setProtocol] = useState<GenerateProtocolRecommendationsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const fetchProtocol = useCallback(async () => {
    if (!userData) return;
    
    setLoading(true);
    try {
      const result = await getAIProtocolRecommendations({
          overallState: userData.overallState,
          dominantVariables: JSON.stringify(userData.dominantVariables),
          areaScores: JSON.stringify(userData.kpis.scoresByArea),
          tolerances: JSON.stringify({
              stress: userData.playerProfile?.sensitivity_stress,
              dopamine: userData.playerProfile?.sensitivity_dopamine,
              sleep: userData.playerProfile?.sensitivity_sleep,
          })
      });
      setProtocol(result);
    } catch (error) {
      console.error("Error fetching AI protocol:", error);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchProtocol();
  }, [fetchProtocol]);

  const handleStepToggle = (index: number) => {
    if (isSubmitting) return;
    setCompletedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleFinishProtocol = () => {
    if (!user || !firestore || !protocol) return;

    setIsSubmitting(true);
    const eventCollectionRef = collection(firestore, `users/${user.uid}/events`);
    const allStepsCompleted = completedSteps.length >= (protocol.recommendations?.length || 0);
    
    const intensity = allStepsCompleted ? 5 : 2;
    const impactScore = protocol.resolutionPotential || 15;

    addDocumentNonBlocking(eventCollectionRef, {
        fecha: new Date().toISOString(),
        evento_id: `EVT_PROT_AI_${Date.now()}`,
        var_id: 'AI_CRISIS_RESOLVE',
        intensidad: intensity,
        contexto: `Protocolo '${protocol.protocolName}'. Resolución: +${impactScore} pts.`,
        tipo: 'Protocolo',
    });
    
    toast({
      title: allStepsCompleted ? '¡Protocolo Finalizado!' : 'Progreso Registrado',
      description: allStepsCompleted 
        ? `Inyectando +${impactScore} de estabilidad. Reiniciando biomarcadores...` 
        : 'Cualquier paso cuenta. El sistema se recalculará en breve.',
    });
    
    setTimeout(() => {
        onExit();
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center p-6 text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-destructive" />
        <div className="max-w-md">
          <h3 className="text-xl font-bold">Calculando tiempos de recuperación...</h3>
          <p className="text-muted-foreground mt-2">Axiom está analizando tus tolerancias individuales para diseñar el protocolo de impacto máximo.</p>
        </div>
      </div>
    );
  }

  if (!protocol || !protocol.recommendations) {
    return (
      <div className="text-center p-12 bg-card rounded-xl border-2 border-dashed max-w-md mx-auto">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold">No pudimos conectar con el Asesor IA</h3>
        <p className="text-muted-foreground mt-2 mb-6 text-sm">Esto puede deberse a un problema temporal de conexión. Intenta reintentar o vuelve al panel.</p>
        <div className="flex flex-col gap-2">
            <Button onClick={fetchProtocol} variant="default"><RefreshCcw className="mr-2 h-4 w-4" /> Reintentar Generación</Button>
            <Button onClick={onExit} variant="outline"><ChevronLeft className="mr-2 h-4 w-4" /> Volver al Panel</Button>
        </div>
      </div>
    );
  }

  const totalSteps = protocol.recommendations.length;
  const allStepsCompleted = totalSteps > 0 && completedSteps.length === totalSteps;
  const progressPercent = totalSteps > 0 ? (completedSteps.length / totalSteps) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit} disabled={isSubmitting}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Abortar Rescate
        </Button>
        <Badge variant="destructive" className="px-3 py-1 uppercase tracking-tighter font-bold">Rescate Basado en IA</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                      <Clock size={14} /> Tiempo de Recuperación
                  </div>
              </CardHeader>
              <CardContent>
                  <p className="text-2xl font-bold">~{protocol.estimatedRecoveryHours} Horas</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Tiempo estimado para que tus biomarcadores vuelvan a la zona de seguridad tras completar los pasos.</p>
              </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest">
                      <TrendingUp size={14} /> Potencial de Resolución
                  </div>
              </CardHeader>
              <CardContent>
                  <p className="text-2xl font-bold">+{protocol.resolutionPotential} Puntos</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Impacto directo del protocolo en tus niveles de estabilidad mental y emocional.</p>
              </CardContent>
          </Card>
      </div>

      <header className="space-y-3 text-center">
        <div className="bg-destructive/10 text-destructive inline-flex p-4 rounded-full mb-2">
            <Zap className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">{protocol.protocolName}</h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-tight">{protocol.rationale}</p>
        
        <div className="max-w-xs mx-auto pt-4 space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span>Progreso</span>
                <span>{completedSteps.length}/{totalSteps}</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                    className="h-full bg-primary transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
      </header>

      <div className="grid gap-4">
        {protocol.recommendations.map((step, index) => (
          <Card 
            key={index} 
            className={cn(
                "cursor-pointer transition-all duration-300 border-2",
                completedSteps.includes(index) ? "bg-primary/5 border-primary/50 opacity-70 scale-[0.98]" : "hover:border-destructive/50 hover:bg-muted/30",
                isSubmitting && "pointer-events-none"
            )}
            onClick={() => handleStepToggle(index)}
          >
            <CardContent className="p-6 flex items-center gap-5">
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center shrink-0 border-2 text-lg transition-colors",
                completedSteps.includes(index) ? "bg-primary border-primary text-white" : "border-muted-foreground/20 text-muted-foreground"
              )}>
                {completedSteps.includes(index) ? <CheckCircle2 className="h-7 w-7" /> : <span className="font-bold">{index + 1}</span>}
              </div>
              <p className={cn(
                "text-xl font-medium leading-tight",
                completedSteps.includes(index) && "line-through text-muted-foreground"
              )}>
                {step}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="pt-6 pb-12">
        <Button 
            className={cn(
                "w-full h-16 text-xl font-bold shadow-xl transition-all active:scale-95",
                allStepsCompleted ? "bg-primary hover:bg-primary/90" : "bg-secondary text-secondary-foreground",
                isSubmitting && "opacity-50"
            )}
            size="lg"
            onClick={handleFinishProtocol}
            disabled={isSubmitting}
        >
            {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (allStepsCompleted ? 'Finalizar y Restaurar Sistema' : 'Marcar Pasos para Continuar')}
            {!isSubmitting && <ArrowRight className="ml-2 h-6 w-6" />}
        </Button>
      </footer>
    </div>
  );
}

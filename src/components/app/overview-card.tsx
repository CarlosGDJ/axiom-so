'use client';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldX, Zap, Sparkles, Info, Clock } from 'lucide-react';
import type { OverallState, UserData } from '@/lib/types';
import { Button } from '../ui/button';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const stateConfig = {
  OK: {
    label: 'ESTABLE',
    badgeClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
    icon: <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />,
    description: 'Sistema regulado y funcional. Los biomarcadores están en equilibrio.',
  },
  RIESGO: {
    label: 'RIESGO',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800',
    icon: <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    description: 'Desviación detectada. Se recomienda intervención para evitar colapso.',
  },
  CRITICO: {
    label: 'CRÍTICO',
    badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
    icon: <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400" />,
    description: 'Sistema en protección. Ejecuta protocolos de rescate inmediatamente.',
  },
};

interface OverviewCardProps {
    overallState: OverallState;
    dominantVariables: UserData['dominantVariables'];
    onActivateProtocol: () => void;
    userData: UserData;
}

export default function OverviewCard({ overallState, dominantVariables = [], onActivateProtocol, userData }: OverviewCardProps) {
  const config = stateConfig[overallState || 'OK'];
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleQuickReset = () => {
    if (!user || !firestore) return;
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/events`), {
        fecha: new Date().toISOString(),
        evento_id: `EVT_PROT_${Date.now()}`,
        var_id: 'P_RESET_5', 
        intensidad: 5,
        contexto: 'Protocolo de reseteo rápido ejecutado.',
        tipo: 'Protocolo',
    });
    toast({ title: 'Protocolo Registrado', description: 'Se ha registrado tu reseteo de 5 minutos.' });
  };

  return (
    <Card className="h-full flex flex-col shadow-sm border-primary/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Estado de Sistema</CardTitle>
          <Badge className={cn('py-1 px-3 rounded-full flex items-center gap-1.5', config.badgeClass)}>
            {config.icon}
            <span className="font-bold">{config.label}</span>
          </Badge>
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-6">
        {dominantVariables.length > 0 && (
            <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} className="text-primary" /> Drenajes Activos (Últimas 24h)
                </h4>
                <div className="flex flex-wrap gap-2">
                    <TooltipProvider>
                        {dominantVariables.map((v, idx) => (
                            <Tooltip key={`${v.var_id}-${idx}`}>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="px-2 py-0.5 text-[10px] cursor-help bg-muted/50 hover:bg-muted">
                                        {v.nombre || v.var_id}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="space-y-1">
                                        <p className="font-bold">Impacto: {v.total_impact.toFixed(1)}</p>
                                        <p className="text-[10px]">Restan ~{v.hours_remaining}h de efecto pico.</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </div>
            </div>
        )}

        <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Puntuación Global</span>
                <span className="text-2xl font-black italic">{userData.rpg_stats?.player_score || 0}<span className="text-xs not-italic text-muted-foreground ml-1">/100</span></span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${userData.rpg_stats?.player_score || 0}%` }} />
            </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex flex-col gap-2">
        {overallState === 'CRITICO' ? (
            <Button variant="destructive" className="w-full font-bold" onClick={onActivateProtocol}>
                <Sparkles className="mr-2 h-4 w-4" />
                ACTIVAR PROTOCOLO IA
            </Button>
        ) : (
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleQuickReset}>
                <Zap className="mr-2 h-3 w-3" /> Reseteo Rápido (5 min)
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}


'use client';

import { Milestone, Skill, System } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Plus, Calendar, Clock, SkipForward, Target, Star, Milestone as MilestoneIcon, Zap } from 'lucide-react';
import { format, differenceInDays, parseISO, isAfter, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-session-user';
import { updateDocumentNonBlocking } from '@/lib/api-writes';
interface MilestoneTrackerProps {
  milestones: Milestone[];
  skills: Skill[];
  systems: System[];
  streakMultiplier?: number;
}

export default function MilestoneTracker({ milestones, skills, systems, streakMultiplier = 1 }: MilestoneTrackerProps) {
  const baseXpLabel = (base: number) =>
    streakMultiplier > 1
      ? `+${Math.round(base * streakMultiplier)} XP ×${streakMultiplier}`
      : `+${base} XP`;
  const { user, uid } = useUser();  const { toast } = useToast();

  const handleUpdateProgress = (milestone: Milestone) => {
    if (!uid) return;

    const skill = skills.find(s => s.habilidad_id === milestone.skill_id);
    
    let xpGained = 0;
    let updateData: Partial<Milestone> = {};

    if (milestone.milestone_type === 'recurring') {
        const newProgress = (milestone.progress_count || 0) + 1;
        const isCompleted = milestone.target_count && newProgress >= milestone.target_count;

        xpGained = 10;
        updateData = { progress_count: newProgress };

        if (isCompleted) {
            updateData.estado = 'Completado';
            updateData.fecha_completado = new Date().toISOString();
            xpGained += 100;
        }
    } else {
        updateData = { estado: 'Completado', fecha_completado: new Date().toISOString() };
        xpGained = 50;
    }

    const effectiveXP = Math.round(xpGained * streakMultiplier);
    const boosted = streakMultiplier > 1;

    if (milestone.milestone_type === 'recurring') {
        const isCompleted = milestone.target_count && ((milestone.progress_count || 0) + 1) >= milestone.target_count;
        if (isCompleted) {
            toast({ title: "¡Hito Completado!", description: `"${milestone.nombre}" alcanzado. +${effectiveXP} XP${boosted ? ` (×${streakMultiplier} racha)` : ''}`});
        } else {
            toast({ title: "Progreso Registrado", description: `+${effectiveXP} XP${boosted ? ` (×${streakMultiplier} racha)` : ''}`});
        }
    } else {
        toast({ title: "¡Hito Completado!", description: `"${milestone.nombre}" completado. +${effectiveXP} XP${boosted ? ` (×${streakMultiplier} racha)` : ''}`});
    }

    // Update Milestone
    updateDocumentNonBlocking('milestones', milestone.id, updateData);

    // Update Skill XP and Level
    if (skill) {
        const newXP = (skill.xp || 0) + effectiveXP;
        const xpNeeded = skill.nivel_actual * 200;

        if (newXP >= xpNeeded) {
            const newLevel = skill.nivel_actual + 1;
            updateDocumentNonBlocking('skills', skill.id, {
                xp: newXP - xpNeeded,
                nivel_actual: newLevel
            });
            toast({
                title: "¡SUBIDA DE NIVEL!",
                description: `Tu habilidad "${skill.nombre}" ha subido al nivel ${newLevel}.`,
                variant: "default"
            });
        } else {
            updateDocumentNonBlocking('skills', skill.id, { xp: newXP });
        }
    }
  };

  const handleOmit = (milestone: Milestone) => {
    if (!uid) return;
        updateDocumentNonBlocking('milestones', milestone.id, { estado: 'Omitido' });
    toast({ title: "Hito Omitido", description: `Has quitado "${milestone.nombre}" de tus objetivos activos.` });
  };

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30 text-center">
        <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Sin hitos activos</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Crea un nuevo sistema para generar hitos y objetivos automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {milestones.map((milestone) => {
        const skill = skills.find(s => s.habilidad_id === milestone.skill_id);
        const system = systems.find(s => s.sistema_id === milestone.system_id);
        
        const isRecurring = milestone.milestone_type === 'recurring';
        const progress = isRecurring && milestone.target_count 
            ? ((milestone.progress_count || 0) / milestone.target_count) * 100 
            : 0;

        let daysRemaining = null;
        let isOverdue = false;
        if (milestone.fecha_objetivo) {
            const targetDate = parseISO(milestone.fecha_objetivo);
            daysRemaining = differenceInDays(targetDate, startOfToday());
            isOverdue = daysRemaining < 0;
        }

        return (
          <Card key={milestone.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="p-5 pb-2">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                    {isRecurring ? 'Recurrente' : 'Hito Único'}
                </Badge>
                {daysRemaining !== null && (
                    <div className={cn(
                        "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
                        isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    )}>
                        <Clock className="h-3 w-3" />
                        {isOverdue ? `Atrasado ${Math.abs(daysRemaining)}d` : `${daysRemaining} días restantes`}
                    </div>
                )}
              </div>
              <CardTitle className="text-lg leading-tight">{milestone.nombre}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {skill && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px]">
                        <Star className="h-3 w-3 mr-1" />
                        {skill.nombre}
                    </Badge>
                )}
                {system && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent-foreground border-none text-[10px]">
                        <MilestoneIcon className="h-3 w-3 mr-1" />
                        Sistema
                    </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-5 pt-4 flex-grow space-y-4">
              {isRecurring ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Progreso</span>
                    <span>{milestone.progress_count || 0} / {milestone.target_count || '∞'}</span>
                  </div>
                  {milestone.target_count && (
                    <Progress value={progress} className="h-2" />
                  )}
                </div>
              ) : (
                <div className="py-4 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed text-xs text-muted-foreground font-medium uppercase tracking-widest gap-2">
                    <Zap size={14} className="text-yellow-500" /> {baseXpLabel(50)} al completar
                </div>
              )}
              
              {milestone.notas && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">"{milestone.notas}"</p>
              )}
            </CardContent>

            <CardFooter className="p-5 pt-0 flex gap-2">
              <Button 
                className="flex-1" 
                variant={isRecurring ? "default" : "outline"}
                size="sm"
                onClick={() => handleUpdateProgress(milestone)}
              >
                {isRecurring ? (
                    <><Plus className="h-4 w-4 mr-2" /> Avanzar ({baseXpLabel(10)})</>
                ) : (
                    <><Check className="h-4 w-4 mr-2" /> Completar ({baseXpLabel(50)})</>
                )}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => handleOmit(milestone)}>
                            <SkipForward className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Omitir hito</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

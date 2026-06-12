
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Milestone, Skill, System } from '@/lib/types';
import { Calendar, Check, Plus, Trash2, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-session-user';
import { updateDocumentNonBlocking } from '@/lib/api-writes';
const MilestoneProgress = ({ row, skills }: { row: { original: Milestone }, skills: Skill[] }) => {
    const milestone = row.original;
    const { user, uid } = useUser();    const { toast } = useToast();

    const handleUpdateProgress = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!uid) return;

        const skill = skills.find(s => s.habilidad_id === milestone.skill_id);
        
        let xpGained = 0;
        let milestoneUpdate: Partial<Milestone> = {};

        if (milestone.milestone_type === 'recurring') {
            const newProgress = (milestone.progress_count || 0) + 1;
            const isCompleted = milestone.target_count && newProgress >= milestone.target_count;
            
            xpGained = 10; // 10 XP per rep
            milestoneUpdate = { progress_count: newProgress };

            if (isCompleted) {
                milestoneUpdate.estado = 'Completado';
                milestoneUpdate.fecha_completado = new Date().toISOString();
                xpGained += 100; // Bonus for completion
                toast({ title: "¡Hito Completado!", description: `Has completado "${milestone.nombre}". +110 XP`});
            } else {
                toast({ title: "Progreso Registrado", description: `+10 XP para tu habilidad.`});
            }
        } else { // single
            milestoneUpdate = { estado: 'Completado', fecha_completado: new Date().toISOString() };
            xpGained = 50; // 50 XP for single milestone
            toast({ title: "¡Hito Completado!", description: `Has completado "${milestone.nombre}". +50 XP`});
        }

        // Update Milestone
        updateDocumentNonBlocking('milestones', milestone.id, milestoneUpdate);

        // Update Skill XP and Level
        if (skill) {
            const newXP = (skill.xp || 0) + xpGained;
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
    
    if (milestone.estado === 'Completado' || milestone.estado === 'Omitido') {
        const isCompleted = milestone.estado === 'Completado';
        return (
            <div className={cn("flex items-center gap-2 font-medium", isCompleted ? "text-green-600" : "text-muted-foreground")}>
                {isCompleted ? <Check className="h-4 w-4" /> : null}
                <span>{milestone.estado}</span>
            </div>
        );
    }

    if (milestone.milestone_type === 'recurring') {
        if (milestone.target_count && milestone.target_count > 0) {
            const progress = (((milestone.progress_count || 0) / milestone.target_count) * 100);
            return (
                <div className="flex items-center gap-2">
                    <Progress value={progress} className="w-[100px] h-2" />
                    <span className="text-xs font-medium text-muted-foreground min-w-[40px]">
                        {milestone.progress_count || 0}/{milestone.target_count}
                    </span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={handleUpdateProgress}>
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            );
        } else {
            return (
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                        {milestone.progress_count || 0} reps
                    </span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={handleUpdateProgress}>
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            );
        }
    }

    if (milestone.milestone_type === 'single') {
        return (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleUpdateProgress}>
                <Check className="mr-1 h-3 w-3" />
                Completar
            </Button>
        );
    }

    return null;
}


export const getMilestoneColumns = (skills: Skill[], systems: System[]): ColumnDef<Milestone>[] => [
  {
    accessorKey: 'nombre',
    header: 'Hito',
    cell: ({ row }) => <div className="font-medium text-sm">{row.original.nombre}</div>,
  },
  {
    id: 'progress',
    header: 'Progreso',
    cell: ({ row }) => <MilestoneProgress row={row} skills={skills} />,
  },
  {
    id: 'related_to',
    header: 'Contexto',
    cell: ({ row }) => {
      const milestone = row.original;
      if (milestone.skill_id) {
        const skill = skills.find(s => s.habilidad_id === milestone.skill_id);
        return <Badge variant="outline" className="text-[10px] font-normal">{skill ? skill.nombre : milestone.skill_id}</Badge>;
      }
      return <span className="text-muted-foreground text-xs">-</span>;
    }
  },
  {
    accessorKey: 'fecha_objetivo',
    header: 'Límite',
    cell: ({ row }) => {
        const fecha = row.getValue('fecha_objetivo');
        return fecha ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(fecha as string), "d MMM", { locale: es })}
            </div>
        ) : <span className="text-muted-foreground text-xs">-</span>
    },
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => {
      const estado = row.getValue('estado') as Milestone['estado'];
      const colors = {
        'Pendiente': 'bg-blue-50 text-blue-700 border-blue-100',
        'Completado': 'bg-green-50 text-green-700 border-green-100',
        'Omitido': 'bg-red-50 text-red-700 border-red-100',
      }
      return <Badge variant="outline" className={cn("text-[10px] py-0", colors[estado])}>{estado}</Badge>;
    }
  },
];

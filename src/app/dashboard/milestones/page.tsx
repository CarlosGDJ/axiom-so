'use client';
import { useUserData } from '@/hooks/use-user-data';
import { getMilestoneColumns } from '@/components/app/data-table/columns-milestone';
import { DataTable } from '@/components/app/data-table/data-table';
import { useMemo, useState } from 'react';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import HabitChecklist from '@/components/app/habit-checklist';
import MilestoneTracker from '@/components/app/milestone-tracker';
import ScoreCalendarHeatmap from '@/components/app/score-calendar-heatmap';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, History, CalendarDays, Repeat, PlusCircle, Star, Layers } from 'lucide-react';
import NavigationReady from '@/components/app/navigation-ready';
import { computeStreakMultiplier } from '@/lib/progression';
import EditHabitForm from '@/components/app/data-table/forms/edit-habit-form';
import EditMilestoneForm from '@/components/app/data-table/forms/edit-milestone-form';
import EditSkillForm from '@/components/app/data-table/forms/edit-skill-form';
import EditSystemForm from '@/components/app/data-table/forms/edit-system-form';

export default function HabitTrackerPage() {
  const { data: userData, isLoading } = useUserData();

  const { milestones, skills, systems, habits, events, variables, areas } = userData || {};

  const activeMilestones = useMemo(() => {
    return (milestones || []).filter(m => m.estado === 'Pendiente');
  }, [milestones]);

  const streakMultiplier = useMemo(() => {
    return computeStreakMultiplier(userData?.kpis?.dailyScoreTrend || []);
  }, [userData?.kpis?.dailyScoreTrend]);

  const milestoneColumns = useMemo(() => getMilestoneColumns(skills || [], systems || []), [skills, systems]);

  const [isCreateHabitOpen, setIsCreateHabitOpen] = useState(false);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [isCreateSkillOpen, setIsCreateSkillOpen] = useState(false);
  const [isCreateSystemOpen, setIsCreateSystemOpen] = useState(false);

  if (isLoading && !userData) {
    return <AreaPageSkeleton />;
  }
  
  return (
    <div className="space-y-10 pb-20">
      <NavigationReady />
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">Gestiona tus hábitos diarios y hitos estratégicos para mantener el sistema equilibrado.</p>
      </div>

      <div data-tour="milestones-habits">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Hábitos diarios</h2>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsCreateHabitOpen(true)} className="gap-1.5">
            <PlusCircle size={14} />
            Nuevo hábito
          </Button>
        </div>
        <HabitChecklist
            habits={habits || []}
            events={events || []}
            variables={variables || []}
        />
      </div>

      <Separator className="my-10" />

      <section data-tour="milestones-goals" className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Objetivos Activos</h2>
              <p className="text-sm text-muted-foreground">Tus hitos estratégicos vinculados a sistemas y habilidades.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsCreateMilestoneOpen(true)} className="gap-1.5 shrink-0">
            <PlusCircle size={14} />
            Nuevo hito
          </Button>
        </div>
        
        <MilestoneTracker
            milestones={activeMilestones}
            skills={skills || []}
            systems={systems || []}
            streakMultiplier={streakMultiplier}
        />
      </section>

      <Separator className="my-10" />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Historial del sistema</h2>
            <p className="text-sm text-muted-foreground">Estado diario de los últimos 91 días.</p>
          </div>
        </div>
        <ScoreCalendarHeatmap data={userData?.kpis.dailyScoreTrend ?? []} days={91} />
      </section>

      <Separator className="my-10" />

      <section className="space-y-6">
        <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <div>
                <h2 className="text-xl font-semibold">Historial y Gestión</h2>
                <p className="text-sm text-muted-foreground">Vista detallada de todos tus hitos pasados y presentes.</p>
            </div>
        </div>
        <DataTable
            columns={milestoneColumns}
            data={milestones || []}
            filterColumnId="nombre"
            entityName="Hito / Tarea"
            skills={skills || []}
            systems={systems || []}
            hideCreateButton
        />
      </section>
      <Separator className="my-10" />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Configuración</h2>
            <p className="text-sm text-muted-foreground">Crea las habilidades y sistemas que estructuran tus objetivos.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsCreateSkillOpen(true)} className="gap-1.5">
            <Star size={14} />
            Nueva habilidad
          </Button>
          <Button variant="outline" onClick={() => setIsCreateSystemOpen(true)} className="gap-1.5">
            <Layers size={14} />
            Nuevo sistema
          </Button>
        </div>
      </section>

      <Dialog open={isCreateHabitOpen} onOpenChange={setIsCreateHabitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo hábito</DialogTitle>
            <DialogDescription>Crea un hábito vinculado a un sistema y una variable.</DialogDescription>
          </DialogHeader>
          <EditHabitForm
            closeDialog={() => setIsCreateHabitOpen(false)}
            systems={systems || []}
            variables={variables || []}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateMilestoneOpen} onOpenChange={setIsCreateMilestoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo hito / tarea</DialogTitle>
            <DialogDescription>Define un objetivo estratégico vinculado a una habilidad o sistema.</DialogDescription>
          </DialogHeader>
          <EditMilestoneForm
            closeDialog={() => setIsCreateMilestoneOpen(false)}
            skills={skills || []}
            systems={systems || []}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={isCreateSkillOpen} onOpenChange={setIsCreateSkillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva habilidad</DialogTitle>
            <DialogDescription>Crea una habilidad RPG vinculada a un área de vida.</DialogDescription>
          </DialogHeader>
          <EditSkillForm
            closeDialog={() => setIsCreateSkillOpen(false)}
            areas={areas || []}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateSystemOpen} onOpenChange={setIsCreateSystemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo sistema</DialogTitle>
            <DialogDescription>Define un sistema que agrupe hábitos y habilidades relacionados.</DialogDescription>
          </DialogHeader>
          <EditSystemForm
            closeDialog={() => setIsCreateSystemOpen(false)}
            skills={skills || []}
            variables={variables || []}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}


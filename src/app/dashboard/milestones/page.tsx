'use client';
import { useUserData } from '@/hooks/use-user-data';
import { getMilestoneColumns } from '@/components/app/data-table/columns-milestone';
import { DataTable } from '@/components/app/data-table/data-table';
import { useMemo } from 'react';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import HabitChecklist from '@/components/app/habit-checklist';
import MilestoneTracker from '@/components/app/milestone-tracker';
import ScoreCalendarHeatmap from '@/components/app/score-calendar-heatmap';
import { Separator } from '@/components/ui/separator';
import { Target, History, CalendarDays } from 'lucide-react';
import NavigationReady from '@/components/app/navigation-ready';
import { computeStreakMultiplier } from '@/lib/progression';

export default function HabitTrackerPage() {
  const { data: userData, isLoading } = useUserData();

  const { milestones, skills, systems, habits, events, variables } = userData || {};

  const activeMilestones = useMemo(() => {
    return (milestones || []).filter(m => m.estado === 'Pendiente');
  }, [milestones]);

  const streakMultiplier = useMemo(() => {
    return computeStreakMultiplier(userData?.kpis?.dailyScoreTrend || []);
  }, [userData?.kpis?.dailyScoreTrend]);

  const milestoneColumns = useMemo(() => getMilestoneColumns(skills || [], systems || []), [skills, systems]);

  if (isLoading && !userData) {
    return <AreaPageSkeleton />;
  }
  
  return (
    <div className="space-y-10 pb-20">
      <NavigationReady />
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">Gestiona tus hábitos diarios y hitos estratégicos para mantener el sistema equilibrado.</p>
      </div>

      <HabitChecklist 
          habits={habits || []} 
          events={events || []} 
          variables={variables || []} 
      />

      <Separator className="my-10" />

      <section className="space-y-6">
        <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
                <h2 className="text-xl font-semibold">Objetivos Activos</h2>
                <p className="text-sm text-muted-foreground">Tus hitos estratégicos vinculados a sistemas y habilidades.</p>
            </div>
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
    </div>
  );
}


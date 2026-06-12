'use client';

import { Habit, Event, Variable } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Plus, Zap, AlertCircle, TrendingDown, TrendingUp, XCircle, Info, CheckCircle } from 'lucide-react';
import { isSameDay, subDays, format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';

interface HabitChecklistProps {
  habits: Habit[];
  events: Event[];
  variables: Variable[];
  onCreate?: () => void;
}

export default function HabitChecklist({ habits, events, variables, onCreate }: HabitChecklistProps) {
  const { uid } = useUser();
  const { toast } = useToast();
  const today = startOfDay(new Date());

  // Cada hábito es independiente: se identifica por su propio id, no por var_id.
  // Antes se deduplicaba por var_id, así que dos hábitos sobre la misma variable
  // colisionaban (solo aparecía uno y marcar uno marcaba el otro).
  const eventsForHabit = (habit: Habit) =>
    events.filter(e =>
      e.habito_id === habit.id ||
      // Compatibilidad: eventos antiguos sin habito_id, asociados por var_id.
      (!e.habito_id && habit.var_id && e.var_id === habit.var_id)
    );

  const habitDisplayName = (habit: Habit) =>
    habit.nombre || variables.find(v => v.var_id === habit.var_id)?.var_nombre || 'Hábito';

  const habitIsNegative = (habit: Habit) =>
    !!habit.var_id && variables.find(v => v.var_id === habit.var_id)?.polaridad === -1;

  const handleLogHabit = (habit: Habit, isNegative: boolean) => {
    if (!uid) return;

    addDocumentNonBlocking('events', {
      evento_id: `EVT_HABIT_${Date.now()}`,
      fecha: new Date().toISOString(),
      habito_id: habit.id,
      ...(habit.var_id ? { var_id: habit.var_id } : {}),
      intensidad: 5,
      contexto: 'Registrado desde el Habit Tracker',
      tipo: 'Variable',
      impulsivo: isNegative,
    });

    toast({
      title: isNegative ? 'Caída registrada' : 'Hábito completado',
      description: isNegative
        ? `Has registrado una caída de «${habitDisplayName(habit)}». No te castigues, analiza el disparador.`
        : `¡Buen trabajo con «${habitDisplayName(habit)}»! Sigue así.`,
      variant: isNegative ? 'destructive' : 'default',
    });
  };

  // Agrupa los hábitos por estado del día.
  const { pendingPositive, avoidance, completed } = (() => {
    const groups = { pendingPositive: [] as Habit[], avoidance: [] as Habit[], completed: [] as Habit[] };
    habits.forEach(habit => {
      const isNegative = habitIsNegative(habit);
      const isDoneToday = eventsForHabit(habit).some(e => isSameDay(parseISO(e.fecha), today));
      if (isDoneToday) groups.completed.push(habit);
      else if (isNegative) groups.avoidance.push(habit);
      else groups.pendingPositive.push(habit);
    });
    return groups;
  })();

  if (habits.length === 0) {
    return (
      <div className="text-center p-10 border-2 border-dashed rounded-xl bg-muted/20">
        <Zap className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-20" />
        <p className="text-foreground font-medium">Aún no tienes hábitos</p>
        <p className="text-sm text-muted-foreground mb-4">Empieza con uno sencillo. Solo necesitas un nombre.</p>
        {onCreate && (
          <Button size="sm" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Crear mi primer hábito
          </Button>
        )}
      </div>
    );
  }

  const renderHabitCard = (habit: Habit) => {
    const isNegative = habitIsNegative(habit);
    const habitEvents = eventsForHabit(habit);
    const isDoneToday = habitEvents.some(e => isSameDay(parseISO(e.fecha), today));
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

    return (
      <Card key={habit.id} className={cn(
        "transition-all duration-300 relative overflow-hidden",
        !isNegative && isDoneToday ? "bg-primary/5 border-primary/20 opacity-80" : "hover:shadow-sm",
        isNegative && !isDoneToday ? "bg-green-500/5 border-green-500/20" : "",
        isNegative && isDoneToday ? "border-destructive/30 bg-destructive/5 opacity-80" : ""
      )}>
        <div className={cn(
            "absolute top-0 right-0 p-1 opacity-10",
            isNegative ? "text-destructive" : "text-primary"
        )}>
            {isNegative ? <TrendingDown size={40}/> : <TrendingUp size={40}/>}
        </div>

        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold truncate max-w-[180px]">
                    {isNegative ? `Evitar: ` : ""}{habitDisplayName(habit)}
                </CardTitle>
                {habit.description && (
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{habit.description}</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] h-5">{habit.frecuencia}</Badge>
                {isNegative && <Badge variant="destructive" className="text-[10px] h-5">Evitación</Badge>}
                {habit.minimo_viable && <Badge variant="secondary" className="text-[10px] h-5 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">HMV</Badge>}
              </div>
            </div>

            {isNegative ? (
                isDoneToday ? (
                    <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                )
            ) : (
                isDoneToday ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full"
                        aria-label={`Marcar ${habitDisplayName(habit)} como hecho`}
                        onClick={() => handleLogHabit(habit, false)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                )
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Racha (7d)</span>
                <span className={cn(
                    "text-[10px] font-mono uppercase",
                    isDoneToday && isNegative ? "text-destructive" : "text-muted-foreground"
                )}>
                    {isNegative ? (isDoneToday ? 'Caída registrada' : 'Día Limpio') : (isDoneToday ? 'Completado' : 'Pendiente')}
                </span>
            </div>
            <div className="flex gap-1.5 justify-between">
              <TooltipProvider>
                {last7Days.map((date, idx) => {
                  const count = habitEvents.filter(e => isSameDay(parseISO(e.fecha), date)).length;
                  const hasEvent = count > 0;

                  let colorClass = "bg-muted";
                  if (isNegative) {
                      colorClass = hasEvent ? "bg-destructive" : "bg-green-500";
                  } else {
                      colorClass = hasEvent ? "bg-primary" : "bg-muted";
                  }

                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "h-2 flex-1 rounded-full transition-colors",
                            colorClass
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                            {format(date, 'EEEE d', { locale: es })}: {hasEvent ? (isNegative ? `${count} caídas` : 'Completado') : (isNegative ? 'Limpio' : 'Pendiente')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
            {!isDoneToday && (
                <div className="pt-2">
                    {isNegative ? (
                        <Button
                            className="w-full"
                            variant="outline"
                            size="sm"
                            onClick={() => handleLogHabit(habit, true)}
                        >
                            <XCircle className="mr-2 h-4 w-4 text-destructive" />
                            Registrar caída
                        </Button>
                    ) : (
                        <Button
                            className="w-full"
                            variant="default"
                            size="sm"
                            onClick={() => handleLogHabit(habit, false)}
                        >
                            Marcar como hecho
                        </Button>
                    )}
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-10">
      {/* Hábitos positivos pendientes */}
      {pendingPositive.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Pendientes hoy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingPositive.map(renderHabitCard)}
          </div>
        </section>
      )}

      {/* Hábitos de evitación */}
      {avoidance.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Zonas de evitación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {avoidance.map(renderHabitCard)}
          </div>
        </section>
      )}

      {/* Completados hoy */}
      {completed.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Hechos hoy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map(renderHabitCard)}
          </div>
        </section>
      )}

      {pendingPositive.length === 0 && avoidance.length === 0 && completed.length > 0 && (
        <div className="text-center py-10 bg-primary/5 rounded-xl border border-primary/10">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold">¡Día completado!</h3>
            <p className="text-muted-foreground">Has registrado todos tus hábitos de hoy. ¡Buen trabajo!</p>
        </div>
      )}
    </div>
  );
}

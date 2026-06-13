'use client';

import { addDays, format, isSameDay, startOfMonth, endOfMonth, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';

interface SkillConsistencyChartProps {
    activeDays: string[]; // Dates in 'yyyy-MM-dd' format
    dateRange?: DateRange;
}

export default function SkillConsistencyChart({ activeDays, dateRange }: SkillConsistencyChartProps) {
    if (!dateRange?.from) {
        return <div className="text-center text-muted-foreground py-8">Selecciona un rango de fechas.</div>;
    }
    
    const activeDaysSet = new Set(activeDays);
    const startDate = startOfMonth(dateRange.from);
    const endDate = endOfMonth(dateRange.to || dateRange.from);

    const months = [];
    let currentMonth = startDate;

    while (currentMonth <= endDate) {
        months.push(new Date(currentMonth));
        currentMonth = addDays(currentMonth, 35); // Move to next month approx.
        currentMonth = startOfMonth(currentMonth);
    }
    
    return (
            <div className="flex flex-wrap gap-x-8 gap-y-4">
                {months.map(monthStart => {
                    const monthDays = [];
                    let day = monthStart;
                    while (format(day, 'yyyy-MM') === format(monthStart, 'yyyy-MM')) {
                        monthDays.push(day);
                        day = addDays(day, 1);
                    }
                    
                    // Add padding for the first week
                    const firstDayIndex = (getDay(monthStart) + 6) % 7; // Monday = 0
                    for (let i = 0; i < firstDayIndex; i++) {
                        monthDays.unshift(new Date(0)); // Invalid date for padding
                    }

                    return (
                        <div key={format(monthStart, 'yyyy-MM')}>
                            <h4 className="font-semibold text-sm mb-2 capitalize">{format(monthStart, 'MMMM yyyy', { locale: es })}</h4>
                            <div className="grid grid-cols-7 gap-1">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                    <div key={d} className="h-4 w-4 text-center text-xs text-muted-foreground">{d}</div>
                                ))}
                                {monthDays.map((d, i) => {
                                    if (d.getTime() === 0) {
                                        return <div key={`pad-${i}`} className="h-4 w-4" />;
                                    }
                                    const dayStr = format(d, 'yyyy-MM-dd');
                                    const isActive = activeDaysSet.has(dayStr);
                                    
                                    return (
                                        <Popover key={dayStr}>
                                            <PopoverTrigger asChild>
                                                <div className={cn(
                                                    "h-4 w-4 rounded-sm cursor-pointer",
                                                    isActive ? 'bg-green-500' : 'bg-muted/50'
                                                )} />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto max-w-[260px] p-2.5 text-xs">
                                                <p>{format(d, 'PPP', { locale: es })} - {isActive ? 'Activo' : 'Inactivo'}</p>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
    );
}

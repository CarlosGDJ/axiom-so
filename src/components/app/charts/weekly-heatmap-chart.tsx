'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HeatmapData {
    heatmap: number[][];
    maxCount: number;
    eventDetails: { [key: string]: string[] };
    days: string[];
    hours: number[];
}

interface WeeklyHeatmapChartProps {
    data: HeatmapData;
}

export default function WeeklyHeatmapChart({ data }: WeeklyHeatmapChartProps) {
    const { heatmap, maxCount, days, hours, eventDetails } = data;

    const getCellColor = (count: number) => {
        if (count === 0) return 'bg-muted/30';
        if (maxCount === 0) return 'bg-muted/30';

        const intensity = Math.min(1, count / (maxCount * 0.8)); // Cap intensity to avoid overly dark colors
        // Using HSL for --chart-3 (destructive color)
        // format: hsl(H S% L% / A)
        return `hsl(var(--chart-3) / ${intensity * 0.9 + 0.1})`; // opacity from 0.1 to 1.0
    };

    if (!heatmap || heatmap.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Mapa de Calor Semanal</CardTitle>
                    <CardDescription>No hay datos de eventos negativos para mostrar.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">Registra eventos para ver patrones.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Mapa de Calor Semanal de Eventos Negativos</CardTitle>
                <CardDescription>
                    Visualiza a qué horas y en qué días se concentran los eventos que te restan energía. ¿Cuándo caes siempre?
                </CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <div className="flex gap-2">
                        {/* Day Labels */}
                        <div className="flex flex-col gap-1 pt-6 text-xs text-muted-foreground">
                            {days.map(day => (
                                <div key={day} className="h-6 flex items-center justify-end font-medium">{day}</div>
                            ))}
                        </div>

                        <div className="overflow-x-auto w-full">
                             <div className="grid grid-cols-24 gap-1 min-w-[600px]">
                                {/* Hour Labels */}
                                {hours.map(hour => (
                                    <div key={`hour-label-${hour}`} className="col-span-1 h-6 text-center text-xs text-muted-foreground">{String(hour).padStart(2, '0')}</div>
                                ))}

                                {/* Heatmap Cells */}
                                {heatmap.flat().map((count, index) => {
                                    const dayIndex = Math.floor(index / 24);
                                    const hourIndex = index % 24;
                                    const events = eventDetails[`${dayIndex}-${hourIndex}`] || [];

                                    return (
                                        <Tooltip key={`cell-${dayIndex}-${hourIndex}`}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className="h-6 w-full rounded-sm"
                                                    style={{ backgroundColor: getCellColor(count) }}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {count > 0 ? (
                                                    <div>
                                                        <p className="font-bold">{count} evento{count > 1 ? 's' : ''} negativo{count > 1 ? 's' : ''}</p>
                                                        <ul className="list-disc pl-4 text-xs text-muted-foreground">
                                                            {/* Show unique event names */}
                                                            {[...new Set(events)].slice(0,3).map(e => <li key={e}>{e}</li>)}
                                                            {events.length > 3 && <li>...y más</li>}
                                                        </ul>
                                                    </div>
                                                ) : (
                                                    <p>Sin eventos negativos</p>
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
}

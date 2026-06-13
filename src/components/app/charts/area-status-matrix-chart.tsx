
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type DailyState = {
    date: string;
    state: 'OK' | 'RIESGO' | 'CRITICO';
};

interface AreaStatusData {
    id: string;
    area: string;
    dailyStates: DailyState[];
}

interface AreaStatusMatrixChartProps {
    data: AreaStatusData[];
}

const stateColors: { [key in DailyState['state']]: string } = {
    OK: 'bg-green-500/70',
    RIESGO: 'bg-orange-500/70',
    CRITICO: 'bg-red-500/70',
};

export default function AreaStatusMatrixChart({ data }: AreaStatusMatrixChartProps) {
    if (!data || data.length === 0 || data[0].dailyStates.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Matriz de Estado por Área</CardTitle>
                    <CardDescription>El estado (OK/RIESGO/CRÍTICO) de cada área por día.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos para mostrar.</p>
                </CardContent>
            </Card>
        );
    }

    const dateLabels = data[0].dailyStates.map(ds => ds.date);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Matriz de Estado por Área</CardTitle>
                <CardDescription>El estado (OK/RIESGO/CRÍTICO) de cada área por día.</CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <div className="flex gap-2">
                        <div className="flex flex-col gap-1 pt-6 text-xs text-muted-foreground">
                            {data.map((row, idx) => (
                                <div key={row.id || `area-${idx}`} className="h-6 flex items-center justify-end font-medium text-right truncate" title={row.area}>
                                    {row.area}
                                </div>
                            ))}
                        </div>

                        <ScrollArea className="w-full overflow-auto">
                            <div className="relative">
                                <div style={{ gridTemplateColumns: `repeat(${dateLabels.length}, minmax(32px, 1fr))`}} className="grid gap-1 min-w-[300px]">
                                    {dateLabels.map((date, idx) => (
                                        <div key={`date-label-${date}-${idx}`} className="h-6 text-center text-xs text-muted-foreground">{date}</div>
                                    ))}

                                    {data.flatMap(({ id, area, dailyStates }, areaIdx) =>
                                        dailyStates.map(({ date, state }, dateIdx) => (
                                            <Tooltip key={`cell-${id || area}-${areaIdx}-${date}-${dateIdx}`} delayDuration={0}>
                                                <TooltipTrigger asChild>
                                                    <div className={cn("h-6 w-full rounded-sm transition-colors hover:ring-1 hover:ring-foreground", stateColors[state])} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-bold">{area} - {date}</p>
                                                    <p>Estado: {state}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ))
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
}

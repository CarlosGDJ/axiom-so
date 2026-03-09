'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CooccurrenceData {
  matrix: { [key: string]: { [key: string]: number } };
  labels: string[];
  varNames: { [key: string]: string };
}

interface CooccurrenceMatrixChartProps {
    data: CooccurrenceData;
}

export default function CooccurrenceMatrixChart({ data }: CooccurrenceMatrixChartProps) {
    const { matrix, labels, varNames } = data;

    if (!labels || labels.length < 2) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Matriz de Co-ocurrencias de Variables Negativas (24h)</CardTitle>
                    <CardDescription>
                        Identifica qué variables negativas tienden a ocurrir juntas, indicando patrones de recaída o días difíciles.
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center">
                    <p className="text-muted-foreground">Se requieren al menos 2 tipos de eventos negativos registrados en un mismo día para generar patrones.</p>
                </CardContent>
            </Card>
        );
    }
    
    const maxCount = Math.max(1, ...labels.map(l1 => Math.max(...labels.map(l2 => (l1 === l2 ? 0 : matrix[l1]?.[l2] || 0)))));

    const getCellColor = (count: number) => {
        if (count === 0) return 'rgba(var(--muted), 0.1)';
        const intensity = Math.min(1, count / maxCount);
        // Usar color ámbar/naranja para indicar riesgo de patrón
        return `rgba(249, 115, 22, ${intensity * 0.8 + 0.2})`; 
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Matriz de Co-ocurrencias de Variables Negativas (24h)</CardTitle>
                <CardDescription>
                    Mapeo de eventos negativos que ocurren en una ventana de 24h. Los bloques más oscuros indican disparadores en cadena.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <ScrollArea className="w-full max-h-[420px] rounded-md border">
                        <div className="relative inline-block min-w-full">
                            <table className="border-collapse table-fixed w-max text-xs">
                                <thead>
                                    <tr>
                                        <th className="sticky top-0 left-0 bg-background z-20 w-44 border-b"></th>
                                        {labels.map(label => (
                                            <th
                                                key={`head-${label}`}
                                                className="sticky top-0 bg-background z-10 px-2 py-2 h-14 w-24 border-b text-[10px] text-muted-foreground font-semibold"
                                                title={varNames[label]}
                                            >
                                                <div className="truncate">{varNames[label] || label}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {labels.map(rowLabel => (
                                        <tr key={`row-${rowLabel}`}>
                                            <td
                                                className="sticky left-0 bg-background z-10 px-3 py-2 text-[10px] text-muted-foreground font-semibold w-44 truncate border-r"
                                                title={varNames[rowLabel]}
                                            >
                                                {varNames[rowLabel] || rowLabel}
                                            </td>
                                            {labels.map(colLabel => {
                                                const count = matrix[rowLabel]?.[colLabel] || 0;
                                                const isDiagonal = rowLabel === colLabel;
                                                return (
                                                    <td key={`cell-${rowLabel}-${colLabel}`} className="p-1 w-24 h-12">
                                                        <Tooltip delayDuration={0}>
                                                            <TooltipTrigger asChild>
                                                                <div
                                                                    className={cn("h-10 w-full rounded-sm transition-all", isDiagonal ? "bg-muted/30" : "hover:scale-[1.02]")}
                                                                    style={{ backgroundColor: isDiagonal ? undefined : getCellColor(count) }}
                                                                />
                                                            </TooltipTrigger>
                                                            {!isDiagonal && (
                                                                <TooltipContent className="bg-destructive text-destructive-foreground">
                                                                    <p className="font-black text-xs uppercase">{varNames[rowLabel]} + {varNames[colLabel]}</p>
                                                                    <p className="text-[10px]">{count} patrones detectados</p>
                                                                </TooltipContent>
                                                            )}
                                                        </Tooltip>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ScrollArea>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
}

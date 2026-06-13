'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ImpactMatrix, Variable, Hormone } from '@/lib/types';

interface ImpactMatrixHeatmapProps {
    impactMatrix: ImpactMatrix[];
    variables: Variable[];
    hormones: Hormone[];
}

export default function ImpactMatrixHeatmap({ impactMatrix, variables, hormones }: ImpactMatrixHeatmapProps) {
    if (!impactMatrix.length || !variables.length || !hormones.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Heatmap de Impacto</CardTitle>
                    <CardDescription>Visualiza cómo cada variable afecta a cada hormona.</CardDescription>
                </CardHeader>
                <CardContent className="h-[450px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos suficientes para mostrar la matriz.</p>
                </CardContent>
            </Card>
        );
    }

    const maxEffect = Math.max(1, ...impactMatrix.map((im) => Math.abs(im.effect_size)));

    const getCellColor = (effect: number) => {
        if (Math.abs(effect) < 0.0001) return 'hsl(var(--muted) / 0.35)';
        const intensity = Math.min(1, Math.abs(effect) / maxEffect);
        const colorVar = effect > 0 ? '--chart-2' : '--chart-3';
        return `hsl(var(${colorVar}) / ${0.2 + intensity * 0.75})`;
    };

    const matrixData: Record<string, Record<string, number>> = {};
    impactMatrix.forEach((im) => {
        if (!matrixData[im.var_id]) {
            matrixData[im.var_id] = {};
        }
        matrixData[im.var_id][im.hormone_id] = im.effect_size;
    });

    const relevantVars = variables.filter((v) => impactMatrix.some((im) => im.var_id === v.var_id));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Heatmap: Variable -&gt; Hormona</CardTitle>
                <CardDescription>
                    Cómo cada variable (filas) impacta en cada hormona (columnas). Verde es positivo, rojo es negativo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                    <ScrollArea className="w-full max-h-[520px] rounded-md border">
                        <div className="relative inline-block min-w-full">
                            <table className="border-separate border-spacing-1 table-fixed w-max text-xs">
                                <thead>
                                    <tr>
                                        <th className="sticky top-0 left-0 bg-background z-20 w-56 h-10 border-b text-left px-3 text-muted-foreground font-semibold">
                                            Variables
                                        </th>
                                        {hormones.map((hormone) => (
                                            <th
                                                key={`head-${hormone.hormone_id}`}
                                                className="sticky top-0 bg-background z-10 h-10 w-28 border-b px-2 text-center text-[11px] text-muted-foreground font-semibold"
                                                title={hormone.name}
                                            >
                                                <span className="block truncate">{hormone.name}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {relevantVars.map((variable) => (
                                        <tr key={`row-${variable.var_id}`}>
                                            <td
                                                className="sticky left-0 bg-background z-10 w-56 px-3 py-2 text-left text-[12px] text-muted-foreground font-medium truncate border-r"
                                                title={variable.var_nombre}
                                            >
                                                {variable.var_nombre}
                                            </td>
                                            {hormones.map((hormone) => {
                                                const effectSize = matrixData[variable.var_id]?.[hormone.hormone_id] || 0;
                                                return (
                                                    <td key={`cell-${variable.var_id}-${hormone.hormone_id}`} className="w-28 h-9 p-0.5">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <div
                                                                    className="h-8 w-full rounded-sm border border-border/20 cursor-pointer"
                                                                    style={{ backgroundColor: getCellColor(effectSize) }}
                                                                />
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto max-w-[260px] p-2.5 text-xs">
                                                                <p className="font-bold">{variable.var_nombre} -&gt; {hormone.name}</p>
                                                                <p>Tamaño del efecto: {effectSize.toFixed(2)}</p>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ScrollArea>
            </CardContent>
        </Card>
    );
}

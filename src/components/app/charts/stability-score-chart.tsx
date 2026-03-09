
'use client';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StabilityScoreChartProps {
    index: number; // A score from 0 (very unstable) to 100 (very stable)
}

export default function StabilityScoreChart({ index }: StabilityScoreChartProps) {
    const getStabilityProps = (score: number) => {
        if (score > 85) return { label: 'Muy Estable', color: 'hsl(var(--chart-2))', desc: 'Tus niveles son consistentes. Estás manteniendo tus sistemas bajo control.' };
        if (score > 65) return { label: 'Estable', color: 'hsl(var(--chart-5))', desc: 'Ligera variación normal. Operación estándar.' };
        if (score > 40) return { label: 'Moderado', color: 'hsl(var(--chart-4))', desc: 'Detectamos altibajos significativos. Revisa tus picos de estrés o dopamina.' };
        return { label: 'Inestable', color: 'hsl(var(--chart-3))', desc: 'Montaña rusa detectada. Tus biomarcadores están fluctuando violentamente.' };
    };

    const stability = getStabilityProps(index);
    const data = [{ name: 'stability', value: index, fill: stability.color }];

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Índice de Estabilidad</CardTitle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                                <p className="text-xs">Calculado mediante la Desviación Estándar de tu bienestar diario. Mide la volatilidad frente a la consistencia.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <CardDescription>Mide la volatilidad de tu bienestar basándose en la varianza diaria.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center text-center">
                 <div className="h-[150px] w-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            innerRadius="80%"
                            outerRadius="100%"
                            barSize={15}
                            data={data}
                            startAngle={180}
                            endAngle={0}
                        >
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar
                                background
                                dataKey="value"
                                cornerRadius={10}
                                angleAxisId={0}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>
                 <p className="text-4xl font-bold -mt-16">{index}<span className="text-lg text-muted-foreground">/100</span></p>
                 <div className="mt-2 space-y-1">
                    <p className={`font-semibold`} style={{ color: stability.color }}>{stability.label}</p>
                    <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto leading-tight italic">"{stability.desc}"</p>
                 </div>
            </CardContent>
        </Card>
    );
}

'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';

interface ImpulsiveData {
    name: string;
    impulsive: number;
    planned: number;
}

interface ImpulsiveImpactChartProps {
    data: ImpulsiveData[];
}

const chartConfig = {
    impulsive: { label: 'Impacto Impulsivo (Riesgo)', color: 'hsl(var(--chart-4))' }, // Orange
    planned: { label: 'Impacto Planificado', color: 'hsl(var(--chart-1))' }, // Blue
} satisfies ChartConfig;


export default function ImpulsiveImpactChart({ data }: ImpulsiveImpactChartProps) {
    const chartData = data
        ?.filter((item) => (item.impulsive + item.planned) > 0.001)
        .sort((a, b) => (b.impulsive + b.planned) - (a.impulsive + a.planned))
        .slice(0, 8) || [];

    if (chartData.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Impacto Impulsivo vs. Planificado</CardTitle>
                    <CardDescription>Compara el impacto de eventos impulsivos y planificados.</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos de impulsividad registrados.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Impacto Impulsivo vs. Planificado</CardTitle>
                <CardDescription>Magnitud absoluta del impacto de comportamientos reactivos frente a acciones conscientes.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-[280px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }} barCategoryGap={16}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    type="number"
                                    stroke="#888888"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={130}
                                    stroke="#888888"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value: string) => value.length > 20 ? `${value.slice(0, 20)}...` : value}
                                />
                                <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--accent) / 0.1)'}} />
                                <Legend content={<ChartLegendContent />} />
                                <Bar dataKey="impulsive" fill="var(--color-impulsive)" radius={[0, 4, 4, 0]} barSize={12} />
                                <Bar dataKey="planned" fill="var(--color-planned)" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent } from '@/components/ui/chart';

interface StateDistributionData {
    name: 'OK' | 'RIESGO' | 'CRITICO';
    value: number;
    fill: string;
}

interface StateDistributionChartProps {
    data: StateDistributionData[];
}

const chartConfig = {
    OK: { label: 'OK', color: 'hsl(var(--chart-2))' },
    RIESGO: { label: 'Riesgo', color: 'hsl(var(--chart-4))' },
    CRITICO: { label: 'Crítico', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

export default function StateDistributionChart({ data }: StateDistributionChartProps) {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    if (total === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Distribución de Estados</CardTitle>
                    <CardDescription>Porcentaje de tiempo en cada estado.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos de estado para el periodo.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribución de Estados</CardTitle>
                <CardDescription>Porcentaje de tiempo que has pasado en cada estado durante el periodo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent />} />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                    if (percent === 0) return null;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                    return (
                                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Legend content={<ChartLegendContent />} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

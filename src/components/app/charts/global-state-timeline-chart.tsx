'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ChartEmptyState from '@/components/app/chart-empty-state';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';

interface TimelineData {
    date: string;
    score: number;
    state: 'OK' | 'RIESGO' | 'CRITICO';
}

interface GlobalStateTimelineChartProps {
    data: TimelineData[];
}

const stateColors = {
    OK: 'hsl(var(--chart-5))',
    RIESGO: 'hsl(var(--chart-4))',
    CRITICO: 'hsl(var(--chart-3))',
};

const chartConfig = {
    score: {
        label: "Puntuación",
    },
    OK: { label: 'OK', color: stateColors.OK },
    RIESGO: { label: 'Riesgo', color: stateColors.RIESGO },
    CRITICO: { label: 'Crítico', color: stateColors.CRITICO },
} satisfies ChartConfig;


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const stateKey = data.state as keyof typeof stateColors;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
            <p className="font-bold">{label}</p>
            <p className="text-sm text-muted-foreground">
                Estado: <span className="font-semibold" style={{ color: stateColors[stateKey] }}>{data.state}</span>
            </p>
            <p className="text-sm text-muted-foreground">
                Puntuación: <span className="font-semibold">{data.score}</span>
            </p>
        </div>
      );
    }
    return null;
};


export default function GlobalStateTimelineChart({ data }: GlobalStateTimelineChartProps) {
    if (!data || data.length === 0) {
        return (
             <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Línea de Tiempo de Estado Global</CardTitle>
                    <CardDescription>Visualiza tu estado (OK/RIESGO/CRÍTICO) para cada día del periodo seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartEmptyState
                        icon="line"
                        title="Sin historial de estados"
                        message="El sistema generará esta línea de tiempo conforme se registren datos diarios."
                        minHeight="h-[250px]"
                    />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Línea de Tiempo de Estado Global</CardTitle>
                <CardDescription>Visualiza tu estado (OK/RIESGO/CRÍTICO) para cada día del periodo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-[250px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} content={<CustomTooltip />} />
                                 <Legend content={<ChartLegendContent />} />
                                <Bar dataKey="score" radius={2}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={stateColors[entry.state]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                 </div>
            </CardContent>
        </Card>
    )
}

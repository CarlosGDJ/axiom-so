
'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';

interface ContributionData {
    positive: number;
    negative: number;
}

interface AreaContributionChartProps {
    data: ContributionData;
}

const chartConfig = {
  positive: {
    label: 'Impacto Positivo',
    color: 'hsl(var(--chart-2))',
  },
  negative: {
    label: 'Impacto Negativo',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export default function AreaContributionChart({ data }: AreaContributionChartProps) {
    const chartData = [{ name: 'Impacto', positive: data.positive, negative: data.negative }];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Contribución de Impacto</CardTitle>
                <CardDescription>Impacto positivo vs. negativo en el periodo para el área seleccionada.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-[250px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" stackOffset="sign" margin={{left: -20}}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip cursor={{fill: 'hsl(var(--accent) / 0.2)'}} content={<ChartTooltipContent />} />
                                <Legend content={<ChartLegendContent />} />
                                <Bar dataKey="positive" fill="var(--color-positive)" stackId="stack" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="negative" fill="var(--color-negative)" stackId="stack" radius={[4, 0, 0, 4]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
    );
}

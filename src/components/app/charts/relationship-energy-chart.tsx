
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { RelationshipEnergy } from '@/lib/types';

interface RelationshipEnergyChartProps {
  data: RelationshipEnergy[];
}

export default function RelationshipEnergyChart({ data: propData }: RelationshipEnergyChartProps) {
  const data = propData && propData.length > 0 ? propData : [
    { outcome: 'Positiva', count: 0, fill: 'hsl(var(--chart-5))' },
    { outcome: 'Neutra', count: 0, fill: 'hsl(var(--muted-foreground))' },
    { outcome: 'Negativa', count: 0, fill: 'hsl(var(--chart-3))' },
  ];
  
  const chartConfig = {
    count: {
      label: "Interacciones",
    },
    Positiva: { label: 'Positiva', color: 'hsl(var(--chart-5))' },
    Neutra: { label: 'Neutra', color: 'hsl(var(--muted-foreground))' },
    Negativa: { label: 'Negativa', color: 'hsl(var(--chart-3))' },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Energía Relacional</CardTitle>
        <CardDescription>
          Impacto neto de tus interacciones sociales. Las barras muestran el volumen de conexiones que te suman (+), son neutras (=) o te restan (-) energía.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                    dataKey="outcome" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                />
                <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                />
                <Tooltip 
                    content={<ChartTooltipContent indicator='dot' />} 
                    cursor={{fill: 'hsl(var(--accent) / 0.05)'}}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

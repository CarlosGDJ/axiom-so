'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { RelationshipEnergy } from '@/lib/types';
import ChartEmptyState from '@/components/app/chart-empty-state';

interface RelationshipEnergyChartProps {
  data: RelationshipEnergy[];
}

const chartConfig = {
  count: { label: "Interacciones" },
  Positiva: { label: 'Positiva', color: 'hsl(var(--chart-5))' },
  Neutra: { label: 'Neutra', color: 'hsl(var(--muted-foreground))' },
  Negativa: { label: 'Negativa', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;

export default function RelationshipEnergyChart({ data: propData }: RelationshipEnergyChartProps) {
  const hasData = propData && propData.some(d => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Energía Relacional</CardTitle>
        <CardDescription>
          Impacto neto de tus interacciones sociales. Las barras muestran el volumen de conexiones que te suman (+), son neutras (=) o te restan (-) energía.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ChartEmptyState
            icon="activity"
            title="Sin interacciones registradas"
            message="Registra interacciones sociales para ver cómo afectan tu energía."
            minHeight="h-[250px]"
          />
        ) : (
          <div className="h-[250px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
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
                    content={<ChartTooltipContent indicator="dot" />}
                    cursor={{ fill: 'hsl(var(--accent) / 0.05)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {propData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

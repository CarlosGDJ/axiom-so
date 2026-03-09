
'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import type { DailyScore } from '@/lib/types';

const chartConfig = {
  score: {
    label: 'Puntuación Diaria',
    color: 'hsl(var(--chart-5))',
  },
  movingAverage: {
    label: 'Media Móvil (7d)',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

interface DailyScoreChartProps {
  data: DailyScore[];
}

export default function DailyScoreChart({ data }: DailyScoreChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de Bienestar</CardTitle>
        <CardDescription>
          Tu puntuación diaria de bienestar y la tendencia de los últimos 7 días.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ right: 20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  content={<ChartTooltipContent indicator="dot" />}
                  cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 2, strokeDasharray: '3 3' }}
                />
                <Legend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-score)" }} activeDot={{ r: 8, fill: "var(--color-score)", stroke: "hsl(var(--background))", strokeWidth: 2 }} name="Puntuación Diaria" />
                <Line type="monotone" dataKey="movingAverage" stroke="var(--color-movingAverage)" strokeWidth={2} dot={false} name="Media Móvil (7d)" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

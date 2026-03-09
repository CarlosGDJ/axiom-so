
'use client';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { DailyScore } from '@/lib/types';

const chartConfig = {
  score: {
    label: 'Puntuación',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

interface AreaTrendChartProps {
  data: DailyScore[];
}

export default function AreaTrendChart({ data }: AreaTrendChartProps) {
  
  if (!data || data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tendencia por Área</CardTitle>
                <CardDescription>
                  Evolución de la puntuación para el área seleccionada.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center">
                 <p className="text-muted-foreground">Selecciona un área para ver su tendencia.</p>
            </CardContent>
        </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia por Área</CardTitle>
        <CardDescription>
          Evolución de la puntuación para el área seleccionada en el periodo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ right: 20, left: -20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} name="Puntuación" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

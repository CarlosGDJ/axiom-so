'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface AreaDecayPoint {
  date: string;
  net: number;
  positive: number;
  negative: number;
}

interface AreaDecayTimelineChartProps {
  data: AreaDecayPoint[];
}

const chartConfig = {
  net: {
    label: 'Impacto neto',
    color: 'hsl(var(--primary))',
  },
  positive: {
    label: 'Impulso positivo',
    color: 'hsl(var(--chart-2))',
  },
  negative: {
    label: 'Arrastre negativo',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export default function AreaDecayTimelineChart({ data }: AreaDecayTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Decaimiento</CardTitle>
          <CardDescription>No hay datos para construir la curva de impacto.</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          Registra eventos para ver el decaimiento de impacto por d&iacute;a.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline de Decaimiento</CardTitle>
        <CardDescription>Evoluci&oacute;n diaria del arrastre de impactos en el &aacute;rea seleccionada.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="positive" stroke="var(--color-positive)" strokeWidth={1.8} dot={false} />
              <Line type="monotone" dataKey="negative" stroke="var(--color-negative)" strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}


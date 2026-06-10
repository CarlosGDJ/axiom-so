'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import ChartEmptyState from '@/components/app/chart-empty-state';

interface EventFrequencyData {
    date: string;
    count: number;
}

interface EventFrequencyChartProps {
  data: EventFrequencyData[];
}

export default function EventFrequencyChart({ data }: EventFrequencyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frecuencia de Eventos</CardTitle>
        <CardDescription>Número de eventos registrados por día.</CardDescription>
      </CardHeader>
      <CardContent>
        {(!data || data.length === 0) ? (
          <ChartEmptyState
            icon="activity"
            title="Sin eventos en este periodo"
            message="Usa el formulario de registro rápido para empezar a trazar tu actividad."
            minHeight="h-[250px]"
          />
        ) : (
          <div className="h-[250px]">
            <ChartContainer config={{ count: { label: 'Eventos' } }} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ right: 20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

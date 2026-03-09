'use client';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface EventFrequencyData {
    date: string;
    count: number;
}

interface EventFrequencyChartProps {
  data: EventFrequencyData[];
}

export default function EventFrequencyChart({ data }: EventFrequencyChartProps) {
  if (!data || data.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Frecuencia de Eventos</CardTitle>
                <CardDescription>Número de eventos registrados por día.</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center">
                <p className="text-muted-foreground">No hay eventos en este periodo.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frecuencia de Eventos</CardTitle>
        <CardDescription>
          Número de eventos registrados cada día en el periodo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer config={{count: {label: 'Eventos'}}} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ right: 20 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';

interface CurveData {
    date: string;
    level: number;
}

const chartConfig = {
  level: {
    label: 'Nivel Estimado',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

interface HormoneCurveChartProps {
  data: CurveData[];
  hormoneName: string;
}

export default function HormoneCurveChart({ data, hormoneName }: HormoneCurveChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Curva de Nivel: {hormoneName}</CardTitle>
        <CardDescription>
          Evolución estimada de los niveles hormonales en el periodo seleccionado.
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
                <Tooltip
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="level" stroke="var(--color-level)" strokeWidth={2} name="Nivel" />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

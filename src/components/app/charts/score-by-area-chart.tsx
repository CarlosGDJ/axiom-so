
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import type { ScoreByArea } from '@/lib/types';


interface ScoreByAreaChartProps {
  data: ScoreByArea[];
}

const chartConfig = {
  score: {
    label: "Puntuación",
  },
} satisfies ChartConfig;

// Custom Tooltip Content
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Área
            </span>
            <span className="font-bold text-muted-foreground">
              {data.area}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Puntuación
            </span>
            <span className="font-bold text-foreground">
              {data.score}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};


export default function ScoreByAreaChart({ data }: ScoreByAreaChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Puntuación por Área</CardTitle>
        <CardDescription>
          Estado actual por área (Verde {'>'} 75, Naranja {'>'} 50, Rojo ≤ 50).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <YAxis hide domain={[0, 100]}/>
                <XAxis 
                  dataKey="shortArea"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={-50}
                  textAnchor="end"
                  height={80}
                />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--accent) / 0.2)'}} 
                  content={<CustomTooltip />} 
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => {
                        let fill = 'hsl(var(--chart-5))'; // Green/Emerald
                        if (entry.score <= 50) fill = 'hsl(var(--chart-3))'; // Red/Critical
                        else if (entry.score <= 75) fill = 'hsl(var(--chart-4))'; // Orange/Risk
                        return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

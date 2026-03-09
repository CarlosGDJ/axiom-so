'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { Hormone } from '@/lib/types';
import { cn } from '@/lib/utils';


const chartConfig = {
  level: {
    label: "Nivel Actual",
  },
  baseline: {
    label: "Línea Base",
  }
} satisfies ChartConfig;


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="flex flex-col gap-1">
            <span className="font-bold text-foreground">
              {label}
            </span>
            <span className="text-sm text-muted-foreground">
              Nivel Actual: <span className="font-semibold text-foreground">{data.current_level}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              Línea Base: <span className="font-semibold text-foreground">{data.baseline}</span>
            </span>
             <span className="text-xs text-muted-foreground pt-1 border-t mt-1">
              Rango Óptimo: {data.optimal_range}
            </span>
        </div>
      </div>
    );
  }

  return null;
};


export default function HormoneLevelsChart({ data }: { data: Hormone[] }) {
  
  const chartData = data.map(hormone => {
    // Bio-Logic: Some hormones are "good" high, others "bad" high.
    const isGoodHigh = ['DOPAMINA', 'SEROTONINA', 'ENDORFINAS', 'OXITOCINA', 'TESTOSTERONA', 'FOCUS', 'ENERGY'].includes(hormone.hormone_id);
    const isBadHigh = ['CORTISOL', 'NORADRENALINA'].includes(hormone.hormone_id);

    let fill = 'hsl(var(--chart-5))'; // Default Green (stable)
    
    if (isBadHigh && hormone.current_level > hormone.baseline + 10) fill = 'hsl(var(--chart-3))'; // Stress High -> Red
    if (isGoodHigh && hormone.current_level < hormone.baseline - 10) fill = 'hsl(var(--chart-3))'; // Vitality Low -> Red
    if (Math.abs(hormone.current_level - hormone.baseline) > 20 && fill !== 'hsl(var(--chart-3))') fill = 'hsl(var(--chart-4))'; // Significant Deviation -> Orange

    return {
        ...hormone,
        fill
    };
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Niveles de Biomarcadores</CardTitle>
        <CardDescription>
          Tu estado hormonal actual en comparación con tu línea base (Verde = Óptimo, Rojo = Crítico).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  stroke="#888888"
                  fontSize={12}
                  width={80}
                />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--accent) / 0.2)'}} 
                  content={<CustomTooltip />} 
                />
                <Bar dataKey="current_level" radius={[0, 4, 4, 0]}>
                   {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                {/* Baseline indicator */}
                 {chartData.map((entry, index) => {
                   const y = (index / chartData.length) * 100 + (100 / chartData.length / 2);
                   const xPos = (entry.baseline / 100) * 100;
                   return (
                     <line 
                        key={`line-${index}`}
                        x1={`${xPos}%`}
                        y1={`${y}%`}
                        x2={`${xPos}%`}
                        y2={`${y}%`}
                        stroke="hsl(var(--foreground))"
                        strokeWidth={2}
                        transform="translate(0, -10)"
                     />
                   );
                 })}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
'use client';

import { useMemo } from 'react';
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { DailyScore } from '@/lib/types';
import ChartEmptyState from '@/components/app/chart-empty-state';

const chartConfig = {
  score: {
    label: 'Score diario',
    color: 'hsl(var(--chart-5))',
  },
  movingAverage: {
    label: 'Media 7d',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

interface DailyScoreChartProps {
  data: DailyScore[];
  /** Max number of days to display, default 30 */
  days?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const score = payload.find((p: any) => p.dataKey === 'score')?.value;
  const ma    = payload.find((p: any) => p.dataKey === 'movingAverage')?.value;
  const band  = score >= 60 ? { label: 'OK', cls: 'text-green-500' }
              : score >= 40 ? { label: 'RIESGO', cls: 'text-orange-500' }
              : { label: 'CRÍTICO', cls: 'text-red-500' };
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-2.5 shadow-md text-xs space-y-1">
      <p className="font-bold text-foreground">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Score</span>
        <span className={`font-black ${band.cls}`}>{score} <span className="font-normal text-[10px]">({band.label})</span></span>
      </div>
      {ma !== undefined && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Media 7d</span>
          <span className="font-bold text-foreground">{ma}</span>
        </div>
      )}
    </div>
  );
};

export default function DailyScoreChart({ data, days = 30 }: DailyScoreChartProps) {
  const sliced = useMemo(() => {
    if (!data || data.length === 0) return data;
    // Take the most recent `days` entries (data is already sorted oldest→newest)
    const base = data.slice(-days);
    // Compute 7d moving average if not already set
    if ((base[0] as any)?.movingAverage !== undefined) return base;
    return base.map((point, i, arr) => {
      const window = arr.slice(Math.max(0, i - 6), i + 1);
      const avg = window.reduce((s, p) => s + p.score, 0) / window.length;
      return { ...point, movingAverage: Math.round(avg) };
    });
  }, [data, days]);

  const isEmpty = !sliced || sliced.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Tendencia · {days} días</CardTitle>
        <CardDescription>
          Score diario y media móvil 7d. Bandas: verde ≥60 · naranja ≥40 · rojo &lt;40.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <ChartEmptyState
            icon="line"
            title="Sin historial aún"
            message="Registra eventos durante varios días para ver tu tendencia."
            minHeight="h-[260px]"
          />
        ) : (
          <div className="h-[260px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sliced} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--chart-5))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(sliced.length / 5)}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    ticks={[0, 40, 60, 80, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1.5, strokeDasharray: '4 4' }} />

                  {/* State band reference lines */}
                  <ReferenceLine y={60} stroke="hsl(142 76% 36% / 0.4)" strokeDasharray="4 4" strokeWidth={1} label={{ value: '60', position: 'insideTopRight', fontSize: 9, fill: 'hsl(142 76% 36%)' }} />
                  <ReferenceLine y={40} stroke="hsl(25 95% 53% / 0.4)"  strokeDasharray="4 4" strokeWidth={1} label={{ value: '40', position: 'insideTopRight', fontSize: 9, fill: 'hsl(25 95% 53%)' }} />

                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-score)"
                    strokeWidth={2}
                    fill="url(#scoreGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: 'var(--color-score)', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    name="Score diario"
                  />
                  <Area
                    type="monotone"
                    dataKey="movingAverage"
                    stroke="var(--color-movingAverage)"
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray="5 3"
                    dot={false}
                    name="Media 7d"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

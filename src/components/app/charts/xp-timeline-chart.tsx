'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface XpDay {
  date: string;
  scoreXP: number;
  habitXP: number;
}

interface XpTimelineChartProps {
  data: XpDay[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const total = (payload[0]?.value ?? 0) + (payload[1]?.value ?? 0);
  const rawDate = payload[0]?.payload?.date;
  return (
    <div className="rounded-lg border bg-background p-2.5 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-foreground">
        {rawDate ? format(parseISO(rawDate), "d MMM", { locale: es }) : ''}
      </p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">+{p.value} XP</span>
        </p>
      ))}
      <p className="text-muted-foreground border-t pt-1">Total: <span className="font-bold text-foreground">+{total} XP</span></p>
    </div>
  );
};

export default function XpTimelineChart({ data }: XpTimelineChartProps) {
  const formatted = data.map(d => ({
    ...d,
    label: format(parseISO(d.date), 'd MMM', { locale: es }),
  }));

  const totalXP = data.reduce((acc, d) => acc + d.scoreXP + d.habitXP, 0);

  return (
    <Card className="shadow-sm border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" />
          XP Ganado · últimos 30 días
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {totalXP} XP total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={formatted} barSize={8} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
            <Legend
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
            />
            <Bar dataKey="scoreXP" name="Rendimiento" stackId="xp" fill="hsl(var(--primary))" radius={[0, 0, 2, 2]} />
            <Bar dataKey="habitXP" name="Hábitos" stackId="xp" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

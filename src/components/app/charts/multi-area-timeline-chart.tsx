'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import ChartEmptyState from '@/components/app/chart-empty-state';

const AREA_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#10b981',
  '#ec4899',
];

interface Props {
  data: { date: string; [areaId: string]: number | string }[];
  areas: { area_id: string; area_nombre: string }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-xs space-y-1 max-w-[200px]">
      <p className="font-bold border-b pb-1 mb-1 text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-3">
          <span style={{ color: entry.color }} className="font-medium truncate max-w-[120px]">{entry.name}</span>
          <span className="font-mono font-bold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function MultiAreaTimelineChart({ data, areas }: Props) {
  if (!data.length || !areas.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución Temporal de Áreas</CardTitle>
          <CardDescription>Puntuación de todas las áreas de vida a lo largo del periodo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartEmptyState icon="data" title="Sin datos" message="Amplía el rango de fechas o registra más eventos." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución Temporal de Áreas</CardTitle>
        <CardDescription>Tendencias históricas de puntuación en todas las áreas de vida simultáneamente.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }}
                iconType="circle"
                iconSize={6}
              />
              {areas.map((area, i) => (
                <Line
                  key={area.area_id}
                  type="monotone"
                  dataKey={area.area_id}
                  name={area.area_nombre}
                  stroke={AREA_COLORS[i % AREA_COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

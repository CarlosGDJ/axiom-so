'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ChartEmptyState from '@/components/app/chart-empty-state';

interface RankingData {
    name: string;
    impact: number;
}

interface VariableRankingChartProps {
    data: RankingData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const impact = payload[0].value;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
          <p className="font-bold mb-1">{label}</p>
          <p>Impacto Total: <span className={impact >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>{impact.toFixed(1)}</span></p>
        </div>
      );
    }
    return null;
};

export default function VariableRankingChart({ data }: VariableRankingChartProps) {
    const sortedData = data && data.length > 0
        ? [...data].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 10)
        : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ranking de Variables por Impacto</CardTitle>
                <CardDescription>Las 10 variables con mayor impacto total en el periodo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
                {sortedData.length === 0 ? (
                    <ChartEmptyState
                        icon="bar"
                        title="Sin eventos en este periodo"
                        message="Registra eventos para ver qué variables están impactando tu bienestar."
                        minHeight="h-[250px]"
                    />
                ) : (
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={sortedData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} fontSize={11} stroke="#888888" />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} />
                                <Bar dataKey="impact">
                                    {sortedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.impact >= 0 ? 'hsl(var(--chart-5))' : 'hsl(var(--chart-3))'} />
                                    ))}
                                    <LabelList dataKey="impact" position="right" offset={8} fontSize={11} formatter={(value: number) => (value >= 0 ? `+${value.toFixed(0)}` : value.toFixed(0))} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

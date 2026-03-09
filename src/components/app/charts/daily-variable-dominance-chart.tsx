
'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useMemo } from 'react';

interface DailyDominanceData {
  date: string;
  [key: string]: number | string;
}

interface DailyVariableDominanceChartProps {
    data: DailyDominanceData[];
}

export default function DailyVariableDominanceChart({ data }: DailyVariableDominanceChartProps) {

    const { chartData, chartConfig } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], chartConfig: {} };

        const totalsByVar: Record<string, number> = {};
        data.forEach(day => {
            Object.entries(day).forEach(([key, value]) => {
                if (key === 'date') return;
                const numeric = Number(value) || 0;
                totalsByVar[key] = (totalsByVar[key] || 0) + Math.abs(numeric);
            });
        });

        const variableNames = Object.entries(totalsByVar)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name]) => name);

        const nameToKeyMap: Record<string, string> = {};
        const config: ChartConfig = {};
        let i = 1;
        
        variableNames.forEach((name) => {
            const safeKey = `v_${i}_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
            nameToKeyMap[name] = safeKey;
            const colorIndex = ((i - 1) % 5) + 1;
            config[safeKey] = {
                label: name,
                color: `hsl(var(--chart-${colorIndex}))`
            };
            i++;
        });

        const transformedData = data.map(day => {
            const newDay: any = { date: day.date };
            Object.entries(day).forEach(([key, value]) => {
                if (key !== 'date' && nameToKeyMap[key]) {
                    newDay[nameToKeyMap[key]] = value;
                }
            });
            return newDay;
        });

        return { chartData: transformedData, chartConfig: config };
    }, [data]);
    
    if (!chartData || chartData.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Dominancia Diaria de Variables</CardTitle>
                    <CardDescription>Qué variables (positivas y negativas) dominaron cada día.</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos para mostrar.</p>
                </CardContent>
            </Card>
        )
    }

    const sanitizedKeys = Object.keys(chartConfig);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Dominancia Diaria de Variables</CardTitle>
                <CardDescription>Magnitud del impacto de las variables activas registradas en el periodo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="h-[280px]">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} stackOffset="sign" margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval="preserveStartEnd"
                                    minTickGap={32}
                                />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip content={<ChartTooltipContent indicator='dot' />} />
                                {sanitizedKeys.map(key => (
                                    <Bar 
                                        key={key} 
                                        dataKey={key} 
                                        stackId="a" 
                                        fill={chartConfig[key].color}
                                        radius={[2, 2, 0, 0]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {sanitizedKeys.map((key) => (
                        <div key={`legend-${key}`} className="flex items-center gap-1.5">
                            <span
                                className="h-2.5 w-2.5 rounded-[2px]"
                                style={{ backgroundColor: chartConfig[key].color }}
                            />
                            <span className="max-w-[160px] truncate">{chartConfig[key].label}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

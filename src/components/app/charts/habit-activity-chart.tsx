'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ChartEmptyState from '@/components/app/chart-empty-state';

interface HabitActivityData {
    name: string;
    count: number;
}

interface HabitActivityChartProps {
    data: HabitActivityData[];
}

export default function HabitActivityChart({ data }: HabitActivityChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Actividad por Hábito</CardTitle>
                    <CardDescription>Eventos registrados por variable de hábito.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartEmptyState
                        icon="activity"
                        title="Sin actividad de hábitos"
                        message="Registra eventos vinculados a tus hábitos para ver qué tan consistente eres."
                        minHeight="h-[350px]"
                    />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Actividad por Hábito</CardTitle>
                <CardDescription>Número de eventos registrados para cada variable asociada a un hábito en el periodo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
                             <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={240} 
                                tickLine={false} 
                                axisLine={false} 
                                fontSize={11} 
                                stroke="hsl(var(--muted-foreground))"
                                className="font-medium"
                            />
                            <Tooltip 
                                cursor={{ fill: 'hsl(var(--accent) / 0.1)' }} 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={20}>
                                <LabelList 
                                    dataKey="count" 
                                    position="right" 
                                    offset={10} 
                                    fontSize={11} 
                                    fontWeight="bold"
                                    fill="hsl(var(--foreground))"
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface SystemActivityData {
    name: string;
    count: number;
}

interface SystemActivityChartProps {
    data: SystemActivityData[];
}

export default function SystemActivityChart({ data }: SystemActivityChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Actividad por Sistema</CardTitle>
                    <CardDescription>Eventos registrados por sistema.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <p className="text-muted-foreground">Sin datos de actividad.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Actividad por Sistema</CardTitle>
                <CardDescription>Número de eventos asociados a cada sistema en el periodo seleccionado.</CardDescription>
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

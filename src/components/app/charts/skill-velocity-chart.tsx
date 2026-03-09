'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface SkillVelocityData {
    name: string;
    velocity: number;
}

interface SkillVelocityChartProps {
    data: SkillVelocityData[];
}

export default function SkillVelocityChart({ data }: SkillVelocityChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Velocidad de Habilidad</CardTitle>
                    <CardDescription>Tasa de mejora estimada por semana.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay suficientes datos para calcular la velocidad.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Velocidad de Habilidad</CardTitle>
                <CardDescription>Tasa de mejora estimada por semana, basada en la actividad registrada.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                            <XAxis type="number" hide domain={[0, 10]} />
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
                            <Bar dataKey="velocity" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]} barSize={20}>
                                <LabelList 
                                    dataKey="velocity" 
                                    position="right" 
                                    offset={10} 
                                    fontSize={11} 
                                    fontWeight="bold"
                                    fill="hsl(var(--foreground))"
                                    formatter={(v: number) => v.toFixed(1)}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

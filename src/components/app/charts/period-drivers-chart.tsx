'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Driver {
    name: string;
    impact: number;
}

interface PeriodDriversChartProps {
    data: {
        gains: Driver[];
        drains: Driver[];
    };
}

export default function PeriodDriversChart({ data }: PeriodDriversChartProps) {
     if (!data || (data.gains.length === 0 && data.drains.length === 0)) {
        return (
             <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Impulsores del Periodo</CardTitle>
                    <CardDescription>Las variables que más te han beneficiado y perjudicado.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos para mostrar.</p>
                </CardContent>
            </Card>
        )
    }
    
    const formattedDrains = data.drains.map(d => ({...d, impact: Math.abs(d.impact)})).reverse();

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Impulsores del Periodo (Pareto)</CardTitle>
                <CardDescription>Las variables que más te han beneficiado (ganancias) y perjudicado (drenajes).</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-center mb-2 flex items-center justify-center gap-2 text-green-600">
                        <TrendingUp size={18}/> Ganancias
                    </h4>
                     <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.gains} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} fontSize={11} />
                            <Tooltip cursor={{fill: 'hsl(var(--accent) / 0.2)'}} />
                            <Bar dataKey="impact" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="impact" position="right" offset={8} fontSize={11} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div>
                    <h4 className="font-semibold text-center mb-2 flex items-center justify-center gap-2 text-red-600">
                        <TrendingDown size={18} /> Drenajes
                    </h4>
                     <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={formattedDrains} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} fontSize={11} />
                             <Tooltip cursor={{fill: 'hsl(var(--accent) / 0.2)'}} formatter={(value: number) => -value} />
                            <Bar dataKey="impact" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="impact" position="right" offset={8} fontSize={11} formatter={(value: number) => -value} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

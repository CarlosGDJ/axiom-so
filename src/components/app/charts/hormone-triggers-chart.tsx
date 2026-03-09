'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface Trigger {
    name: string;
    impact: number;
}

interface HormoneTriggersChartProps {
    data: {
        gains: Trigger[];
        drains: Trigger[];
    };
    hormoneName: string;
}

export default function HormoneTriggersChart({ data, hormoneName }: HormoneTriggersChartProps) {
     if (!data || (data.gains.length === 0 && data.drains.length === 0)) {
        return (
             <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Disparadores de {hormoneName}</CardTitle>
                    <CardDescription>Causas principales de cambio.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    <p className="text-muted-foreground text-xs italic">Sin actividad relevante para esta hormona.</p>
                </CardContent>
            </Card>
        )
    }
    
    const formattedDrains = data.drains.map(d => ({...d, impact: Math.abs(d.impact)})).reverse();

    return (
        <Card className="h-full flex flex-col border-primary/10 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Zap size={16} className="text-primary" />
                    Impacto en {hormoneName}
                </CardTitle>
                <CardDescription className="text-xs">Drivers que han alterado este biomarcador en el periodo.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-center mb-1 flex items-center justify-center gap-1.5 text-emerald-600 uppercase tracking-widest bg-emerald-50 py-1 rounded">
                        <TrendingUp size={12}/> Buffs
                    </h4>
                     <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={data.gains} layout="vertical" margin={{ top: 5, right: 35, left: 0, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={70} tickLine={false} axisLine={false} fontSize={9} fontWeight="bold" className="uppercase" />
                            <Tooltip cursor={{fill: 'hsl(var(--accent) / 0.05)'}} />
                            <Bar dataKey="impact" fill="hsl(var(--chart-5))" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="impact" position="right" offset={8} fontSize={10} fontWeight="bold" formatter={(value: number) => `+${value.toFixed(0)}`}/>
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-center mb-1 flex items-center justify-center gap-1.5 text-rose-600 uppercase tracking-widest bg-rose-50 py-1 rounded">
                        <TrendingDown size={12} /> Debuffs
                    </h4>
                     <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={formattedDrains} layout="vertical" margin={{ top: 5, right: 35, left: 0, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={70} tickLine={false} axisLine={false} fontSize={9} fontWeight="bold" className="uppercase" />
                             <Tooltip cursor={{fill: 'hsl(var(--accent) / 0.05)'}} formatter={(value: number) => -value} />
                            <Bar dataKey="impact" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="impact" position="right" offset={8} fontSize={10} fontWeight="bold" formatter={(value: number) => `-${value.toFixed(0)}`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

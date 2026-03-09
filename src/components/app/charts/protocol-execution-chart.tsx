'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface ProtocolExecutionData {
    name: string;
    count: number;
}

interface ProtocolExecutionChartProps {
    data: ProtocolExecutionData[];
}

export default function ProtocolExecutionChart({ data }: ProtocolExecutionChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ejecución de Protocolos</CardTitle>
                    <CardDescription>Veces que has ejecutado cada protocolo.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No se han registrado ejecuciones de protocolos.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Ejecución de Protocolos</CardTitle>
                <CardDescription>Frecuencia de uso de tus protocolos en el periodo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                             <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} angle={-45} textAnchor="end" />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} />
                            <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="count" position="top" offset={4} fontSize={11} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

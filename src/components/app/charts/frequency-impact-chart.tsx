'use client';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface FrequencyImpactData {
    name: string;
    frequency: number;
    impact: number;
    intensity: number;
}

interface FrequencyImpactChartProps {
    data: FrequencyImpactData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
          <p className="font-bold mb-1">{data.name}</p>
          <p>Frecuencia: <span className="font-semibold">{data.frequency} eventos</span></p>
          <p>Impacto Total: <span className="font-semibold">{data.impact.toFixed(1)}</span></p>
          <p>Intensidad Media: <span className="font-semibold">{data.intensity.toFixed(1)}</span></p>
        </div>
      );
    }
    return null;
};

export default function FrequencyImpactChart({ data }: FrequencyImpactChartProps) {
    if (!data || data.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Frecuencia vs. Impacto</CardTitle>
                    <CardDescription>¿Tu problema es la frecuencia o la intensidad de los eventos?</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos para mostrar.</p>
                </CardContent>
            </Card>
        )
    }

    const domainImpact = [Math.min(...data.map(d => d.impact)), Math.max(...data.map(d => d.impact))];
    const rangeSize = [100, 500];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Frecuencia vs. Impacto</CardTitle>
                <CardDescription>¿Tu problema es la frecuencia o la intensidad de los eventos?</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="frequency" name="Frecuencia" unit=" eventos" stroke="#888888" fontSize={12} />
                            <YAxis type="number" dataKey="impact" name="Impacto Total" stroke="#888888" fontSize={12} />
                            <ZAxis type="number" dataKey="intensity" range={rangeSize} name="Intensidad Media" />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter data={data} fill="hsl(var(--primary))" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

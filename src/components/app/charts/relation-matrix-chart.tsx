'use client';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface RelationMatrixData {
    name: string;
    energy: number;
    respect: number;
    size: number;
}

interface RelationMatrixChartProps {
    data: RelationMatrixData[];
}

const CustomTooltipContent = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
          <p className="font-bold mb-1">{data.name}</p>
          <p>Energía Neta: <span className="font-semibold">{data.energy.toFixed(1)}</span></p>
          <p>Respeto Percibido: <span className="font-semibold">{data.respect.toFixed(1)}</span></p>
        </div>
      );
    }
    return null;
};

export default function RelationMatrixChart({ data }: RelationMatrixChartProps) {
    if (!data || data.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Matriz de Relaciones</CardTitle>
                    <CardDescription>Energía vs. Respeto en tus relaciones.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay datos de relaciones para mostrar.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Matriz de Relaciones</CardTitle>
                <CardDescription>Clasifica tus relaciones por su impacto energético y el respeto percibido.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="respect" name="Respeto" unit="/10" domain={[0, 10]} label={{ value: 'Respeto', position: 'insideBottom', offset: -10 }} />
                            <YAxis type="number" dataKey="energy" name="Energía" domain={[-10, 10]} label={{ value: 'Energía', angle: -90, position: 'insideLeft' }}/>
                            <ZAxis type="number" dataKey="size" range={[100, 500]} name="Frecuencia" />
                            <Tooltip content={<CustomTooltipContent />} cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            <Scatter name="Relaciones" data={data} fill="hsl(var(--chart-2))" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

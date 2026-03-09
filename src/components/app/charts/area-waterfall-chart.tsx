
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface WaterfallDataPoint {
  name: string;
  value: number;
  offset: number;
  type: 'start' | 'increase' | 'decrease' | 'total';
}

interface AreaWaterfallChartProps {
  data: WaterfallDataPoint[];
}

const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const change = payload[1]?.value; // 'value' bar
    let changeText = '';
    if (change) {
        changeText = `Cambio: ${change.toFixed(2)}`;
    }
    
    const runningTotal = data.offset + (data.type === 'decrease' ? -data.value : data.value);

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
        <p className="font-bold mb-1">{label}</p>
        { data.type === 'start' || data.type === 'total' ? (
            <p>Valor: {data.value.toFixed(2)}</p>
        ) : (
            <p>Impacto: {(data.type === 'decrease' ? -data.value : data.value).toFixed(2)}</p>
        )}
      </div>
    );
  }
  return null;
};


export default function AreaWaterfallChart({ data }: AreaWaterfallChartProps) {
    if (!data || data.length <= 2) { // must have start, end, and at least one event
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Desglose de Puntuación (Waterfall)</CardTitle>
                    <CardDescription>Explica cómo se llega a la puntuación final del área.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay suficientes eventos para mostrar el desglose.</p>
                </CardContent>
            </Card>
        )
    }

    const COLORS = {
        start: 'hsl(var(--chart-1))',
        increase: 'hsl(var(--chart-2))',
        decrease: 'hsl(var(--chart-3))',
        total: 'hsl(var(--chart-1))',
        offset: 'transparent'
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Desglose de Puntuación (Waterfall)</CardTitle>
                <CardDescription>Explica cómo cada evento ha contribuido a la puntuación final del área seleccionada.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            stackOffset="none"
                            margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={10} />
                            <YAxis domain={[0, 'dataMax + 10']} />
                            <Tooltip content={<CustomTooltipContent />} cursor={{fill: 'hsl(var(--accent) / 0.2)'}} />
                            <Bar dataKey="offset" stackId="a" fill={COLORS.offset} />
                            <Bar dataKey="value" stackId="a">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.type]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

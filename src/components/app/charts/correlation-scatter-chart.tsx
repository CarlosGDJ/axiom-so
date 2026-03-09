'use client';

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

interface CorrelationPoint {
    x: number;
    y: number;
    z?: number;
    date: string;
    label?: string;
}

interface CorrelationScatterChartProps {
    title: string;
    description: string;
    data: CorrelationPoint[];
    xLabel: string;
    yLabel: string;
    xUnit?: string;
    yUnit?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1">
          <p className="font-bold border-b pb-1 mb-1">{data.date}</p>
          <p><span className="text-muted-foreground">{payload[0].name}:</span> <span className="font-mono font-bold text-primary">{data.x}</span></p>
          <p><span className="text-muted-foreground">{payload[1].name}:</span> <span className="font-mono font-bold text-accent">{data.y}</span></p>
          {data.label && <p className="pt-1 italic text-[10px] text-muted-foreground">"{data.label}"</p>}
        </div>
      );
    }
    return null;
};

export default function CorrelationScatterChart({ title, description, data, xLabel, yLabel, xUnit = "", yUnit = "" }: CorrelationScatterChartProps) {
    if (!data || data.length < 2) {
        return (
             <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider font-bold text-muted-foreground">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground text-xs italic">Se necesitan al menos 2 días de datos cruzados para generar la correlación.</p>
                </CardContent>
            </Card>
        )
    }

    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    const xAvg = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    const yAvg = yValues.reduce((a, b) => a + b, 0) / yValues.length;

    return (
        <Card className="h-full border-primary/10 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis 
                                type="number" 
                                dataKey="x" 
                                name={xLabel} 
                                unit={xUnit} 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={10}
                                domain={['auto', 'auto']}
                            >
                                <Label value={xLabel} position="insideBottom" offset={-10} style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }} />
                            </XAxis>
                            <YAxis 
                                type="number" 
                                dataKey="y" 
                                name={yLabel} 
                                unit={yUnit} 
                                stroke="hsl(var(--muted-foreground))" 
                                fontSize={10}
                                domain={['auto', 'auto']}
                            >
                                <Label value={yLabel} angle={-90} position="insideLeft" style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }} />
                            </YAxis>
                            <ZAxis type="number" range={[50, 400]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            
                            {/* Líneas de cuadrantes (Promedios) */}
                            <ReferenceLine x={xAvg} stroke="hsl(var(--primary))" strokeDasharray="3 3" opacity={0.5} />
                            <ReferenceLine y={yAvg} stroke="hsl(var(--accent))" strokeDasharray="3 3" opacity={0.5} />
                            
                            <Scatter 
                                name="Día" 
                                data={data} 
                                fill="hsl(var(--primary))" 
                                fillOpacity={0.6}
                                stroke="hsl(var(--primary))"
                                strokeWidth={1}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-widest text-center opacity-60">
                    <div className="bg-muted p-1 rounded">Media {xLabel}: {xAvg.toFixed(1)}</div>
                    <div className="bg-muted p-1 rounded">Media {yLabel}: {yAvg.toFixed(1)}</div>
                </div>
            </CardContent>
        </Card>
    );
}

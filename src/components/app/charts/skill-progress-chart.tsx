'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import ChartEmptyState from '@/components/app/chart-empty-state';
import { ChartContainer, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star } from 'lucide-react';
import type { Skill } from '@/lib/types';

interface SkillProgressChartProps {
    data: Skill[];
}

const chartConfig = {
    nivel_actual: { 
        label: 'Nivel Actual', 
        color: 'hsl(var(--chart-1))'
    },
    nivel_objetivo: { 
        label: 'Meta Final', 
        color: 'hsl(var(--chart-4))'
    },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const skill = payload[0].payload;
      const xpNeeded = (skill.nivel_actual || 1) * 200;
      const progress = ((skill.xp || 0) / xpNeeded) * 100;

      return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-2 min-w-[180px]">
          <p className="font-bold border-b pb-1 mb-1">{skill.nombre}</p>
          <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Nivel Actual:</span>
              <span className="font-bold text-primary">{skill.nivel_actual}</span>
          </div>
          <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Nivel Objetivo:</span>
              <span className="font-bold text-orange-500">{skill.nivel_objetivo}</span>
          </div>
          <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                  <span>Progreso de XP</span>
                  <span>{skill.xp || 0} / {xpNeeded}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
              </div>
          </div>
        </div>
      );
    }
    return null;
};

export default function SkillProgressChart({ data }: SkillProgressChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Dominio de Habilidades</CardTitle>
                    <CardDescription>Nivel actual vs. objetivo final.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartEmptyState
                        icon="data"
                        title="Sin habilidades definidas"
                        message="Añade habilidades en Gestión de Datos para ver tu progreso y brecha de dominio."
                        minHeight="h-[350px]"
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Dominio de Habilidades
                    </CardTitle>
                </div>
                <CardDescription>Visualiza la brecha entre tu nivel actual y tu potencial máximo.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[450px] mt-4">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 10 }}>
                                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.2} />
                                <YAxis 
                                    dataKey="nombre" 
                                    type="category" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    width={240} 
                                    fontSize={11} 
                                    className="font-medium"
                                    stroke="hsl(var(--foreground))"
                                />
                                <XAxis type="number" hide domain={[0, 10]} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.05)' }} />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right"
                                    height={40}
                                    content={<ChartLegendContent />}
                                />
                                <Bar 
                                    dataKey="nivel_actual" 
                                    fill="hsl(var(--chart-1))" 
                                    radius={[0, 4, 4, 0]} 
                                    name="Nivel Actual" 
                                    barSize={20} 
                                />
                                <Bar 
                                    dataKey="nivel_objetivo" 
                                    fill="hsl(var(--chart-4))" 
                                    radius={[0, 4, 4, 0]} 
                                    name="Meta Final" 
                                    barSize={20} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                
                <div className="mt-8 space-y-4">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] border-b pb-2 flex items-center gap-2">
                        <Star size={12} /> Desglose de XP (Experiencia)
                    </h4>
                    <div className="grid gap-4">
                        {data.map((skill) => {
                            const xpNeeded = (skill.nivel_actual || 1) * 200;
                            const progress = ((skill.xp || 0) / xpNeeded) * 100;
                            return (
                                <div key={skill.id} className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold truncate max-w-[150px]">{skill.nombre}</span>
                                        <span className="text-[10px] font-mono text-muted-foreground">LVL {skill.nivel_actual} • {skill.xp || 0}/{xpNeeded} XP</span>
                                    </div>
                                    <Progress value={progress} className="h-1 bg-muted" />
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer } from '@/components/ui/chart';
import type { Debt } from '@/lib/types';

interface DebtBalanceChartProps {
  data: Debt[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                <p className="font-bold mb-1">{label}</p>
                <p>Saldo Pendiente: <span className="font-semibold">{formatCurrency(payload[0].value)}</span></p>
            </div>
        );
    }
    return null;
};

export default function DebtBalanceChart({ data }: DebtBalanceChartProps) {
    const activeDebts = data.filter(d => d.estado_deuda !== 'Liquidada');

    if (!activeDebts || activeDebts.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Saldos de Deudas</CardTitle>
                    <CardDescription>No hay deudas activas que mostrar.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">¡Felicidades, no tienes deudas activas!</p>
                </CardContent>
            </Card>
        );
    }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldos de Deudas</CardTitle>
        <CardDescription>
          El saldo pendiente de tus deudas activas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer config={{saldo_pendiente: {label: 'Saldo Pendiente'}}} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeDebts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <XAxis dataKey="nombre" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--accent) / 0.2)'}} 
                  content={<CustomTooltip />} 
                />
                <Bar dataKey="saldo_pendiente" radius={[4, 4, 0, 0]} fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

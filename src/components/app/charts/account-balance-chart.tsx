'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer } from '@/components/ui/chart';
import type { Account } from '@/lib/types';

interface AccountBalanceChartProps {
  data: Account[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                <p className="font-bold mb-1">{label}</p>
                <p>Saldo: <span className="font-semibold">{formatCurrency(payload[0].value)}</span></p>
            </div>
        );
    }
    return null;
};

export default function AccountBalanceChart({ data }: AccountBalanceChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Saldos de Cuentas</CardTitle>
                    <CardDescription>No hay cuentas que mostrar.</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <p className="text-muted-foreground">Añade una cuenta para ver el resumen.</p>
                </CardContent>
            </Card>
        );
    }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldos de Cuentas</CardTitle>
        <CardDescription>
          El saldo actual de cada una de tus cuentas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer config={{saldo: {label: 'Saldo'}}} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <XAxis dataKey="cuenta_id" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--accent) / 0.2)'}} 
                  content={<CustomTooltip />} 
                />
                <Bar dataKey="saldo" radius={[4, 4, 0, 0]} fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

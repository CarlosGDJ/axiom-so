'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ChartContainer, ChartLegendContent, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  income: {
    label: 'Ingresos',
    color: 'hsl(var(--chart-2))',
  },
  expenses: {
    label: 'Gastos',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

interface IncomeExpenseChartProps {
  income: number;
  expenses: number;
}

export default function IncomeExpenseChart({ income, expenses }: IncomeExpenseChartProps) {
  const chartData = [{ name: 'Mes Actual', income, expenses }];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const net = payload[0].value - payload[1].value;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Ingresos
              </span>
              <span className="font-bold" style={{color: 'hsl(var(--chart-2))'}}>
                {formatCurrency(payload[0].value)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Gastos
              </span>
              <span className="font-bold" style={{color: 'hsl(var(--chart-3))'}}>
                {formatCurrency(payload[1].value)}
              </span>
            </div>
          </div>
           <div className="mt-2 pt-2 border-t">
             <div className="flex flex-col">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                    Neto
                </span>
                <span className={`font-bold ${net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(net)}
                </span>
             </div>
           </div>
        </div>
      );
    }
  
    return null;
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos vs. Gastos</CardTitle>
        <CardDescription>
          Un resumen de tus ingresos y gastos totales para el mes actual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20 }}>
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--background) / 0.5)'}} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

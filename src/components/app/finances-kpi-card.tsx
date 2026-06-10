'use client';

import type { UserData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface FinancesKpiCardProps {
  monthlyFinancials: UserData['kpis']['monthlyFinancials'];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);
}

export default function FinancesKpiCard({ monthlyFinancials }: FinancesKpiCardProps) {
  const { totalIncome, totalExpenses } = monthlyFinancials;
  const net = totalIncome - totalExpenses;
  const NetIcon = net > 0 ? TrendingUp : net < 0 ? TrendingDown : Minus;
  const netColor = net > 0 ? 'text-green-500' : net < 0 ? 'text-red-500' : 'text-muted-foreground';
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-primary" />
          Finanzas del Mes
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" asChild>
          <Link href="/dashboard/finances">
            Ver todo <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ingresos</p>
            <p className="text-lg font-black text-green-500 tabular-nums leading-none">
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gastos</p>
            <p className="text-lg font-black text-orange-500 tabular-nums leading-none">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Neto</p>
            <div className="flex items-center gap-1">
              <NetIcon className={cn('h-4 w-4 shrink-0', netColor)} />
              <p className={cn('text-lg font-black tabular-nums leading-none', netColor)}>
                {formatCurrency(net)}
              </p>
            </div>
          </div>
        </div>

        {totalIncome > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Tasa de ahorro
              </span>
              <span className={cn('text-xs font-black tabular-nums', savingsRate >= 20 ? 'text-green-500' : savingsRate >= 0 ? 'text-orange-500' : 'text-red-500')}>
                {savingsRate}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  savingsRate >= 20 ? 'bg-green-500' : savingsRate >= 0 ? 'bg-orange-500' : 'bg-red-500',
                )}
                style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

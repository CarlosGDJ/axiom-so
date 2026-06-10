'use client';

import { useMemo } from 'react';
import type { Debt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Snowflake, Flame, TrendingDown, Clock, Coins, Trophy } from 'lucide-react';
import { simulateDebtPayoff, sortSnowball, sortAvalanche } from '@/lib/debt-simulation';
import { cn } from '@/lib/utils';

interface DebtStrategyComparisonProps {
  debts: Debt[];
  onSelect: (strategy: 'snowball' | 'avalanche') => void;
  selected?: string | null;
}

function KpiCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn('rounded-lg p-3 text-center', highlight ? 'bg-primary/10 border border-primary/30' : 'bg-muted/40')}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</p>
      <p className={cn('text-lg font-bold font-mono', highlight && 'text-primary')}>{value}</p>
    </div>
  );
}

export default function DebtStrategyComparison({ debts, onSelect, selected }: DebtStrategyComparisonProps) {
  const activeDebts = useMemo(() => debts.filter(d => d.estado_deuda !== 'Liquidada'), [debts]);

  const { snowball, avalanche } = useMemo(() => {
    const snow = simulateDebtPayoff(sortSnowball(activeDebts));
    const aval = simulateDebtPayoff(sortAvalanche(activeDebts));
    return { snowball: snow, avalanche: aval };
  }, [activeDebts]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const formatMonths = (m: number) => {
    if (m <= 0) return '—';
    const years = Math.floor(m / 12);
    const months = m % 12;
    if (years === 0) return `${months}m`;
    if (months === 0) return `${years}a`;
    return `${years}a ${months}m`;
  };

  const interestSaved = snowball.totalInterestPaid - avalanche.totalInterestPaid;
  const monthsSaved = snowball.monthsToFreedom - avalanche.monthsToFreedom;
  const avalancheWins = interestSaved > 0;

  const strategies = [
    {
      id: 'snowball' as const,
      label: 'Bola de Nieve',
      icon: Snowflake,
      color: 'blue',
      tagline: 'Para la motivación',
      description:
        'Ataca la deuda de menor saldo primero. Cada victoria rápida genera impulso emocional para seguir.',
      result: snowball,
      pros: ['Victorias rápidas y visibles', 'Mayor adherencia psicológica', 'Ideal si tienes muchas deudas pequeñas'],
      cons: ['Pagas más intereses en total', 'Puede tardar más tiempo'],
    },
    {
      id: 'avalanche' as const,
      label: 'Avalanche',
      icon: Flame,
      color: 'orange',
      tagline: 'Para el ahorro máximo',
      description:
        'Ataca la deuda con mayor tasa de interés primero. Minimiza el coste total y el tiempo total de deuda.',
      result: avalanche,
      pros: ['Menos interés pagado en total', 'Matemáticamente óptimo', 'Libera flujo de caja antes'],
      cons: ['Las primeras victorias pueden tardar más', 'Requiere mayor disciplina'],
    },
  ];

  return (
    <div className="space-y-6">
      {activeDebts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay deudas activas para comparar.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen comparativo */}
          {avalancheWins && interestSaved > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Trophy className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold">Avalanche ahorra </span>
                    <span className="font-bold text-primary">{formatCurrency(interestSaved)}</span>
                    <span className="font-semibold"> en intereses</span>
                    {monthsSaved > 0 && (
                      <span className="text-muted-foreground"> y {formatMonths(monthsSaved)} menos de deuda.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {strategies.map(({ id, label, icon: Icon, color, tagline, description, result, pros, cons }) => {
              const isSelected = selected === id;
              const isBetter = id === 'avalanche' ? avalancheWins : !avalancheWins;

              return (
                <Card
                  key={id}
                  className={cn(
                    'flex flex-col transition-all',
                    isSelected && 'ring-2 ring-primary border-primary',
                    isBetter && !isSelected && 'border-primary/40',
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-5 w-5', color === 'orange' ? 'text-orange-500' : 'text-blue-500')} />
                        <CardTitle className="text-lg">{label}</CardTitle>
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {isBetter && <Badge className="text-[10px]">Recomendado</Badge>}
                        {isSelected && <Badge variant="outline" className="text-[10px]">Activo</Badge>}
                      </div>
                    </div>
                    <CardDescription className="text-xs font-medium text-primary">{tagline}</CardDescription>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <KpiCell
                        label="Interés total"
                        value={formatCurrency(result.totalInterestPaid)}
                        highlight={id === 'avalanche' && avalancheWins}
                      />
                      <KpiCell
                        label="Libre de deuda"
                        value={formatMonths(result.monthsToFreedom)}
                        highlight={id === 'avalanche' && monthsSaved > 0}
                      />
                      <KpiCell
                        label="Total pagado"
                        value={formatCurrency(result.totalPaid)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1.5">
                        <p className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" /> Ventajas
                        </p>
                        {pros.map((p) => <p key={p} className="text-muted-foreground pl-4">· {p}</p>)}
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Limitaciones
                        </p>
                        {cons.map((c) => <p key={c} className="text-muted-foreground pl-4">· {c}</p>)}
                      </div>
                    </div>

                    {result.payoffOrder.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                          <Coins className="h-3 w-3" /> Orden de liquidación
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {result.payoffOrder.map((name, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {i + 1}. {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <div className="p-6 pt-0">
                    <button
                      onClick={() => onSelect(id)}
                      className={cn(
                        'w-full rounded-lg py-2.5 text-sm font-semibold transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border hover:border-primary hover:bg-primary/10',
                      )}
                    >
                      {isSelected ? '✓ Estrategia activa' : `Usar ${label}`}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

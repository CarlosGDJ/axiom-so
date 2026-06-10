'use client';

import { useState } from 'react';
import type { Debt, Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Flame, PlusCircle, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import EditDebtForm from '../data-table/forms/edit-debt-form';
import AmortizationTable from './amortization-table';

interface DebtAvalancheStrategyProps {
  debts: Debt[];
  transactions: Transaction[];
}

export default function DebtAvalancheStrategy({ debts, transactions }: DebtAvalancheStrategyProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  // Avalanche: highest interest rate first — minimizes total interest paid
  const sortedDebts = [...debts]
    .filter(d => d.estado_deuda !== 'Liquidada')
    .sort((a, b) => b.interes_tae - a.interes_tae);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

  const handleEdit = (e: React.MouseEvent, debt: Debt) => {
    e.stopPropagation();
    setEditingDebt(debt);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingDebt(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Estrategia: Avalanche</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Tus deudas están ordenadas de mayor a menor tasa de interés. El sistema ataca primero la deuda más cara para minimizar el coste total de la deuda.
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0">
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Deuda
        </Button>
      </div>

      <div className="space-y-4">
        {sortedDebts.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No tienes deudas activas registradas.
            </CardContent>
          </Card>
        )}
        {sortedDebts.map((debt, index) => {
          const isSelected = selectedDebtId === debt.id;
          const balance = debt.saldo_pendiente ?? debt.saldo_actual;
          const original = debt.principal_inicial ?? balance;
          const progress = original > 0 ? Math.min(100, ((original - balance) / original) * 100) : 0;

          const debtTransactions = transactions.filter(
            t => t.deuda_id === debt.debt_id && t.tipo === 'Gasto'
          );
          const totalPaid = debtTransactions.reduce((acc, t) => acc + Math.abs(t.monto), 0);

          return (
            <div key={debt.id} className="space-y-2">
              <Card
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:border-primary/50',
                  isSelected ? 'border-primary ring-1 ring-primary/20 shadow-md bg-primary/5' : 'bg-card',
                  index === 0 && 'border-orange-500/40 bg-orange-500/5',
                )}
                onClick={() => setSelectedDebtId(selectedDebtId === debt.id ? null : debt.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base truncate">{debt.nombre}</CardTitle>
                        {index === 0 && (
                          <Badge className="bg-orange-500 text-white text-[10px] gap-1">
                            <Flame className="h-2.5 w-2.5" /> Atacar ahora
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">{debt.tipo}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono font-bold text-foreground text-sm">{formatCurrency(balance)}</span>
                        <span>TAE: <span className="font-bold text-orange-500">{debt.interes_tae.toFixed(2)}%</span></span>
                        <span>Cuota: {formatCurrency(debt.cuota_mensual)}/mes</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <button
                        onClick={(e) => handleEdit(e, debt)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Editar"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Progreso pagado</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pagado hasta hoy</span>
                    <span className="font-mono font-semibold text-green-500">{formatCurrency(totalPaid)}</span>
                  </div>
                  {isSelected ? <ChevronUp className="h-3 w-3 mx-auto text-muted-foreground" /> : <ChevronDown className="h-3 w-3 mx-auto text-muted-foreground" />}
                </CardContent>
              </Card>
              {isSelected && (
                <div className="pl-4 md:pl-8 border-l-4 border-orange-500/20 pt-2 pb-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-px flex-grow bg-orange-500/10" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60">Cuadro de Amortización</span>
                    <div className="h-px flex-grow bg-orange-500/10" />
                  </div>
                  <AmortizationTable debt={debt} transactions={transactions} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingDebt ? 'Configurar Deuda' : 'Nueva Inyección de Deuda'}</DialogTitle>
            <DialogDescription>
              Ajusta los parámetros contractuales para que Axiom recalcule tu plan de salida.
            </DialogDescription>
          </DialogHeader>
          <EditDebtForm entity={editingDebt} closeDialog={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

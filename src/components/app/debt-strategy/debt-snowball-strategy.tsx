
'use client';

import { useState } from 'react';
import type { Debt, Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, PlusCircle, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import EditDebtForm from '../data-table/forms/edit-debt-form';
import AmortizationTable from './amortization-table';

interface DebtSnowballStrategyProps {
  debts: Debt[];
  transactions: Transaction[];
}

export default function DebtSnowballStrategy({ debts, transactions }: DebtSnowballStrategyProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  const sortedDebts = [...debts]
    .filter(d => d.estado_deuda !== 'Liquidada')
    .sort((a, b) => (a.saldo_pendiente ?? a.saldo_actual) - (b.saldo_pendiente ?? b.saldo_actual));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };
  
  const handleEdit = (e: React.MouseEvent, debt: Debt) => {
    e.stopPropagation();
    setEditingDebt(debt);
    setDialogOpen(true);
  }

  const handleAdd = () => {
    setEditingDebt(undefined);
    setDialogOpen(true);
  }

  const handleCardClick = (debtId: string) => {
    setSelectedDebtId(selectedDebtId === debtId ? null : debtId);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Estrategia: Bola de Nieve</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Tus deudas están ordenadas de menor a mayor saldo. El sistema recomienda atacar primero la deuda más pequeña para generar momentum psicológico.
          </p>
        </div>
        <Button onClick={handleAdd} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Deuda
        </Button>
      </div>

      <div className="space-y-4">
        {sortedDebts.map((debt, index) => {
          const isSelected = selectedDebtId === debt.id;
          
          return (
            <div key={debt.id} className="space-y-2">
              <Card 
                className={cn(
                    'cursor-pointer transition-all duration-200 hover:border-primary/50',
                    isSelected ? 'border-primary ring-1 ring-primary/20 shadow-md bg-primary/5' : 'bg-card'
                )} 
                onClick={() => handleCardClick(debt.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg font-bold">
                          {debt.nombre}
                        </CardTitle>
                        {index === 0 && (
                          <Badge className="bg-primary text-white hover:bg-primary/90 text-[10px] uppercase font-black tracking-widest px-2 py-0.5">
                            <Target className="mr-1.5 h-3 w-3" />
                            Objetivo Prioritario
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                         <Badge variant="secondary" className="text-[10px] h-5">{debt.tipo}</Badge>
                         <Badge 
                            variant={debt.estres_psicologico === 'Alto' ? 'destructive' : 'outline'}
                            className="text-[10px] h-5"
                         >
                            Estrés {debt.estres_psicologico}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-4">
                        <div>
                            <p className="text-xl font-black italic text-primary">{formatCurrency(debt.saldo_pendiente ?? debt.saldo_actual)}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Pendiente</p>
                        </div>
                        {isSelected ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                   <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                            <span className="text-muted-foreground">Amortizado</span>
                            <span className="text-primary">{debt.porcentaje_pagado?.toFixed(0) ?? 0}%</span>
                        </div>
                        <Progress value={debt.porcentaje_pagado ?? 0} className="h-1.5" />
                    </div>
                     <div className="flex justify-end pt-3">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest hover:text-primary" onClick={(e) => handleEdit(e, debt)}>
                            <Edit className="mr-1.5 h-3 w-3"/>
                            Editar Parámetros
                        </Button>
                    </div>
                </CardContent>
              </Card>

              {/* TABLA DE REGISTRO INLINE */}
              {isSelected && (
                <div className="pl-4 md:pl-8 border-l-4 border-primary/20 pt-2 pb-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="mb-4 flex items-center gap-2">
                        <div className="h-px flex-grow bg-primary/10" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Cuadro de Registro y Amortización</span>
                        <div className="h-px flex-grow bg-primary/10" />
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

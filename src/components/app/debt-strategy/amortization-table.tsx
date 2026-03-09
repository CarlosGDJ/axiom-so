'use client';

import { useState, useMemo } from 'react';
import type { Debt, Transaction } from '@/lib/types';
import { addMonths, format, isBefore, startOfToday, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap } from 'lucide-react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AmortizationRow {
  month: number;
  date: Date;
  payment: number;
  interest: number;
  principal: number;
  remainingBalance: number;
  isPaid: boolean;
  extraPaid?: number; // Real extra paid in a registered transaction
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

export default function AmortizationTable({ debt, transactions }: { debt: Debt, transactions: Transaction[] }) {
  const [simulationExtra, setSimulationExtra] = useState(0);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AmortizationRow | null>(null);
  const [extraAmortizationInput, setExtraAmortizationInput] = useState(0);

  const handleOpenRegisterDialog = (row: AmortizationRow) => {
    setSelectedRow(row);
    setExtraAmortizationInput(0); 
    setPaymentDialogOpen(true);
  };
  
  const handleConfirmPayment = () => {
    if (!user || !firestore || !selectedRow) return;

    const totalPayment = selectedRow.payment + (extraAmortizationInput || 0);

    const transactionData = {
        transaccion_id: `TRN_DEBT_${debt.debt_id}_${selectedRow.month}_${Date.now()}`,
        fecha: selectedRow.date.toISOString(),
        tipo: 'Gasto' as const,
        categoria: 'Deudas' as const,
        monto: -totalPayment,
        impulsivo: false,
        deuda_id: debt.debt_id,
        cuenta_id: 'default',
        notas: `Pago ${selectedRow.month} de la deuda "${debt.nombre}"${extraAmortizationInput > 0 ? ` (con ${formatCurrency(extraAmortizationInput)} de amortización extra)` : ''}.`,
    };
    
    const transactionCollectionRef = collection(firestore, `users/${user.uid}/transactions`);
    addDocumentNonBlocking(transactionCollectionRef, transactionData);

    toast({
        title: 'Pago Registrado',
        description: `Se ha registrado el pago de ${formatCurrency(totalPayment)}.`,
    });

    setPaymentDialogOpen(false);
    setSelectedRow(null);
  };


  const schedule = useMemo(() => {
    const rows: AmortizationRow[] = [];
    let balance = debt.saldo_actual; // Base starting point
    const monthlyRate = (debt.interes_tae / 100) / 12;
    
    // We use the debt's official installment for the schedule logic
    // but the simulation slider affects the projection.
    const totalScheduledMonthly = debt.cuota_mensual + simulationExtra;
    
    let currentDate = new Date(debt.fecha_inicio);
    let month = 0;

    const debtPayments = transactions.filter(t => t.deuda_id === debt.debt_id);

    while (balance > 0 && month < 480) { 
      month++;
      const paymentDate = addMonths(currentDate, month - 1);
      const monthKey = format(paymentDate, 'yyyy-MM');
      
      const interestPayment = balance * monthlyRate;
      let principalPayment = totalScheduledMonthly - interestPayment;

      // Check for real history
      const realTransaction = debtPayments.find(t => format(new Date(t.fecha), 'yyyy-MM') === monthKey);
      const isPaid = !!realTransaction;
      const realTotalPaid = realTransaction ? Math.abs(realTransaction.monto) : 0;
      
      // Calculate real extra paid compared to the BASE installment (without simulation)
      const realExtra = isPaid ? Math.max(0, realTotalPaid - debt.cuota_mensual) : 0;

      if (balance - principalPayment < 0) {
        principalPayment = balance;
        balance = 0;
      } else {
        balance -= principalPayment;
      }

      rows.push({
        month,
        date: paymentDate,
        payment: isPaid ? realTotalPaid : (principalPayment + interestPayment),
        interest: interestPayment,
        principal: principalPayment,
        remainingBalance: balance,
        isPaid: isPaid,
        extraPaid: realExtra > 0.01 ? realExtra : undefined
      });

      if (balance <= 0) break;
    }
    return rows;
  }, [debt, simulationExtra, transactions]);

  const originalScheduleMonths = useMemo(() => {
    let balance = debt.saldo_actual;
    const monthlyRate = (debt.interes_tae / 100) / 12;
    let months = 0;
    while(balance > 0 && months < 480) {
      months++;
      const interest = balance * monthlyRate;
      balance -= (debt.cuota_mensual - interest);
    }
    return months;
  }, [debt]);

  const totalInterestPaid = schedule.reduce((acc, row) => acc + row.interest, 0);
  const originalTotalInterest = (debt.cuota_mensual * originalScheduleMonths) - debt.saldo_actual;
  const interestSaved = originalTotalInterest - totalInterestPaid;
  const newPayoffDate = schedule.length > 0 ? format(schedule[schedule.length - 1].date, 'MMM yyyy', { locale: es }) : 'N/A';
  const originalPayoffDate = format(addMonths(new Date(debt.fecha_inicio), originalScheduleMonths), 'MMM yyyy', { locale: es });


  return (
    <>
      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
               <div className="space-y-2">
                  <Label htmlFor="simulation-extra" className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                    <Zap className="h-3 w-3 text-primary fill-primary" />
                    Simulador Amortización Extra Mensual
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">€</span>
                    <Input
                        id="simulation-extra"
                        type="number"
                        value={simulationExtra || ''}
                        onChange={(e) => setSimulationExtra(Number(e.target.value))}
                        placeholder="0"
                        className="pl-7 font-bold border-primary/20 focus:ring-primary h-9"
                    />
                  </div>
              </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
                  <div className="bg-background/50 p-2 rounded border border-border/50">
                      <p className="text-[9px] uppercase font-black text-muted-foreground leading-none mb-1">Liq. Base</p>
                      <p className="text-xs font-bold">{originalPayoffDate}</p>
                  </div>
                  <div className="bg-primary/5 p-2 rounded border border-primary/10">
                      <p className="text-[9px] uppercase font-black text-primary leading-none mb-1">Objetivo</p>
                      <p className="text-xs font-black text-primary">{newPayoffDate}</p>
                  </div>
                   <div className="bg-background/50 p-2 rounded border border-border/50">
                      <p className="text-[9px] uppercase font-black text-muted-foreground leading-none mb-1">Interés Total</p>
                      <p className="text-xs font-bold">{formatCurrency(totalInterestPaid)}</p>
                  </div>
                  <div className="bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                      <p className="text-[9px] uppercase font-black text-emerald-600 leading-none mb-1">Ahorro</p>
                      <p className="text-xs font-black text-emerald-600">{formatCurrency(interestSaved)}</p>
                  </div>
              </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] relative">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background shadow-sm border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px] text-[10px] font-black uppercase tracking-widest">Mes</TableHead>
                  <TableHead className="w-[110px] text-[10px] font-black uppercase tracking-widest">Fecha</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Pago Realizado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Intereses</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Capital</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Acción</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Saldo Restante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((row) => (
                  <TableRow key={row.month} className={cn(
                    "hover:bg-muted/30 transition-colors",
                    row.isPaid ? "bg-emerald-50/20" : ""
                  )}>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{row.month}</TableCell>
                    <TableCell className="text-xs font-medium">{format(row.date, 'MMM yyyy', { locale: es })}</TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="font-black text-sm">{formatCurrency(row.payment)}</span>
                            {row.extraPaid && (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                    <Zap className="h-2.5 w-2.5 fill-emerald-600" />
                                    +{formatCurrency(row.extraPaid)} extra
                                </span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className="text-rose-500 text-xs font-medium">{formatCurrency(row.interest)}</TableCell>
                    <TableCell className="text-emerald-600 text-xs font-medium">{formatCurrency(row.principal)}</TableCell>
                     <TableCell className="text-center">
                      {row.isPaid ? (
                          <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black text-[9px] uppercase bg-emerald-100/50 py-1 px-2 rounded-full border border-emerald-200">
                              <CheckCircle className="h-3 w-3" />
                              PROCESADO
                          </div>
                      ) : (
                          <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] font-black uppercase tracking-tighter hover:bg-primary hover:text-white"
                              onClick={() => handleOpenRegisterDialog(row)}
                              disabled={isBefore(startOfToday(), startOfMonth(row.date))}
                          >
                              REGISTRAR
                          </Button>
                      )}
                     </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-muted-foreground">{formatCurrency(row.remainingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-primary">Registrar Pago de Deuda</DialogTitle>
                  <DialogDescription className="text-xs font-medium">
                      Período: {selectedRow ? format(selectedRow.date, 'MMMM yyyy', { locale: es }) : ''}
                  </DialogDescription>
              </DialogHeader>
              {selectedRow && (
                  <div className="space-y-6 py-4">
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-xl border border-border/50">
                          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cuota base:</span>
                          <span className="font-black text-xl">{formatCurrency(selectedRow.payment)}</span>
                      </div>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="extra-amortization" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Amortización Extra</Label>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">REDUCE INTERESES</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">€</span>
                            <Input
                                id="extra-amortization"
                                type="number"
                                value={extraAmortizationInput || ''}
                                onChange={(e) => setExtraAmortizationInput(Number(e.target.value))}
                                placeholder="Ej: 50"
                                className="pl-7 font-black text-lg border-emerald-500/20 focus:ring-emerald-500"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight italic">Cualquier euro extra hoy se descuenta directamente del capital, evitando que genere intereses en los meses futuros.</p>
                      </div>
                      
                      <div className="pt-4 border-t border-dashed">
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">TOTAL TRANSACCIÓN:</span>
                            <span className="text-3xl font-black italic tracking-tighter text-slate-900">{formatCurrency(selectedRow.payment + (extraAmortizationInput || 0))}</span>
                        </div>
                      </div>
                  </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                  <Button variant="ghost" onClick={() => setPaymentDialogOpen(false)} className="font-bold text-xs uppercase tracking-widest h-11">Cancelar</Button>
                  <Button onClick={handleConfirmPayment} className="font-black text-xs uppercase tracking-widest h-11 px-8 shadow-xl shadow-primary/20">Confirmar y Registrar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
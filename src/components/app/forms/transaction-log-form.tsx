
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import type { Account, Transaction, Debt } from '@/lib/types';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
import { Plus, X } from 'lucide-react';
import { revalidateCollection } from '@/hooks/use-mongo-collection';
import { useFinanceCategories } from '@/hooks/use-finance-categories';

const formSchema = z.object({
  tipo: z.enum(['Gasto', 'Ingreso'], {
    required_error: 'Por favor, selecciona si es un gasto o un ingreso.',
  }),
  // Categoría dinámica (catálogo editable por el usuario), ya no enum estático.
  categoria: z.string({ required_error: 'Por favor, selecciona una categoría.' })
    .min(1, 'Por favor, selecciona una categoría.'),
  monto: z.coerce.number().positive('El importe debe ser un número positivo.'),
  impulsivo: z.boolean().default(false),
  notas: z.string().optional(),
  cuenta_id: z.string({ required_error: 'Por favor, selecciona una cuenta.'}),
  deuda_id: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;
type PrefillValues = Partial<TransactionFormValues>;

interface TransactionLogFormProps {
    entity?: Transaction;
    accounts?: Account[];
    debts?: Debt[];
    closeDialog: () => void;
    prefill?: PrefillValues;
}

const ACCOUNT_TIPOS = ['Banco', 'Efectivo', 'Inversion', 'Otro'] as const;
type AccountTipo = typeof ACCOUNT_TIPOS[number];

export default function TransactionLogForm({ entity: transaction, accounts, debts, closeDialog, prefill }: TransactionLogFormProps) {
  const { toast } = useToast();
  const { user, uid } = useUser();
  const { expenseCategories, incomeCategories } = useFinanceCategories();
  const isEditMode = !!transaction;

  // Local accounts list so a newly created account is immediately selectable
  const [localAccounts, setLocalAccounts] = useState<Account[]>(accounts ?? []);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccNombre, setNewAccNombre] = useState('');
  const [newAccTipo, setNewAccTipo] = useState<AccountTipo>('Banco');
  const [newAccSaldo, setNewAccSaldo] = useState('0');

  useEffect(() => { setLocalAccounts(accounts ?? []); }, [accounts]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...transaction,
      monto: Math.abs(transaction.monto),
      notas: transaction.notas || '',
      cuenta_id: transaction.cuenta_id,
      deuda_id: transaction.deuda_id,
    } : {
      impulsivo: false,
      tipo: 'Gasto',
      notas: '',
      cuenta_id: accounts?.[0]?.cuenta_id,
      ...prefill
    },
  });

  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        impulsivo: false,
        tipo: 'Gasto',
        notas: '',
        cuenta_id: accounts?.[0]?.cuenta_id,
        ...prefill,
      });
    }
  }, [prefill, form, isEditMode, accounts]);

  const transactionType = form.watch('tipo');
  const category = form.watch('categoria');

  function handleCreateAccount() {
    if (!newAccNombre.trim() || !uid) return;
    const nombre = newAccNombre.trim();
    const cuenta_id = `ACC_${Date.now()}`; // id estable, no el nombre
    const saldo = parseFloat(newAccSaldo) || 0;
    addDocumentNonBlocking('financialAccounts', { cuenta_id, nombre, tipo: newAccTipo, saldo });
    revalidateCollection('financialAccounts');
    setLocalAccounts(prev => [
      ...prev,
      { id: `local_${Date.now()}`, cuenta_id, nombre, tipo: newAccTipo, saldo } as Account,
    ]);
    form.setValue('cuenta_id', cuenta_id);
    setShowNewAccount(false);
    setNewAccNombre('');
    setNewAccSaldo('0');
    setNewAccTipo('Banco');
    toast({ title: 'Cuenta creada', description: `"${cuenta_id}" añadida y seleccionada.` });
  }

  async function onSubmit(data: TransactionFormValues) {
    if (!uid) return;

    const finalAmount = data.tipo === 'Gasto' ? -Math.abs(data.monto) : Math.abs(data.monto);
    const normalizedDebtId = data.categoria === 'Deudas' ? (data.deuda_id ?? '') : '';

    const transactionData: any = {
      ...data,
      deuda_id: normalizedDebtId,
      monto: finalAmount,
      fecha: new Date().toISOString(),
    };

    if (data.impulsivo) {
      transactionData.var_id = 'GASTO_IMP';
    }

    if (isEditMode) {
      const { id, ...dataToSave } = { ...transaction, ...transactionData };
      setDocumentNonBlocking('transactions', transaction.id, dataToSave, { merge: true });
      toast({ title: 'Transacción Actualizada', description: 'Se ha actualizado la transacción.' });
    } else {
      transactionData.transaccion_id = `TRN_${Date.now()}`;
      addDocumentNonBlocking('transactions', transactionData);
      toast({ title: 'Transacción Registrada', description: `Se ha registrado un ${data.tipo.toLowerCase()} de ${data.monto}€ con éxito.` });
    }

    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-6 p-1 max-h-[65vh] overflow-y-auto pr-4">

          {/* ── Cuenta ── */}
          <FormField
            control={form.control}
            name="cuenta_id"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Cuenta</FormLabel>
                  <button
                    type="button"
                    onClick={() => setShowNewAccount(v => !v)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    {showNewAccount
                      ? <><X className="h-3 w-3" /> Cancelar</>
                      : <><Plus className="h-3 w-3" /> Nueva cuenta</>
                    }
                  </button>
                </div>

                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una cuenta..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {localAccounts.map((acc) => (
                      <SelectItem key={acc.id ?? acc.cuenta_id} value={acc.cuenta_id}>
                        {acc.nombre ?? acc.cuenta_id} ({acc.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Inline new-account mini-form */}
                {showNewAccount && (
                  <div className="mt-2 rounded-lg border border-dashed border-primary/40 bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nueva cuenta</p>
                    <Input
                      placeholder="Nombre (ej. Santander, Efectivo casa…)"
                      value={newAccNombre}
                      onChange={e => setNewAccNombre(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newAccTipo} onValueChange={v => setNewAccTipo(v as AccountTipo)}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" inputMode="decimal"
                        placeholder="Saldo inicial (€)"
                        value={newAccSaldo}
                        onChange={e => setNewAccSaldo(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-8"
                      disabled={!newAccNombre.trim()}
                      onClick={handleCreateAccount}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Crear y seleccionar
                    </Button>
                  </div>
                )}

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Transacción</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Gasto">Gasto</SelectItem>
                    <SelectItem value="Ingreso">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(transactionType === 'Gasto' ? expenseCategories : incomeCategories).map((cat) => (
                      <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {category === 'Deudas' && (
            <FormField
              control={form.control}
              name="deuda_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deuda Asociada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una deuda..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {debts?.filter(d => d.estado_deuda === 'Activa').map((debt) => (
                        <SelectItem key={debt.id} value={debt.debt_id}>
                          {debt.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Selecciona la deuda a la que se aplica este pago.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="monto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importe (€)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="decimal" placeholder="ej. 25.50" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {transactionType === 'Gasto' && (
            <FormField
              control={form.control}
              name="impulsivo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>¿Fue un gasto impulsivo?</FormLabel>
                    <FormDescription>Marca esto si fue una compra no planificada.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Input placeholder="Nota breve sobre la transacción..." {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
          <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  );
}

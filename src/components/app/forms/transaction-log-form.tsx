
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
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useEffect } from 'react';
import type { Account, Transaction, Debt } from '@/lib/types';

const expenseCategories = [
  'Vivienda', 'Alimentación', 'Transporte', 'Salud y Bienestar',
  'Ocio y Suscripciones', 'Desarrollo Personal', 'Compras', 'Deudas',
  'Regalos y Donaciones', 'Otros Gastos'
];

const incomeCategories = [
  'Nómina', 'Freelance/Negocio', 'Ingresos Pasivos', 'Regalos', 'Otros Ingresos'
];

const allCategories = [...expenseCategories, ...incomeCategories] as [string, ...string[]];


const formSchema = z.object({
  tipo: z.enum(['Gasto', 'Ingreso'], {
    required_error: 'Por favor, selecciona si es un gasto o un ingreso.',
  }),
  categoria: z.enum(allCategories, {
    required_error: 'Por favor, selecciona una categoría.',
  }),
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

export default function TransactionLogForm({ entity: transaction, accounts, debts, closeDialog, prefill }: TransactionLogFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!transaction;
  

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

  // Reset form when prefill data changes (only for creation mode)
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

  async function onSubmit(data: TransactionFormValues) {
    if (!user || !firestore) return;
    
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
      const docRef = doc(firestore, `users/${user.uid}/transactions`, transaction.id);
      const { id, ...dataToSave } = { ...transaction, ...transactionData };
      setDocumentNonBlocking(docRef, dataToSave, { merge: true });
       toast({
        title: 'Transacción Actualizada',
        description: `Se ha actualizado la transacción.`,
      });

    } else {
        transactionData.transaccion_id = `TRN_${Date.now()}`;
        const transactionCollectionRef = collection(firestore, `users/${user.uid}/transactions`);
        addDocumentNonBlocking(transactionCollectionRef, transactionData);
        toast({
        title: 'Transacción Registrada',
        description: `Se ha registrado un ${data.tipo.toLowerCase()} de ${data.monto}€ con éxito.`,
        });
    }
    
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-6 p-1 max-h-[65vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="cuenta_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una cuenta..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.cuenta_id}>
                        {acc.cuenta_id} ({acc.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                  <Input type="number" placeholder="ej. 25.50" {...field} value={field.value ?? ''} />
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

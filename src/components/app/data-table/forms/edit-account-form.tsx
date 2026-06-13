
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
import { useToast } from '@/hooks/use-toast';
import { Account } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
import { revalidateCollection } from '@/hooks/use-mongo-collection';

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio.'),
  tipo: z.enum(['Banco', 'Efectivo', 'Inversion', 'Otro']),
  saldo: z.coerce.number().default(0),
});

type EditAccountFormValues = z.infer<typeof formSchema>;

interface EditAccountFormProps {
  entity?: Account;
  closeDialog: () => void;
}

export default function EditAccountForm({ entity: account, closeDialog }: EditAccountFormProps) {
  const { toast } = useToast();
  const { uid } = useUser();
  const isEditMode = !!account;

  const form = useForm<EditAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
      ? { nombre: account.nombre ?? account.cuenta_id, tipo: account.tipo as any, saldo: account.saldo ?? 0 }
      : { tipo: 'Banco', saldo: 0, nombre: '' },
  });

  async function onSubmit(data: EditAccountFormValues) {
    if (!uid) return;

    // cuenta_id es un id ESTABLE (no el nombre): así dos cuentas con el mismo
    // nombre no colisionan y el nombre se puede editar sin romper transacciones.
    const cuenta_id = isEditMode ? account.cuenta_id : `ACC_${Date.now()}`;
    const finalData = { cuenta_id, nombre: data.nombre.trim(), tipo: data.tipo, saldo: data.saldo };

    if (isEditMode) {
      setDocumentNonBlocking('financialAccounts', account.id, finalData, { merge: true });
      toast({ title: 'Cuenta actualizada' });
    } else {
      addDocumentNonBlocking('financialAccounts', finalData);
      revalidateCollection('financialAccounts');
      toast({ title: 'Cuenta creada', description: `"${data.nombre.trim()}" lista para usar.` });
    }

    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la cuenta</FormLabel>
              <FormControl>
                <Input placeholder="ej. Santander, Efectivo, BBVA…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(['Banco', 'Efectivo', 'Inversion', 'Otro'] as const).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saldo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Saldo inicial (€)</FormLabel>
              <FormControl>
                <Input type="number" inputMode="decimal" step="0.01" {...field} />
              </FormControl>
              <FormDescription>
                El saldo de partida. Las transacciones actualizarán el saldo real automáticamente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
          <Button type="submit">{isEditMode ? 'Guardar cambios' : 'Crear cuenta'}</Button>
        </div>
      </form>
    </Form>
  );
}

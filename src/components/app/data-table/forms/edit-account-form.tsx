
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
import { useFirestore, useUser, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Account } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  tipo: z.enum(['Banco', 'Efectivo', 'Inversion', 'Otro']),
  saldo: z.coerce.number().optional(),
  cuenta_id: z.string().optional(), // Made optional
});

type EditAccountFormValues = z.infer<typeof formSchema>;

interface EditAccountFormProps {
  entity?: Account;
  closeDialog: () => void;
}

export default function EditAccountForm({ entity: account, closeDialog }: EditAccountFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!account;

  const form = useForm<EditAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...account,
    } : {
      tipo: 'Banco',
      saldo: 0,
    },
  });

  async function onSubmit(data: EditAccountFormValues) {
    if (!user || !firestore) return;
    
    const accountId = isEditMode ? account.cuenta_id : `ACC_${Date.now()}`;

    const finalData = {
        ...data,
        cuenta_id: accountId
    };

    if (isEditMode) {
      const docRef = doc(firestore, `users/${user.uid}/accounts`, account.id);
      setDocumentNonBlocking(docRef, data, { merge: true });
      toast({
        title: 'Cuenta Actualizada',
        description: `La cuenta ha sido actualizada.`,
      });
    } else {
      const collectionRef = collection(firestore, `users/${user.uid}/accounts`);
      addDocumentNonBlocking(collectionRef, finalData);
      toast({
        title: 'Cuenta Creada',
        description: `La nueva cuenta ha sido creada.`,
      });
    }
    
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {['Banco', 'Efectivo', 'Inversion', 'Otro'].map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
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
              <FormLabel>Saldo Inicial (€)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormDescription>El saldo de partida de la cuenta. El saldo actual se calculará dinámicamente con las transacciones.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </Form>
  );
}

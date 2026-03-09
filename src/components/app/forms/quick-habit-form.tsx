
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
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { systemPresets, variablePresets } from '@/lib/seed-data';

const formSchema = z.object({
  sistema_id: z.string({ required_error: 'Por favor, selecciona un sistema.' }),
  var_id: z.string({ required_error: 'Por favor, selecciona una variable.' }),
  frecuencia: z.enum(['Diaria', '3xSemana', 'Semanal', 'Mensual']),
  duracion_min: z.coerce.number().int().min(0),
  minimo_viable: z.boolean(),
});

type QuickHabitFormValues = z.infer<typeof formSchema>;

interface QuickHabitFormProps {
  closeDialog: () => void;
}

export default function QuickHabitForm({ closeDialog }: QuickHabitFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<QuickHabitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        sistema_id: systemPresets[0].sistema_id,
        var_id: variablePresets[0].var_id,
        frecuencia: 'Diaria',
        duracion_min: 10,
        minimo_viable: true,
    },
  });

  async function onSubmit(data: QuickHabitFormValues) {
    if (!user || !firestore) return;

    const finalData = {
        ...data,
        habito_id: `HB_${Date.now()}`
    }
    const collectionRef = collection(firestore, `users/${user.uid}/habits`);
    addDocumentNonBlocking(collectionRef, finalData);
    toast({
        title: 'Hábito Creado',
        description: `El nuevo hábito ha sido creado.`,
    });
    
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-4 p-1 max-h-[65vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="sistema_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sistema</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un sistema" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {systemPresets.map(s => <SelectItem key={s.sistema_id} value={s.sistema_id}>{s.objetivo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>El sistema al que este nuevo hábito apoyará.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="var_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una variable" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {variablePresets.map(v => <SelectItem key={v.var_id} value={v.var_id}>{v.var_nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>La variable que este hábito influenciará.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frecuencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frecuencia</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                      {['Diaria', '3xSemana', 'Semanal', 'Mensual'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duracion_min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (minutos)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minimo_viable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>¿Es Mínimo Viable?</FormLabel>
                  <FormDescription>¿Es esta la versión más pequeña posible del hábito?</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit">Guardar Hábito</Button>
        </div>
      </form>
    </Form>
  );
}

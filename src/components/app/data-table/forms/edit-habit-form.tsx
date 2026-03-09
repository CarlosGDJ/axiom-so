
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
import { Habit, System, Variable } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  habito_id: z.string().optional(),
  sistema_id: z.string({ required_error: 'Por favor, selecciona un sistema.' }),
  var_id: z.string({ required_error: 'Por favor, selecciona una variable.' }),
  frecuencia: z.enum(['Diaria', '3xSemana', 'Semanal', 'Mensual']),
  duracion_min: z.coerce.number().int().min(0),
  minimo_viable: z.boolean(),
  description: z.string().optional(),
});

type EditHabitFormValues = z.infer<typeof formSchema>;

interface EditHabitFormProps {
  entity?: Habit; // Renamed to entity for consistency with DataTable
  closeDialog: () => void;
  systems: System[];
  variables: Variable[];
}

export default function EditHabitForm({ entity: habit, closeDialog, systems, variables }: EditHabitFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!habit;

  const form = useForm<EditHabitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? { ...habit } : {
        sistema_id: systems?.[0]?.sistema_id,
        var_id: variables?.[0]?.var_id,
        frecuencia: 'Diaria',
        duracion_min: 10,
        minimo_viable: true,
        description: '',
    },
  });

  async function onSubmit(data: EditHabitFormValues) {
    if (!user || !firestore) return;

    if (isEditMode) {
      const docRef = doc(firestore, `users/${user.uid}/habits`, habit.id);
      setDocumentNonBlocking(docRef, data, { merge: true });
       toast({
        title: 'Hábito Actualizado',
        description: `El hito ha sido actualizado.`,
      });
    } else {
        const finalData = {
            ...data,
            habito_id: `HB_${Date.now()}`
        }
        const collectionRef = collection(firestore, `users/${user.uid}/habits`);
        addDocumentNonBlocking(collectionRef, finalData);
        toast({
            title: 'Hábito Creado',
            description: `El hábito ha sido creado.`,
        });
    }

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
                    {systems?.map(s => <SelectItem key={s.id} value={s.sistema_id}>{s.objetivo}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>El sistema al que pertenece este hábito.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="var_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Afectada</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una variable" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {variables?.map(v => <SelectItem key={v.id} value={v.var_id}>{v.var_nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>La variable vital que este hábito influye directamente.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción del Hábito</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="¿Qué significa este hábito y por qué es importante?" />
                </FormControl>
                <FormDescription>Esta descripción aparecerá como ayuda en el Habit Tracker.</FormDescription>
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
                <FormDescription>¿Con qué frecuencia se debe realizar este hábito?</FormDescription>
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
                <FormDescription>¿Cuánto tiempo debe durar la sesión de este hábito?</FormDescription>
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
                  <FormLabel>¿Es un Hábito Mínimo Viable (HMV)?</FormLabel>
                  <FormDescription>Marca esto si es la versión más pequeña y fácil del hábito, diseñada para no fallar.</FormDescription>
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
            <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </Form>
  );
}

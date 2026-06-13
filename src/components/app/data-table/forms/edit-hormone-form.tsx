
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
import { Hormone } from '@/lib/types';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
const formSchema = z.object({
  hormone_id: z.string().optional(),
  name: z.string().min(2, 'El nombre es demasiado corto.'),
  current_level: z.coerce.number(),
  baseline: z.coerce.number(),
  optimal_range: z.string(),
  half_life_hours: z.coerce.number().min(0),
});

type EditHormoneFormValues = z.infer<typeof formSchema>;

interface EditHormoneFormProps {
  entity?: Hormone;
  closeDialog: () => void;
}

export default function EditHormoneForm({ entity, closeDialog }: EditHormoneFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!entity;

  const form = useForm<EditHormoneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        ...entity,
    } : {
        name: '',
        current_level: 50,
        baseline: 50,
        optimal_range: '40-60',
        half_life_hours: 1
    },
  });

  async function onSubmit(data: EditHormoneFormValues) {
    if (!uid) return;
    
    const hormoneId = isEditMode ? entity.hormone_id : `HORM_${data.name.toUpperCase().substring(0,4)}_${Date.now()}`;
    const finalData = { ...data, hormone_id: hormoneId };

    if (isEditMode) {
                setDocumentNonBlocking('hormones', entity.id, finalData, { merge: true });
        toast({
            title: 'Hormona Actualizada',
            description: `La hormona ${data.name} ha sido actualizada.`,
        });
    } else {
                addDocumentNonBlocking('hormones', finalData);
        toast({
            title: 'Hormona Creada',
            description: `La hormona ${data.name} ha sido creada.`,
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Hormona</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>El nombre para mostrar de este biomarcador (ej. "Cortisol").</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="baseline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Línea Base</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="decimal" {...field} />
                </FormControl>
                <FormDescription>Tu nivel normal y estable para esta hormona.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="optimal_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rango Óptimo</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>El rango donde te sientes y funcionas mejor (ej. '40-60').</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="half_life_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vida Media (horas)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="decimal" step="0.1" {...field} />
                </FormControl>
                <FormDescription>Tiempo estimado para que el nivel de la hormona se reduzca a la mitad.</FormDescription>
                <FormMessage />
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

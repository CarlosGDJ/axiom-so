
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
import { ImpactMatrix, Variable, Hormone } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  matrix_id: z.string().optional(),
  var_id: z.string({ required_error: 'Por favor, selecciona una variable.' }),
  hormone_id: z.string({ required_error: 'Por favor, selecciona una hormona.' }),
  effect_size: z.coerce.number(),
  duration_hours: z.coerce.number().min(0),
});

type EditImpactMatrixFormValues = z.infer<typeof formSchema>;

interface EditImpactMatrixFormProps {
  entity?: ImpactMatrix;
  closeDialog: () => void;
  variables: Variable[];
  hormones: Hormone[];
}

export default function EditImpactMatrixForm({ entity, closeDialog, variables, hormones }: EditImpactMatrixFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!entity;

  const form = useForm<EditImpactMatrixFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? { ...entity } : {
        var_id: variables?.[0]?.var_id,
        hormone_id: hormones?.[0]?.hormone_id,
        effect_size: 10,
        duration_hours: 1
    },
  });

  async function onSubmit(data: EditImpactMatrixFormValues) {
    if (!user || !firestore) return;

    if (isEditMode) {
      const docRef = doc(firestore, `users/${user.uid}/impactMatrix`, entity.id);
      setDocumentNonBlocking(docRef, data, { merge: true });
       toast({
        title: 'Impacto Actualizado',
        description: `La conexión ha sido actualizada.`,
      });
    } else {
        const finalData = {
            ...data,
            matrix_id: `IM_${Date.now()}`
        }
        const collectionRef = collection(firestore, `users/${user.uid}/impactMatrix`);
        addDocumentNonBlocking(collectionRef, finalData);
        toast({
            title: 'Impacto Creado',
            description: `La nueva conexión ha sido creada.`,
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
              name="var_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable (Causa)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una variable" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {variables?.map(v => <SelectItem key={v.id} value={v.var_id}>{v.var_nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>La causa raíz que provoca un cambio.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hormone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hormona (Efecto)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una hormona" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {hormones?.map(a => <SelectItem key={a.id} value={a.hormone_id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>El biomarcador que se ve afectado.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effect_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tamaño del Efecto</FormLabel>
                  <FormControl><Input type="number" step="1" {...field} /></FormControl>
                  <FormDescription>La magnitud del impacto. Negativo para un debuff, positivo para un buff. (ej: -10 o 25).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="duration_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración del Pico (horas)</FormLabel>
                  <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                  <FormDescription>¿Cuántas horas dura el pico del efecto de esta variable sobre la hormona?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Form>
  );
}

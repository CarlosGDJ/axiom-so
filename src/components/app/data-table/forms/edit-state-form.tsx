
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
import { State } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  estado_id: z.enum(['OK', 'RIESGO', 'CRITICO']),
  condicion: z.string().min(5, 'La condición es demasiado corta.'),
  restricciones: z.string().min(5, 'Las restricciones son demasiado cortas.'),
  prioridad: z.string().min(2, 'La prioridad es demasiado corta.'),
});

type EditStateFormValues = z.infer<typeof formSchema>;

interface EditStateFormProps {
  entity?: State;
  closeDialog: () => void;
}

export default function EditStateForm({ entity: state, closeDialog }: EditStateFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!state;

  const form = useForm<EditStateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        ...state,
    } : {
      estado_id: 'OK',
      condicion: '',
      restricciones: '',
      prioridad: '',
    },
  });

  async function onSubmit(data: EditStateFormValues) {
    if (!user || !firestore) return;

    // For states, the ID is one of the enum values, so we use it as the document ID
    const docRef = doc(collection(firestore, `users/${user.uid}/states`), data.estado_id);
    setDocumentNonBlocking(docRef, data, { merge: true });
    toast({
        title: `Estado '${data.estado_id}' Actualizado`,
        description: `Las reglas para el estado ${data.estado_id} han sido guardadas.`,
    });
    
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-4 p-1 max-h-[65vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="estado_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID de Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un ID de estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="RIESGO">Riesgo</SelectItem>
                    <SelectItem value="CRITICO">Crítico</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>El identificador del estado. Define las 3 fases principales de tu sistema operativo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="condicion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condición</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>La condición lógica que activa este estado (ej. "{'>=1 área en CRÍTICO'}"). Actualmente es solo informativo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="restricciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Restricciones</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Las reglas o limitaciones que te impones en este estado (ej. "No tomar decisiones importantes").</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prioridad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>El foco principal o la directiva principal en este estado (ej. "Estabilizar", "Construir").</FormDescription>
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

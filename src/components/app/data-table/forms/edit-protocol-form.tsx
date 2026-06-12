
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
import { Protocol } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
const formSchema = z.object({
  protocolo_id: z.string().optional(),
  nombre: z.string().min(2, 'El nombre es demasiado corto.'),
  estado_disparador: z.enum(['OK', 'RIESGO', 'CRITICO']),
  pasos: z.string().min(10, 'La descripción de los pasos es demasiado corta.'),
  duracion_min: z.coerce.number().int().min(0, 'La duración debe ser un número positivo.'),
});

type EditProtocolFormValues = z.infer<typeof formSchema>;

interface EditProtocolFormProps {
  entity?: Protocol;
  closeDialog: () => void;
}

export default function EditProtocolForm({ entity: protocol, closeDialog }: EditProtocolFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!protocol;

  const form = useForm<EditProtocolFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        ...protocol,
    } : {
      nombre: '',
      estado_disparador: 'RIESGO',
      pasos: '',
      duracion_min: 5,
    },
  });

  async function onSubmit(data: EditProtocolFormValues) {
    if (!uid) return;
    
    const protocolId = isEditMode ? protocol.protocolo_id : `P_${data.nombre.toUpperCase().substring(0,4)}_${Date.now()}`;
    const finalData = { ...data, protocolo_id: protocolId };

    if (isEditMode) {
            setDocumentNonBlocking('protocols', protocol.id, data, { merge: true });
      toast({
        title: 'Protocolo Actualizado',
        description: `El protocolo ${data.nombre} ha sido actualizado.`,
      });
    } else {
            addDocumentNonBlocking('protocols', finalData);
      toast({
        title: 'Protocolo Creado',
        description: `El protocolo ${data.nombre} ha sido creado.`,
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
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Protocolo</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Un nombre claro y conciso para el protocolo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estado_disparador"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado Disparador</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado disparador" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="RIESGO">Riesgo</SelectItem>
                    <SelectItem value="CRITICO">Crítico</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>El estado del sistema que activa o recomienda este protocolo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pasos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pasos</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormDescription>La secuencia de acciones a seguir para ejecutar este protocolo.</FormDescription>
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
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>Tiempo estimado para completar el protocolo.</FormDescription>
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

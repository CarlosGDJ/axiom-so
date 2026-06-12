
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
import { Relation } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
const formSchema = z.object({
  persona_id: z.string().optional(),
  nombre: z.string().min(2, 'El nombre es demasiado corto.'),
  rol: z.enum(['Familia', 'Amigo', 'Pareja', 'Trabajo', 'Mentor', 'Conocido']),
  energia_neta: z.coerce.number().min(-10).max(10),
  respeto: z.coerce.number().min(0).max(10),
  frecuencia: z.enum(['Diaria', 'Semanal', 'Mensual', 'Ocasional']),
});

type EditRelationFormValues = z.infer<typeof formSchema>;

interface EditRelationFormProps {
  entity?: Relation;
  closeDialog: () => void;
}

export default function EditRelationForm({ entity: relation, closeDialog }: EditRelationFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!relation;

  const form = useForm<EditRelationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...relation,
    } : {
      nombre: '',
      rol: 'Conocido',
      energia_neta: 0,
      respeto: 5,
      frecuencia: 'Ocasional',
    },
  });

  async function onSubmit(data: EditRelationFormValues) {
    if (!uid) return;
    
    const personaId = isEditMode ? relation.persona_id : `REL_${data.nombre.toUpperCase().replace(/\s/g, '_').substring(0,5)}_${Date.now()}`;
    const finalData = { ...data, persona_id: personaId };

    if (isEditMode) {
            setDocumentNonBlocking('relations', relation.id, data, { merge: true });
      toast({
        title: 'Relación Actualizada',
        description: `La relación con ${data.nombre} ha sido actualizada.`,
      });
    } else {
            addDocumentNonBlocking('relations', finalData);
      toast({
        title: 'Relación Creada',
        description: `La relación con ${data.nombre} ha sido creada.`,
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
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>El nombre de la persona.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['Familia', 'Amigo', 'Pareja', 'Trabajo', 'Mentor', 'Conocido'].map(rol => (
                      <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>El papel que juega esta persona en tu vida.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="energia_neta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Energía Neta: {field.value}</FormLabel>
                <FormControl>
                  <Slider
                    min={-10} max={10} step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>¿Te da (+10) o te quita (-10) energía esta relación?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="respeto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Respeto: {field.value}</FormLabel>
                <FormControl>
                  <Slider
                    min={0} max={10} step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>Nivel de respeto mutuo en la relación (0-10).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frecuencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frecuencia de Contacto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecciona una frecuencia" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {['Diaria', 'Semanal', 'Mensual', 'Ocasional'].map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>¿Con qué frecuencia interactúas con esta persona?</FormDescription>
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

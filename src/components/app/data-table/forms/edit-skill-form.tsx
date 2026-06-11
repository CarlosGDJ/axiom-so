
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
import { Area, Skill } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';

const formSchema = z.object({
  habilidad_id: z.string().optional(),
  nombre: z.string().min(2, 'El nombre es demasiado corto.'),
  area_id: z.string({ required_error: 'Por favor selecciona un área.' }),
  nivel_actual: z.coerce.number().min(0).max(10),
  nivel_objetivo: z.coerce.number().min(0).max(10),
  estado: z.enum(['Activa', 'Pausa']),
  kpi: z.string(),
});

type EditSkillFormValues = z.infer<typeof formSchema>;

interface EditSkillFormProps {
  entity?: Skill;
  closeDialog: () => void;
  areas: Area[];
}

export default function EditSkillForm({ entity: skill, closeDialog, areas }: EditSkillFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!skill;

  const form = useForm<EditSkillFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? { ...skill } : {
        nombre: '',
        area_id: areas?.[0]?.area_id,
        nivel_actual: 3,
        nivel_objetivo: 7,
        estado: 'Activa',
        kpi: 'Sesiones/semana'
    },
  });

  async function onSubmit(data: EditSkillFormValues) {
    if (!uid) return;
    
    const habilidadId = isEditMode ? skill.habilidad_id : `SKILL_${Date.now()}`;
    const finalData = { ...data, habilidad_id: habilidadId };

    if (isEditMode) {
            setDocumentNonBlocking('skills', skill.id, data, { merge: true });
      toast({
        title: 'Habilidad Actualizada',
        description: `La habilidad ${data.nombre} ha sido actualizada.`,
      });
    } else {
            addDocumentNonBlocking('skills', finalData);
       toast({
        title: 'Habilidad Creada',
        description: `La habilidad ${data.nombre} ha sido creada.`,
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
                <FormLabel>Nombre de la Habilidad</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormDescription>El nombre de la capacidad que estás construyendo (ej. "Sueño Sólido").</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="area_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Área de Vida</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un área" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {areas?.map(area => <SelectItem key={area.area_id} value={area.area_id}>{area.area_nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormDescription>El área de tu vida a la que esta habilidad contribuye.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nivel_actual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel Actual (1-10)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormDescription>Tu nivel de competencia actual en esta habilidad.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nivel_objetivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel Objetivo (1-10)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormDescription>El nivel de competencia que quieres alcanzar.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Activa">Activa</SelectItem>
                    <SelectItem value="Pausa">Pausa</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Si estás trabajando activamente en esta habilidad o la tienes en pausa.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="kpi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indicador Clave de Desempeño (KPI)</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormDescription>¿Cómo mides objetivamente el progreso para esta habilidad? (ej. "Horas de sueño", "Sesiones/semana").</FormDescription>
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

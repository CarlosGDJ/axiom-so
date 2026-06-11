
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
import { Area } from '@/lib/types';
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
  area_nombre: z.string().min(2, 'El nombre es demasiado corto.'),
  prioridad: z.enum(['Alta', 'Media', 'Baja']),
  estado: z.enum(['OK', 'RIESGO', 'CRITICO']),
  peso_estrategico: z.coerce.number().min(0).max(10),
  objetivo_12s: z.string().optional(),
  kpi_principal: z.string().optional(),
  umbral_riesgo: z.coerce.number(),
  umbral_critico: z.coerce.number(),
  notas: z.string().optional(),
  area_id: z.string().optional(),
});

type EditAreaFormValues = z.infer<typeof formSchema>;

interface EditAreaFormProps {
  entity?: Area;
  closeDialog: () => void;
}

export default function EditAreaForm({ entity: area, closeDialog }: EditAreaFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!area;

  const form = useForm<EditAreaFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        ...area,
    } : {
      area_nombre: '',
      prioridad: 'Media',
      estado: 'OK',
      peso_estrategico: 5,
      objetivo_12s: '',
      kpi_principal: '',
      umbral_riesgo: 5,
      umbral_critico: 3,
      notas: '',
    },
  });

  async function onSubmit(data: EditAreaFormValues) {
    if (!uid) return;

    const areaId = isEditMode ? area.area_id : `AREA_${data.area_nombre.toUpperCase().replace(/\s/g, '_').substring(0, 5)}_${Date.now()}`;

    const finalData = {
        ...data,
        area_id: areaId,
        ultima_revision: new Date().toISOString(),
    }

    if (isEditMode) {
            setDocumentNonBlocking('areas', area.id, finalData, { merge: true });
      toast({
        title: 'Área Actualizada',
        description: `El área ${data.area_nombre} ha sido actualizada.`,
      });
    } else {
            addDocumentNonBlocking('areas', finalData);
      toast({
        title: 'Área Creada',
        description: `El área ${data.area_nombre} ha sido creada.`,
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
            name="area_nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Área</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>El nombre legible de esta área de tu vida (ej. "Salud Física").</FormDescription>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>¿Qué tan importante es esta área para ti ahora mismo?</FormDescription>
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
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="RIESGO">Riesgo</SelectItem>
                    <SelectItem value="CRITICO">Crítico</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>El estado actual de esta área (generalmente calculado automáticamente).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="peso_estrategico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso Estratégico</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>En una escala del 1 al 10, ¿cuánto impacta esta área en tu bienestar general?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="objetivo_12s"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objetivo de 12 Semanas</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Tu objetivo principal para esta área en las próximas 12 semanas.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="kpi_principal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KPI Principal</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>La métrica clave (Indicador Clave de Desempeño) para seguir el progreso en esta área.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="umbral_riesgo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral de Riesgo</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormDescription>Valor para el umbral de riesgo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="umbral_critico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral Crítico</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormDescription>Valor para el umbral crítico.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Cualquier nota o pensamiento adicional sobre esta área.</FormDescription>
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

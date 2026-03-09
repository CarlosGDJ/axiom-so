
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
import { Variable, Area } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  var_id: z.string().optional(),
  var_nombre: z.string().min(2, 'El nombre es demasiado corto.'),
  area_id: z.string(),
  tipo: z.enum(['Física', 'Mental', 'Emocional', 'Social', 'Financiera', 'Entorno', 'Conductual']),
  polaridad: z.coerce.number().int().min(-1).max(1),
  impacto_base: z.coerce.number().min(0).max(10),
  curva: z.enum(['Lineal', 'Umbral', 'Exponencial']),
  delay_dias: z.coerce.number().int().min(0),
  duracion_dias: z.coerce.number().int().min(0),
  umbral_riesgo: z.coerce.number().int().min(0),
  controlabilidad: z.enum(['Alta', 'Media', 'Baja']),
  activo: z.boolean(),
});

type EditVariableFormValues = z.infer<typeof formSchema>;

interface EditVariableFormProps {
  entity?: Variable;
  closeDialog: () => void;
  areas: Area[];
}

export default function EditVariableForm({ entity: variable, closeDialog, areas }: EditVariableFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!variable;

  const form = useForm<EditVariableFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...(variable as any),
    } : {
        var_nombre: '',
        area_id: areas?.[0]?.area_id,
        tipo: 'Conductual',
        polaridad: 1,
        impacto_base: 5,
        curva: 'Lineal',
        delay_dias: 1,
        duracion_dias: 1,
        umbral_riesgo: 3,
        controlabilidad: 'Media',
        activo: true,
    },
  });

  async function onSubmit(data: EditVariableFormValues) {
    if (!user || !firestore) return;
    
    const varId = isEditMode ? variable.var_id : `${data.var_nombre.toUpperCase().replace(/\s/g, '_').substring(0,10)}_${Date.now()}`;
    const finalData = { ...data, var_id: varId };

    if (isEditMode) {
      const variableRef = doc(firestore, `users/${user.uid}/variables`, variable.id);
      setDocumentNonBlocking(variableRef, finalData, { merge: true });
      toast({
        title: 'Variable Actualizada',
        description: `La variable ${data.var_nombre} ha sido actualizada.`,
      });
    } else {
      const variableCollectionRef = collection(firestore, `users/${user.uid}/variables`);
      addDocumentNonBlocking(variableCollectionRef, finalData);
      toast({
        title: 'Variable Creada',
        description: `La variable ${data.var_nombre} ha sido creada.`,
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
              name="var_nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Variable</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormDescription>El nombre legible de la causa raíz que afecta tu estado (ej. "Sueño insuficiente").</FormDescription>
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
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {areas?.map(area => <SelectItem key={area.area_id} value={area.area_id}>{area.area_nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>El área de vida más afectada por esta variable.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['Física', 'Mental', 'Emocional', 'Social', 'Financiera', 'Entorno', 'Conductual'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>La naturaleza de la variable.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="polaridad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Polaridad</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="1">Positiva (+1)</SelectItem>
                      <SelectItem value="-1">Negativa (-1)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>¿Esta variable tiene un impacto positivo (mejora tu estado) o negativo (empeora tu estado)?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="impacto_base"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impacto Base (1-10)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>En una escala de 1 a 10, ¿cuánto impacto tiene esta variable en tu estado general?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="curva"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Curva de Impacto</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['Lineal', 'Umbral', 'Exponencial'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>Lineal (cada evento suma), Umbral (el impacto empieza tras X eventos), Exponencial (el impacto se acelera).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="delay_dias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retraso del Impacto (días)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>¿Cuántos días tardas en sentir el impacto de esta variable después de que ocurra?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duracion_dias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración del Impacto (días)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormDescription>¿Durante cuántos días se mantiene el efecto de esta variable?</FormDescription>
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
                  <FormDescription>Número de veces que esta variable puede ocurrir en una semana antes de que el área entre en 'Riesgo'.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="controlabilidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Controlabilidad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['Alta', 'Media', 'Baja'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>¿Cuánto control real tienes sobre la ocurrencia de esta variable?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Activa</FormLabel>
                    <FormDescription>¿Se está siguiendo y analizando esta variable actualmente?</FormDescription>
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

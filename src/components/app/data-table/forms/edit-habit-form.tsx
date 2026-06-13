'use client';

import { useState } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';

const formSchema = z.object({
  habito_id: z.string().optional(),
  nombre: z.string().min(1, 'Ponle un nombre al hábito.'),
  frecuencia: z.enum(['Diaria', '3xSemana', 'Semanal', 'Mensual']),
  // Todo lo de abajo es opcional — un hábito solo necesita nombre y frecuencia.
  var_id: z.string().optional(),
  sistema_id: z.string().optional(),
  duracion_min: z.coerce.number().int().min(0).optional(),
  minimo_viable: z.boolean().optional(),
  description: z.string().optional(),
});

type EditHabitFormValues = z.infer<typeof formSchema>;

interface EditHabitFormProps {
  entity?: Habit;
  closeDialog: () => void;
  systems: System[];
  variables: Variable[];
}

const FREQ_OPTIONS = ['Diaria', '3xSemana', 'Semanal', 'Mensual'] as const;

export default function EditHabitForm({ entity: habit, closeDialog, systems, variables }: EditHabitFormProps) {
  const { toast } = useToast();
  const { uid } = useUser();
  const isEditMode = !!habit;
  // Abre las opciones avanzadas automáticamente si el hábito ya las usa.
  const [showAdvanced, setShowAdvanced] = useState(
    isEditMode && !!(habit?.var_id || habit?.sistema_id || habit?.description)
  );

  const form = useForm<EditHabitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
      ? {
          ...habit,
          var_id: habit?.var_id ?? '__none__',
          sistema_id: habit?.sistema_id ?? '__none__',
          duracion_min: habit?.duracion_min ?? 10,
          minimo_viable: habit?.minimo_viable ?? true,
        }
      : {
          nombre: '',
          frecuencia: 'Diaria',
          var_id: '__none__',
          sistema_id: '__none__',
          duracion_min: 10,
          minimo_viable: true,
          description: '',
        },
  });

  async function onSubmit(data: EditHabitFormValues) {
    if (!uid) return;

    const payload = {
      ...data,
      var_id: data.var_id === '__none__' ? undefined : data.var_id,
      sistema_id: data.sistema_id === '__none__' ? undefined : data.sistema_id,
    };

    if (isEditMode && habit) {
      setDocumentNonBlocking('habits', habit.id, payload, { merge: true });
      toast({ title: 'Hábito actualizado', description: `«${data.nombre}» guardado.` });
    } else {
      addDocumentNonBlocking('habits', { ...payload, habito_id: `HB_${Date.now()}` });
      toast({ title: 'Hábito creado', description: `«${data.nombre}» listo para registrar.` });
    }
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-5 p-1 max-h-[65vh] overflow-y-auto pr-3">
          {/* ── Lo esencial ── */}
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Qué hábito quieres seguir?</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: Meditar 10 min, Leer, Salir a caminar…" autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frecuencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Con qué frecuencia?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {FREQ_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── Opciones avanzadas (opcionales) ── */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Opciones avanzadas
                </span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="var_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área de impacto <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? '__none__'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Ninguna — solo seguir el hábito</SelectItem>
                        {variables?.map(v => <SelectItem key={v.id} value={v.var_id}>{v.var_nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormDescription>Si la eliges, completar el hábito también alimentará tu estado biológico. Si no, simplemente lo seguirás.</FormDescription>
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
                    <FormControl><Input type="number" inputMode="decimal" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Cualquier recordatorio o detalle." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sistema_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sistema <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? '__none__'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sin sistema" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Sin sistema</SelectItem>
                        {systems?.map(s => <SelectItem key={s.id} value={s.sistema_id}>{s.objetivo}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                      <FormLabel>Hábito mínimo viable</FormLabel>
                      <FormDescription>La versión más pequeña y fácil, diseñada para no fallar.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
          <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
          <Button type="submit">{isEditMode ? 'Guardar' : 'Crear hábito'}</Button>
        </div>
      </form>
    </Form>
  );
}

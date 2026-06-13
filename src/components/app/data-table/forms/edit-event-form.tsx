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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { variablePresets } from '@/lib/seed-data';
import { Switch } from '@/components/ui/switch';
import { useEffect, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { Event, Variable, Milestone } from '@/lib/types';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
const formSchema = z.object({
  var_id: z.string({
    required_error: 'Por favor, selecciona una variable.',
  }),
  intensidad: z.number().min(1).max(5),
  duracion_min: z.coerce.number().optional(),
  contexto: z.string().max(280).optional(),
  impulsivo: z.boolean().default(false),
  tipo: z.enum(['Variable', 'Protocolo']).default('Variable'),
  milestone_id: z.string().optional(),
});

type EventFormValues = z.infer<typeof formSchema>;

// Prefill values can be a partial of the form values
type PrefillValues = Partial<EventFormValues>;

interface EventLogFormProps {
    entity?: Event;
    variables?: Array<Pick<Variable, 'var_id' | 'var_nombre'>>;
    events?: Event[];
    milestones?: Milestone[];
    closeDialog: () => void;
    prefill?: PrefillValues;
}

export default function EventLogForm({ entity: event, variables = variablePresets as Array<Pick<Variable, 'var_id' | 'var_nombre'>>, events = [], milestones, closeDialog, prefill }: EventLogFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!event;

  // Calculate frequencies and sort variables
  const processedVariables = useMemo(() => {
    // 1. Deduplicate
    const seen = new Set();
    const unique = variables.filter(v => {
      if (seen.has(v.var_id)) return false;
      seen.add(v.var_id);
      return true;
    });

    // 2. Count frequencies
    const freqMap: Record<string, number> = {};
    events.forEach(e => {
      freqMap[e.var_id] = (freqMap[e.var_id] || 0) + 1;
    });

    // 3. Sort by frequency, then alphabetically
    return unique.sort((a, b) => {
      const freqA = freqMap[a.var_id] || 0;
      const freqB = freqMap[b.var_id] || 0;
      if (freqB !== freqA) return freqB - freqA;
      return a.var_nombre.localeCompare(b.var_nombre);
    }).map(v => ({
      ...v,
      isFrequent: (freqMap[v.var_id] || 0) > 0 && unique.indexOf(v) < 5 // Mark top frequent ones
    }));
  }, [variables, events]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...event,
      contexto: event.contexto || '',
      duracion_min: event.duracion_min || undefined,
      tipo: event.tipo || 'Variable',
    } : {
      intensidad: 3,
      impulsivo: false,
      duracion_min: undefined,
      contexto: '',
      tipo: 'Variable',
      ...prefill, // Apply prefill values
    },
  });
  
  // Use useEffect to reset the form if the prefill data changes (for creation mode)
  useEffect(() => {
    if (!isEditMode) {
      form.reset({
        intensidad: 3,
        impulsivo: false,
        duracion_min: undefined,
        contexto: '',
        tipo: 'Variable',
        ...prefill,
      });
    }
  }, [prefill, form, isEditMode]);


  async function onSubmit(data: EventFormValues) {
    if (!uid) return;

    if (isEditMode) {
            setDocumentNonBlocking('events', event.id, data, { merge: true });
      toast({
        title: 'Evento Actualizado',
        description: `El evento para ${data.var_id} ha sido actualizado.`,
      });
    } else {
                addDocumentNonBlocking('events', {
            ...data,
            fecha: new Date().toISOString(),
            evento_id: `EVT_${Date.now()}` // Simple unique ID
        });
        toast({
        title: 'Evento Registrado',
        description: `Evento para ${data.var_id} registrado con éxito.`,
        });
    }
    
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-6 p-1 max-h-[65vh] overflow-y-auto pr-4">
          <FormField
            control={form.control}
            name="var_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Vital / Protocolo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una variable..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {processedVariables.map((v) => (
                      <SelectItem key={v.var_id} value={v.var_id}>
                        <div className="flex items-center gap-2">
                          {v.var_nombre}
                          {v.isFrequent && (
                            <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                              <Sparkles size={10} /> Frecuente
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Naturaleza del Evento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Variable">Variable (Algo que te sucede)</SelectItem>
                    <SelectItem value="Protocolo">Protocolo (Acción para corregir/estabilizar)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Distingue entre un evento orgánico (Variable) y una acción ejecutada (Protocolo).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="intensidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intensidad: {field.value}</FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>En una escala del 1 al 5.</FormDescription>
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
                  <Input type="number" inputMode="decimal" placeholder="ej. 60" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contexto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contexto</FormLabel>
                <FormControl>
                  <Textarea placeholder="¿Qué estaba pasando? ¿Cómo te sentías?" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="impulsivo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Impulsivo</FormLabel>
                  <FormDescription>¿Fue este evento una reacción no planificada?</FormDescription>
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
            <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  );
}

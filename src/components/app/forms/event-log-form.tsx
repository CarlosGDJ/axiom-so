
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { variablePresets, protocolPresets } from '@/lib/seed-data';
import { Switch } from '@/components/ui/switch';
import { useEffect, useMemo } from 'react';
import { Sparkles, Zap, Activity } from 'lucide-react';
import type { Event, Variable, Protocol } from '@/lib/types';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
const formSchema = z.object({
  var_id: z.string({
    required_error: 'Por favor, selecciona una opción.',
  }),
  intensidad: z.number().min(1).max(5),
  duracion_min: z.coerce.number().optional(),
  contexto: z.string().max(280).optional(),
  impulsivo: z.boolean().default(false),
  tipo: z.enum(['Variable', 'Protocolo']).default('Variable'),
});

type EventFormValues = z.infer<typeof formSchema>;

interface EventLogFormProps {
    entity?: Event;
    variables?: Variable[];
    protocols?: Protocol[];
    events?: Event[];
    closeDialog: () => void;
    prefill?: Partial<EventFormValues>;
}

export default function EventLogForm({ 
    entity: event, 
    variables = [], 
    protocols = [],
    events = [], 
    closeDialog, 
    prefill 
}: EventLogFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!event;

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
      ...prefill,
    },
  });

  const selectedType = form.watch('tipo');

  // Asegurar que usamos los presets de la Matriz v2.0
  const processedVariables = useMemo(() => {
    const combined = [...(variables || []), ...(variablePresets as any[])];
    const seen = new Set();
    const unique = combined.filter(v => {
      if (!v.var_id || seen.has(v.var_id)) return false;
      seen.add(v.var_id);
      return true;
    });

    const freqMap: Record<string, number> = {};
    events.filter(e => e.tipo === 'Variable').forEach(e => {
      freqMap[e.var_id] = (freqMap[e.var_id] || 0) + 1;
    });

    const sorted = [...unique].sort((a, b) => {
      const freqA = freqMap[a.var_id] || 0;
      const freqB = freqMap[b.var_id] || 0;
      if (freqB !== freqA) return freqB - freqA;
      return (a.var_nombre || a.var_id).localeCompare(b.var_nombre || b.var_id);
    });

    return sorted.map((v, index) => ({
      id: v.var_id,
      label: v.var_nombre || v.var_id,
      isFrequent: freqMap[v.var_id] > 0 && index < 5
    }));
  }, [variables, events]);

  const processedProtocols = useMemo(() => {
    const combined = [...(protocols || []), ...(protocolPresets as any[])];
    const seen = new Set();
    const unique = combined.filter(p => {
      const id = p.protocolo_id || p.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const freqMap: Record<string, number> = {};
    events.filter(e => e.tipo === 'Protocolo').forEach(e => {
      freqMap[e.var_id] = (freqMap[e.var_id] || 0) + 1;
    });

    const sorted = [...unique].sort((a, b) => {
      const freqA = freqMap[a.protocolo_id] || 0;
      const freqB = freqMap[b.protocolo_id] || 0;
      if (freqB !== freqA) return freqB - freqA;
      return (a.nombre || a.protocolo_id).localeCompare(b.nombre || b.protocolo_id);
    });

    return sorted.map((p, index) => ({
      id: p.protocolo_id,
      label: p.nombre,
      isFrequent: freqMap[p.protocolo_id] > 0 && index < 3
    }));
  }, [protocols, events]);

  useEffect(() => {
    if (!isEditMode && prefill) {
      form.reset({
        ...form.getValues(),
        ...prefill,
      });
    }
  }, [prefill, form, isEditMode]);


  async function onSubmit(data: EventFormValues) {
    if (!uid) return;

    if (isEditMode) {
            setDocumentNonBlocking('events', event.id, data, { merge: true });
      toast({ title: 'Actualizado', description: 'Registro actualizado con éxito.' });
    } else {
                addDocumentNonBlocking('events', {
            ...data,
            fecha: new Date().toISOString(),
            evento_id: `EVT_${Date.now()}`
        });
        toast({
            title: data.tipo === 'Protocolo' ? 'Protocolo Ejecutado' : 'Evento Registrado',
            description: `Se ha registrado el impacto en tu sistema.`,
        });
    }
    
    closeDialog();
  }

  const currentOptions = selectedType === 'Variable' ? processedVariables : processedProtocols;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={selectedType} onValueChange={(v) => form.setValue('tipo', v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="Variable" className="gap-2">
                <Activity size={14} /> Suceso
            </TabsTrigger>
            <TabsTrigger value="Protocolo" className="gap-2">
                <Zap size={14} /> Intervención
            </TabsTrigger>
          </TabsList>

          <div className="space-y-6 p-1 max-h-[60vh] overflow-y-auto pr-2">
            <FormField
                control={form.control}
                name="var_id"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{selectedType === 'Variable' ? '¿Qué ha ocurrido?' : '¿Qué protocolo vas a ejecutar?'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder={selectedType === 'Variable' ? "Selecciona un suceso..." : "Selecciona un protocolo..."} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {currentOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                            <div className="flex items-center gap-2">
                            {opt.label}
                            {opt.isFrequent && (
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
                name="intensidad"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Intensidad / Calidad: {field.value}</FormLabel>
                    <FormControl>
                    <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                    />
                    </FormControl>
                    <FormDescription>
                        {selectedType === 'Variable' 
                            ? '1: Leve, 5: Impacto total en el día.' 
                            : '1: Ejecución mínima, 5: Protocolo completado con rigor.'}
                    </FormDescription>
                </FormItem>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="duracion_min"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Duración (minutos)</FormLabel>
                        <FormControl>
                        <Input type="number" inputMode="decimal" placeholder="ej. 30" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                {selectedType === 'Variable' && (
                    <FormField
                    control={form.control}
                    name="impulsivo"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-[68px]">
                        <div className="space-y-0.5">
                            <FormLabel className="text-xs">Impulsivo</FormLabel>
                        </div>
                        <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        </FormItem>
                    )}
                    />
                )}
            </div>

            <FormField
                control={form.control}
                name="contexto"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Notas / Contexto</FormLabel>
                    <FormControl>
                    <Textarea placeholder="Añade detalles relevantes..." className="resize-none" {...field} value={field.value ?? ''}/>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit">Guardar Registro</Button>
        </div>
      </form>
    </Form>
  );
}

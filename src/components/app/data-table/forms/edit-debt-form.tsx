
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Debt } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
const formSchema = z.object({
  debt_id: z.string().optional(),
  nombre: z.string().min(2, 'El nombre es demasiado corto.'),
  tipo: z.enum(['Hipoteca', 'Préstamo personal', 'Tarjeta', 'Línea crédito', 'Otro']),
  principal_inicial: z.coerce.number().positive('El principal debe ser positivo.'),
  interes_tae: z.coerce.number().min(0, 'El interés no puede ser negativo.'),
  plazo_total_meses: z.coerce.number().int().positive('El plazo debe ser un número positivo de meses.'),
  cuota_mensual: z.coerce.number().positive('La cuota debe ser positiva.'),
  saldo_actual: z.coerce.number().min(0, 'El saldo no puede ser negativo.'),
  fecha_inicio: z.date({ required_error: 'Se requiere una fecha de inicio.' }),
  tipo_amortizacion: z.enum(['Francés', 'Alemán', 'Revolving', 'Otro']),
  comision_amortizacion: z.coerce.number().min(0).optional(),
  permite_amortizacion: z.boolean(),
  opcion_amortizacion: z.enum(['Reducir cuota', 'Reducir plazo', 'Ambos']).optional(),
  prioridad_manual: z.enum(['Alta', 'Media', 'Baja']),
  estres_psicologico: z.enum(['Alto', 'Medio', 'Bajo']),
});

type EditDebtFormValues = z.infer<typeof formSchema>;

interface EditDebtFormProps {
  entity?: Debt;
  closeDialog: () => void;
}

export default function EditDebtForm({ entity: debt, closeDialog }: EditDebtFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!debt;

  const form = useForm<EditDebtFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...(debt as any),
      fecha_inicio: debt.fecha_inicio ? new Date(debt.fecha_inicio) : new Date(),
    } : {
      nombre: '',
      tipo: 'Préstamo personal',
      principal_inicial: 0,
      interes_tae: 0,
      plazo_total_meses: 12,
      cuota_mensual: 0,
      saldo_actual: 0,
      fecha_inicio: new Date(),
      tipo_amortizacion: 'Francés',
      permite_amortizacion: true,
      opcion_amortizacion: 'Reducir plazo',
      prioridad_manual: 'Media',
      estres_psicologico: 'Medio',
    },
  });

  async function onSubmit(data: EditDebtFormValues) {
    if (!uid) return;
    
    const debtId = isEditMode ? debt.debt_id : `DEBT_${Date.now()}`;
    const finalData = { 
        ...data, 
        debt_id: debtId,
        fecha_inicio: data.fecha_inicio.toISOString(),
    };

    if (isEditMode) {
            setDocumentNonBlocking('debts', debt.id, finalData, { merge: true });
      toast({
        title: 'Deuda Actualizada',
        description: `La deuda ${data.nombre} ha sido actualizada.`,
      });
    } else {
            addDocumentNonBlocking('debts', finalData);
      toast({
        title: 'Deuda Creada',
        description: `La deuda ${data.nombre} ha sido creada.`,
      });
    }
    
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-6 p-1 max-h-[65vh] overflow-y-auto pr-4">
            <h4 className="text-sm font-medium text-muted-foreground">Datos Contractuales</h4>
            <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre</FormLabel> <FormControl><Input {...field} /></FormControl> <FormDescription>Un nombre descriptivo (ej. "Préstamo Coche").</FormDescription> <FormMessage /> </FormItem> )}/>
            <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {['Hipoteca', 'Préstamo personal', 'Tarjeta', 'Línea crédito', 'Otro'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="principal_inicial" render={({ field }) => ( <FormItem> <FormLabel>Principal Inicial (€)</FormLabel> <FormControl><Input type="number" step="0.01" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="interes_tae" render={({ field }) => ( <FormItem> <FormLabel>Interés (TAE %)</FormLabel> <FormControl><Input type="number" step="0.01" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="plazo_total_meses" render={({ field }) => ( <FormItem> <FormLabel>Plazo Total (meses)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="cuota_mensual" render={({ field }) => ( <FormItem> <FormLabel>Cuota Mensual (€)</FormLabel> <FormControl><Input type="number" step="0.01" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            </div>
            
            <h4 className="text-sm font-medium text-muted-foreground pt-4">Estado Actual</h4>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="saldo_actual"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Saldo Actual (€)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormDescription className="pt-2">El saldo pendiente al momento de registrar.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="fecha_inicio"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Inicio</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <h4 className="text-sm font-medium text-muted-foreground pt-4">Condiciones de Amortización</h4>
             <FormField
                control={form.control}
                name="tipo_amortizacion"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Amortización</FormLabel>
                     <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent> {['Francés', 'Alemán', 'Revolving', 'Otro'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)} </SelectContent>
                        </Select>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField control={form.control} name="comision_amortizacion" render={({ field }) => ( <FormItem> <FormLabel>Comisión Amortización Anticipada (%)</FormLabel> <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''}/></FormControl> <FormMessage /> </FormItem> )}/>
             <div className="grid grid-cols-2 gap-4 items-center">
                <FormField
                    control={form.control}
                    name="permite_amortizacion"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-full">
                            <div className="space-y-0.5">
                                <FormLabel>¿Permite Amortización?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="opcion_amortizacion"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Opción Amortización</FormLabel>
                        <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('permite_amortizacion')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent> {['Reducir cuota', 'Reducir plazo', 'Ambos'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)} </SelectContent>
                            </Select>
                        </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            <h4 className="text-sm font-medium text-muted-foreground pt-4">Clasificación Estratégica</h4>
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="prioridad_manual"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prioridad Manual</FormLabel>
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent> {['Alta', 'Media', 'Baja'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)} </SelectContent>
                                </Select>
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="estres_psicologico"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estrés Psicológico</FormLabel>
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent> {['Alto', 'Medio', 'Bajo'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)} </SelectContent>
                                </Select>
                            </FormControl>
                        </FormItem>
                    )}
                />
             </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit">Guardar Deuda</Button>
        </div>
      </form>
    </Form>
  );
}

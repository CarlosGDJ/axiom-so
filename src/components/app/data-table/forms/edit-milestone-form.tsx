
'use client';

import { useForm, useWatch } from 'react-hook-form';
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
import { Milestone, Skill, System } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import React, { useMemo, useEffect } from 'react';


const formSchema = z.object({
  milestone_id: z.string().optional(),
  nombre: z.string().min(3, 'El nombre es demasiado corto.'),
  skill_id: z.string().optional(),
  system_id: z.string().optional(),
  fecha_objetivo: z.date().optional(),
  estado: z.enum(['Pendiente', 'Completado', 'Omitido']),
  milestone_type: z.enum(['single', 'recurring']),
  target_count: z.coerce.number().int().min(1).optional(),
  notas: z.string().optional(),
}).refine(data => data.skill_id || data.system_id, {
    message: "Debe seleccionar una Habilidad o un Sistema.",
    path: ["skill_id"],
}).refine(data => {
    if (data.milestone_type === 'recurring' && data.target_count && !data.fecha_objetivo) {
        return false;
    }
    return true;
}, {
    message: 'Las tareas recurrentes con un objetivo de repeticiones deben tener una fecha objetivo.',
    path: ['fecha_objetivo'],
});


type EditMilestoneFormValues = z.infer<typeof formSchema>;

interface EditMilestoneFormProps {
  entity?: Milestone;
  closeDialog: () => void;
  skills: Skill[];
  systems: System[];
}

export default function EditMilestoneForm({ entity, closeDialog, skills, systems }: EditMilestoneFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!entity;

  const form = useForm<EditMilestoneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
        ...entity,
        fecha_objetivo: entity.fecha_objetivo ? new Date(entity.fecha_objetivo) : undefined,
    } : {
        nombre: '',
        estado: 'Pendiente',
        milestone_type: 'single',
        fecha_objetivo: new Date(),
    },
  });

  const milestoneType = form.watch('milestone_type');
  const selectedSkillId = form.watch('skill_id');
  const selectedSystemId = form.watch('system_id');

  // Filter systems based on selected skill
  const availableSystems = useMemo(() => {
    if (!selectedSkillId) return systems;
    return systems.filter(s => s.habilidad_id === selectedSkillId);
  }, [selectedSkillId, systems]);

  // When a system is selected, auto-select its parent skill and disable the skill dropdown
  useEffect(() => {
    if (selectedSystemId) {
      const system = systems.find(s => s.sistema_id === selectedSystemId);
      if (system && system.habilidad_id !== form.getValues('skill_id')) {
        form.setValue('skill_id', system.habilidad_id, { shouldDirty: true });
      }
    }
  }, [selectedSystemId, systems, form]);

  // When the list of available systems changes (due to a skill change), reset system if it's no longer valid
  useEffect(() => {
    const currentSystemId = form.getValues('system_id');
    if (currentSystemId && !availableSystems.find(s => s.sistema_id === currentSystemId)) {
      form.setValue('system_id', undefined, { shouldDirty: true });
    }
  }, [availableSystems, form]);


  async function onSubmit(data: EditMilestoneFormValues) {
    if (!user || !firestore) return;
    
    const milestoneId = isEditMode ? entity.milestone_id : `MS_${Date.now()}`;
    const finalData = { 
        ...data,
        skill_id: data.skill_id || undefined,
        system_id: data.system_id || undefined,
        milestone_id: milestoneId,
        fecha_objetivo: data.fecha_objetivo ? data.fecha_objetivo.toISOString() : undefined,
        fecha_completado: data.estado === 'Completado' ? new Date().toISOString() : undefined,
        progress_count: isEditMode ? entity.progress_count || 0 : 0,
        target_count: data.milestone_type === 'recurring' ? data.target_count : undefined,
    };

    if (isEditMode) {
      const docRef = doc(firestore, `users/${user.uid}/milestones`, entity.id);
      setDocumentNonBlocking(docRef, finalData, { merge: true });
      toast({
        title: 'Hito Actualizado',
        description: `El hito "${data.nombre}" ha sido actualizado.`,
      });
    } else {
      const collectionRef = collection(firestore, `users/${user.uid}/milestones`);
      addDocumentNonBlocking(collectionRef, finalData);
      toast({
        title: 'Hito Creado',
        description: `El hito "${data.nombre}" ha sido creado.`,
      });
    }
    
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <div className="space-y-4 p-1 max-h-[65vh] overflow-y-auto pr-4">
          <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre del Hito / Tarea</FormLabel> <FormControl><Input {...field} /></FormControl> <FormDescription>Un objetivo específico y medible.</FormDescription> <FormMessage /> </FormItem> )}/>
          
          <FormField
              control={form.control}
              name="milestone_type"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                          <SelectItem value="single">Hito Único (se completa una vez)</SelectItem>
                          <SelectItem value="recurring">Tarea Recurrente (hábito a registrar)</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormDescription>Define si es un gran logro o una tarea diaria para el tracker.</FormDescription>
                  <FormMessage />
                  </FormItem>
              )}
          />

          {milestoneType === 'recurring' && (
              <FormField
                  control={form.control}
                  name="target_count"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Objetivo de Repeticiones (Opcional)</FormLabel>
                      <FormControl><Input type="number" {...field} placeholder="Ej: 7" value={field.value || ''} /></FormControl>
                      <FormDescription>¿Cuántas veces se debe completar la tarea para alcanzar el hito? Déjalo en blanco para un hábito sin fin.</FormDescription>
                      <FormMessage />
                      </FormItem>
                  )}
              />
          )}


          <div className="grid grid-cols-2 gap-4">
              <FormField
              control={form.control}
              name="skill_id"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Habilidad (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || " "}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Vincular a habilidad..." /></SelectTrigger></FormControl>
                      <SelectContent>
                          <SelectItem value=" ">Ninguna</SelectItem>
                          {skills?.map(s => <SelectItem key={s.id} value={s.habilidad_id}>{s.nombre}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                  </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="system_id"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Sistema (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || " "}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Vincular a sistema..." /></SelectTrigger></FormControl>
                      <SelectContent>
                          <SelectItem value=" ">Ninguno</SelectItem>
                          {availableSystems?.map(s => <SelectItem key={s.id} value={s.sistema_id}>{s.objetivo}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                  </FormItem>
              )}
              />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="fecha_objetivo"
                  render={({ field }) => (
                      <FormItem className="flex flex-col">
                          <FormLabel>Fecha Objetivo (Opcional)</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <FormControl>
                                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
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
              {!(milestoneType === 'recurring' && !isEditMode) && (
                  <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                              {['Pendiente', 'Completado', 'Omitido'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              )}
          </div>

          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Criterios de éxito, recursos necesarios, etc." />
                </FormControl>
                <FormMessage />
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

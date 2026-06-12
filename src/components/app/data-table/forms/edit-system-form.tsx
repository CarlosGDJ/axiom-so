
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
import { Skill, System, Variable } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { protocolPresets } from '@/lib/seed-data';
import { useState } from 'react'; 
import { getAISystemPlan } from '@/lib/actions';
import type { GenerateSystemPlanOutput } from '@/ai/flows/generate-system-plan-flow';
import { Sparkles, Loader2 } from 'lucide-react'; 
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { addDays } from 'date-fns';
import { useUser } from '@/hooks/use-session-user';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/lib/api-writes';
const formSchema = z.object({
  userPrompt: z.string().optional(),
  objetivo: z.string().optional(),
  habilidad_id: z.string({ required_error: 'Por favor, selecciona una habilidad.' }),
  frecuencia: z.enum(['Diaria', '3xSemana', 'Semanal', 'Mensual']),
  estado: z.enum(['Activo', 'Pausa']),
  protocolo_fallo: z.string(),
});

type EditSystemFormValues = z.infer<typeof formSchema>;

interface EditSystemFormProps {
  entity?: System;
  closeDialog: () => void;
  skills: Skill[];
  variables: Variable[];
}

export default function EditSystemForm({ entity: system, closeDialog, skills, variables }: EditSystemFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const isEditMode = !!system;

  const [step, setStep] = useState<'prompt' | 'review'>(isEditMode ? 'review' : 'prompt');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<GenerateSystemPlanOutput | null>(null);

  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [selectedMilestones, setSelectedMilestones] = useState<number[]>([]);

  const form = useForm<EditSystemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? { ...system } : {
        userPrompt: '',
        habilidad_id: skills?.[0]?.habilidad_id,
        frecuencia: 'Diaria',
        estado: 'Activo',
        protocolo_fallo: protocolPresets[0].protocolo_id,
    },
  });

  const handleGeneratePlan = async () => {
    const userPrompt = form.getValues('userPrompt');
    if (!userPrompt || !variables || !skills) return;

    setIsAiLoading(true);
    try {
      const plan = await getAISystemPlan(userPrompt, skills, variables);
      setAiPlan(plan);
      form.setValue('objetivo', plan.systemObjective);
      form.setValue('habilidad_id', plan.skillId);
      // Pre-select all suggested items
      setSelectedHabits(plan.suggestedHabits.map(h => h.var_id));
      setSelectedMilestones(plan.suggestedMilestones.map((_, i) => i));
      setStep('review');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo generar el plan.' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleHabitSelection = (varId: string, isSelected: boolean) => {
    setSelectedHabits(prev => 
      isSelected ? [...prev, varId] : prev.filter(id => id !== varId)
    );
  };

  const handleMilestoneSelection = (index: number, isSelected: boolean) => {
    setSelectedMilestones(prev =>
        isSelected ? [...prev, index] : prev.filter(i => i !== index)
    );
  };

  async function onSubmit(data: EditSystemFormValues) {
    if (!uid) return;

    let sistemaId = isEditMode ? system.sistema_id : '';
    const { userPrompt, ...systemData } = data; // Exclude userPrompt from final data
    const finalData = { ...systemData, sistema_id: sistemaId };

    if (isEditMode) {
        setDocumentNonBlocking('systems', system.id, finalData, { merge: true });
    } else {
        // Generate a temporary client-side ID for the new system
        const newId = `SYS_${Date.now()}`;
        finalData.sistema_id = newId;
        sistemaId = newId;
        addDocumentNonBlocking('systems', finalData);

        // Create habits for selected suggestions
        aiPlan?.suggestedHabits.forEach(habitSuggestion => {
            if (selectedHabits.includes(habitSuggestion.var_id)) {
                addDocumentNonBlocking('habits', {
                    habito_id: `HAB_${Date.now()}_${habitSuggestion.var_id}`,
                    sistema_id: sistemaId,
                    ...habitSuggestion,
                });
            }
        });

        // Create milestones for selected suggestions
        aiPlan?.suggestedMilestones.forEach((milestoneSuggestion, index) => {
            if (selectedMilestones.includes(index)) {
                addDocumentNonBlocking('milestones', {
                    milestone_id: `MIL_${Date.now()}_${index}`,
                    nombre: milestoneSuggestion.nombre,
                    milestone_type: milestoneSuggestion.milestone_type,
                    target_count: milestoneSuggestion.target_count,
                    fecha_objetivo: addDays(new Date(), milestoneSuggestion.relative_deadline_days).toISOString(),
                    estado: 'Pendiente',
                    skill_id: finalData.habilidad_id,
                    system_id: sistemaId,
                    progress_count: 0,
                });
            }
        });
    }

    toast({
      title: isEditMode ? 'Sistema Actualizado' : 'Sistema y Componentes Creados',
      description: `El sistema ${data.objetivo} ha sido guardado.`,
    });
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        {step === 'prompt' && !isEditMode ? (
          <div className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="userPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Qué quieres lograr?</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Ej: Quiero levantarme a las 5 AM todos los días sintiéndome con energía y sin usar el botón de snooze." rows={4} />
                  </FormControl>
                  <FormDescription>Describe tu meta en lenguaje natural. La IA te propondrá un plan completo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="button" onClick={handleGeneratePlan} disabled={isAiLoading || !form.watch('userPrompt')}>
                    {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generar Plan con IA
                </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6 p-1 max-h-[65vh] overflow-y-auto pr-4">
              <FormField control={form.control} name="objetivo" render={({ field }) => ( <FormItem> <FormLabel>Objetivo del Sistema</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="habilidad_id" render={({ field }) => ( <FormItem> <FormLabel>Habilidad Principal</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> {skills?.map(skill => <SelectItem key={skill.id} value={skill.habilidad_id}>{skill.nombre}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )} />

              {!isEditMode && aiPlan && (
                <>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Hábitos Sugeridos</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {aiPlan.suggestedHabits.map(habit => (
                            <div key={habit.var_id} className="flex items-start space-x-3 rounded-md border p-3">
                                <Checkbox id={`habit-${habit.var_id}`} onCheckedChange={(checked) => handleHabitSelection(habit.var_id, !!checked)} defaultChecked />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor={`habit-${habit.var_id}`} className="text-sm font-medium leading-none">{habit.description}</label>
                                    <p className="text-sm text-muted-foreground">Variable: {variables.find(v => v.var_id === habit.var_id)?.var_nombre || habit.var_id}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader><CardTitle className="text-base">Hitos Sugeridos</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {aiPlan.suggestedMilestones.map((milestone, index) => (
                             <div key={index} className="flex items-start space-x-3 rounded-md border p-3">
                                <Checkbox id={`milestone-${index}`} onCheckedChange={(checked) => handleMilestoneSelection(index, !!checked)} defaultChecked />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor={`milestone-${index}`} className="text-sm font-medium leading-none">{milestone.nombre}</label>
                                    <p className="text-sm text-muted-foreground">
                                        Tipo: {milestone.milestone_type === 'recurring' ? `Recurrente (${milestone.target_count} veces)` : 'Único'} | Plazo: {milestone.relative_deadline_days} días
                                    </p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                  </Card>
                </>
              )}
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="frecuencia" render={({ field }) => ( <FormItem> <FormLabel>Frecuencia</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> {['Diaria', '3xSemana', 'Semanal', 'Mensual'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)} </SelectContent> </Select> </FormItem> )} />
                <FormField control={form.control} name="estado" render={({ field }) => ( <FormItem> <FormLabel>Estado</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="Activo">Activo</SelectItem> <SelectItem value="Pausa">Pausa</SelectItem> </SelectContent> </Select> </FormItem> )} />
              </div>
              <FormField control={form.control} name="protocolo_fallo" render={({ field }) => ( <FormItem> <FormLabel>Protocolo de Fallo</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> {protocolPresets.map(p => <SelectItem key={p.protocolo_id} value={p.protocolo_id}>{p.nombre}</SelectItem>)} </SelectContent> </Select> </FormItem> )} />
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit">{isEditMode ? 'Guardar Cambios' : 'Crear Sistema y Componentes'}</Button>
            </div>
          </>
        )}
      </form>
    </Form>
  );
}

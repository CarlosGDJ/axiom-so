
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Meh, ThumbsUp, ThumbsDown, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Interaction, Relation } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';

const formSchema = z.object({
  persona_id: z.string({ required_error: "Por favor, selecciona una persona."}),
  energia_resultante: z.coerce.number().min(-1).max(1),
  respeto_percibido: z.coerce.number().min(-1).max(1),
  contexto: z.string().optional(),
});

type InteractionFormValues = z.infer<typeof formSchema>;

interface InteractionLogFormProps {
    entity: Interaction;
    closeDialog: () => void;
    relations: Relation[];
}

export default function InteractionLogForm({ entity: interaction, closeDialog, relations }: InteractionLogFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const isEditMode = !!interaction;
  
  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
      ? {
          ...interaction,
          contexto: interaction.contexto || '',
        }
      : {
          persona_id: undefined,
          energia_resultante: 0,
          respeto_percibido: 0,
          contexto: '',
        },
  });

  useEffect(() => {
    if (isEditMode) {
      form.reset({
        ...interaction,
        contexto: interaction.contexto || '',
      });
    }
  }, [interaction, isEditMode, form]);

  async function onSubmit(data: InteractionFormValues) {
    if (!user || !firestore) return;
    
    if (isEditMode) {
        const docRef = doc(firestore, `users/${user.uid}/interactions`, interaction.id);
        setDocumentNonBlocking(docRef, data, { merge: true });
        toast({
          title: 'Interacción Actualizada',
          description: `Se ha actualizado la interacción.`,
        });
    } else {
        const interactionCollectionRef = collection(firestore, `users/${user.uid}/interactions`);
        addDocumentNonBlocking(interactionCollectionRef, {
            ...data,
            fecha: new Date().toISOString(),
            interaccion_id: `INT_${Date.now()}`
        });
        toast({
          title: 'Interacción Registrada',
          description: `Se ha registrado la interacción.`,
        });
    }
    
    form.reset({ energia_resultante: 0, respeto_percibido: 0, persona_id: undefined, contexto: ''});
    closeDialog();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="persona_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona o Grupo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                   <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una persona..." />
                        </SelectTrigger>
                   </FormControl>
                   <SelectContent>
                        {relations.map((relation) => (
                            <SelectItem key={relation.id} value={relation.persona_id}>
                                {relation.nombre} ({relation.rol})
                            </SelectItem>
                        ))}
                   </SelectContent>
                </Select>
               <FormDescription>¿Con quién o quiénes fue la interacción</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="energia_resultante"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>¿Cómo te sientes después</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                  className="grid grid-cols-3 gap-4 pt-2"
                >
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem value="1" id="energized" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="energized" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <ArrowUp className="mb-3 h-6 w-6 text-green-500" />
                      Energizado/a
                    </FormLabel>
                  </FormItem>
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem value="0" id="neutral-energy" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="neutral-energy" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <ArrowRight className="mb-3 h-6 w-6 text-yellow-500" />
                      Neutral
                    </FormLabel>
                  </FormItem>
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem value="-1" id="drained" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="drained" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <ArrowDown className="mb-3 h-6 w-6 text-red-500" />
                      Drenado/a
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormDescription>Piensa en tu nivel de energía personal tras la interacción.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="respeto_percibido"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>¿Te sentiste respetado/a</FormLabel>
               <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={String(field.value)}
                  className="grid grid-cols-3 gap-4 pt-2"
                >
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem value="1" id="respected" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="respected" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <ThumbsUp className="mb-3 h-6 w-6 text-green-500" />
                      Respetado/a
                    </FormLabel>
                  </FormItem>
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem value="0" id="neutral-respect" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="neutral-respect" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <Meh className="mb-3 h-6 w-6 text-yellow-500" />
                      Neutral
                    </FormLabel>
                  </FormItem>
                  <FormItem>
                    <FormControl>
                      <RadioGroupItem value="-1" id="disrespected" className="sr-only" />
                    </FormControl>
                    <FormLabel htmlFor="disrespected" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <ThumbsDown className="mb-3 h-6 w-6 text-red-500" />
                      Irrespetado/a
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormDescription>Evalúa si sentiste que tus opiniones y límites fueron valorados.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="contexto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contexto (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Anota cualquier detalle clave sobre la interacción..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit">Registrar Interacción</Button>
        </div>
      </form>
    </Form>
  );
}


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
import { Meh, ThumbsUp, ThumbsDown, ArrowUp, ArrowRight, ArrowDown, UserPlus } from 'lucide-react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Relation } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import EditRelationForm from '../data-table/forms/edit-relation-form';


const formSchema = z.object({
  persona_id: z.string().min(1, 'Por favor, selecciona una persona.'),
  energia_resultante: z.coerce.number().min(-1).max(1),
  respeto_percibido: z.coerce.number().min(-1).max(1),
  contexto: z.string().optional(),
});

type InteractionFormValues = z.infer<typeof formSchema>;

interface InteractionLogFormProps {
    closeDialog: () => void;
    relations: Relation[];
}

export default function InteractionLogForm({ closeDialog, relations }: InteractionLogFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  
  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      persona_id: '',
      energia_resultante: 0,
      respeto_percibido: 0,
      contexto: '',
    }
  });

  async function onSubmit(data: InteractionFormValues) {
    if (!user || !firestore) return;

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
    form.reset({ energia_resultante: 0, respeto_percibido: 0, persona_id: '', contexto: ''});
    closeDialog();
  }

  const handleSelectChange = (value: string) => {
    if (value === 'add_new') {
      setIsAddPersonOpen(true);
    } else {
      form.setValue('persona_id', value);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
          <div className="space-y-6 p-1 max-h-[65vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="persona_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona o Grupo</FormLabel>
                  <Select onValueChange={handleSelectChange} value={field.value}>
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
                      <SelectItem value="add_new" className="text-primary font-semibold">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Añadir nueva persona...
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>¿Con quién o quiénes fue la interacción?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="energia_resultante"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cómo te sientes después?</FormLabel>
                  <FormDescription>Piensa en tu nivel de energía personal tras la interacción.</FormDescription>
                  <RadioGroup
                    className="grid grid-cols-3 gap-4 pt-2"
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormLabel htmlFor="energized" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <RadioGroupItem value="1" id="energized" className="sr-only" />
                      <ArrowUp className="mb-3 h-6 w-6 text-green-500" />
                      Energizado/a
                    </FormLabel>
                    <FormLabel htmlFor="neutral-energy" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <RadioGroupItem value="0" id="neutral-energy" className="sr-only" />
                      <ArrowRight className="mb-3 h-6 w-6 text-yellow-500" />
                      Neutral
                    </FormLabel>
                    <FormLabel htmlFor="drained" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <RadioGroupItem value="-1" id="drained" className="sr-only" />
                      <ArrowDown className="mb-3 h-6 w-6 text-red-500" />
                      Drenado/a
                    </FormLabel>
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Controller
              name="respeto_percibido"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Te sentiste respetado/a?</FormLabel>
                  <FormDescription>Evalúa si sentiste que tus opiniones y límites fueron valorados.</FormDescription>
                  <RadioGroup
                    className="grid grid-cols-3 gap-4 pt-2"
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormLabel htmlFor="respected" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <RadioGroupItem value="1" id="respected" className="sr-only" />
                      <ThumbsUp className="mb-3 h-6 w-6 text-green-500" />
                      Respetado/a
                    </FormLabel>
                    <FormLabel htmlFor="neutral-respect" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <RadioGroupItem value="0" id="neutral-respect" className="sr-only" />
                      <Meh className="mb-3 h-6 w-6 text-yellow-500" />
                      Neutral
                    </FormLabel>
                    <FormLabel htmlFor="disrespected" className="flex w-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <RadioGroupItem value="-1" id="disrespected" className="sr-only" />
                      <ThumbsDown className="mb-3 h-6 w-6 text-red-500" />
                      Irrespetado/a
                    </FormLabel>
                  </RadioGroup>
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
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit">Registrar Interacción</Button>
          </div>
        </form>
      </Form>

      <Dialog open={isAddPersonOpen} onOpenChange={setIsAddPersonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Nueva Persona</DialogTitle>
            <DialogDescription>
              Añade una nueva persona a tu lista de relaciones.
            </DialogDescription>
          </DialogHeader>
          <EditRelationForm closeDialog={() => setIsAddPersonOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

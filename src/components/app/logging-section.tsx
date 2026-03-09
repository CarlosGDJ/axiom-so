
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import EventLogForm from './forms/event-log-form';
import TransactionLogForm from './forms/transaction-log-form';
import InteractionLogForm from './forms/interaction-log-form';
import QuickHabitForm from './forms/quick-habit-form';
import { CalendarDays, DollarSign, Users, Bot, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useUserData } from '@/hooks/use-user-data';


type DialogType = 'event' | 'transaction' | 'interaction' | 'habit' | null;

interface LoggingSectionProps {
  suggestions: any[]; // Legacy type placeholder
  isLoading: boolean;
  isPremium: boolean;
}

export default function LoggingSection({ isLoading, isPremium }: LoggingSectionProps) {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const [prefillData, setPrefillData] = useState<any>(null);
  const { data: userData } = useUserData();

  const handleQuickAction = (dialogType: DialogType, data: any) => {
    try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        setPrefillData(parsedData);
        setOpenDialog(dialogType);
    } catch (error) {
        console.error("Error parsing prefill data:", error);
        setPrefillData(null);
        setOpenDialog(dialogType);
    }
  };

  const handleDialogChange = (isOpen: boolean, dialogType: DialogType) => {
    if (!isOpen) {
        setOpenDialog(null);
        setPrefillData(null);
    } else {
        setOpenDialog(dialogType);
    }
  };

  // Static base suggestions
  const baseSuggestions = [
    { text: '¿Has dormido bien esta noche?', type: 'event' as DialogType, var_id: 'SUEÑO_OK', prefill: { var_id: 'SUEÑO_OK', intensidad: 5, tipo: 'Variable' } },
    { text: '¿Registrar sesión Deep Work?', type: 'event' as DialogType, var_id: 'DEEP_WORK', prefill: { var_id: 'DEEP_WORK', intensidad: 4, tipo: 'Variable' } },
    { text: '¿Ducha fría / Reseteo?', type: 'event' as DialogType, var_id: 'P_RESET_5', prefill: { var_id: 'P_RESET_5', intensidad: 5, tipo: 'Protocolo' } },
    { text: '¿Entrenamiento realizado?', type: 'event' as DialogType, var_id: 'FUERZA', prefill: { var_id: 'FUERZA', intensidad: 5, tipo: 'Variable' } },
    { text: '¿Momento de relax/ocio?', type: 'event' as DialogType, var_id: 'OCIO_OK', prefill: { var_id: 'OCIO_OK', intensidad: 4, tipo: 'Variable' } },
  ];

  // Frequency-based sorting algorithm for suggestions
  const sortedSuggestions = useMemo(() => {
    if (!userData?.events) return baseSuggestions.slice(0, 3);

    const freqMap: Record<string, number> = {};
    userData.events.forEach(e => {
        freqMap[e.var_id] = (freqMap[e.var_id] || 0) + 1;
    });

    return [...baseSuggestions].sort((a, b) => {
        const freqA = freqMap[a.var_id] || 0;
        const freqB = freqMap[b.var_id] || 0;
        return freqB - freqA;
    }).slice(0, 3); // Always show top 3 relevant suggestions
  }, [userData?.events]);

  return (
    <Card className="flex-grow flex flex-col">
      <CardHeader>
        <CardTitle>Bitácora de Sistema</CardTitle>
        <CardDescription>Registra sucesos o intervenciones para estabilizar tu bioperfil.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow justify-between">
        <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Bot size={16}/> Sugerencias de Frecuencia
            </h4>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {sortedSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 justify-start text-left whitespace-normal border-primary/10 hover:bg-primary/5 transition-all"
                    onClick={() => handleQuickAction(suggestion.type, suggestion.prefill)}
                  >
                    <span className="block font-normal text-xs">{suggestion.text}</span>
                  </Button>
                ))}
              </div>
            )}
        </div>
        
        <div className="flex flex-col gap-2 mt-6">
            <Button variant="outline" className="h-14 justify-start font-bold text-lg border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors" onClick={() => handleQuickAction('event', { tipo: 'Variable' })}>
                <div className="bg-primary text-white p-2 rounded-md mr-3 shadow-sm">
                    <CalendarDays size={20}/>
                </div>
                Registrar Evento
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button variant="outline" className="h-12 justify-start" onClick={() => handleQuickAction('transaction', null)}>
                    <DollarSign className="mr-2 h-5 w-5 text-green-600"/>
                    Transacción
                </Button>
                <Button variant="outline" className="h-12 justify-start" onClick={() => handleQuickAction('interaction', null)}>
                    <Users className="mr-2 h-5 w-5 text-blue-600"/>
                    Interacción Social
                </Button>
            </div>
        </div>

        {/* Dialog for Event/Protocol Logging */}
        <Dialog open={openDialog === 'event'} onOpenChange={(isOpen) => handleDialogChange(isOpen, 'event')}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Registrar Actividad del Sistema</DialogTitle>
                    <DialogDescription>
                        Elige entre un Suceso (orgánico) o una Intervención (táctico). Los más frecuentes aparecen primero.
                    </DialogDescription>
                </DialogHeader>
                <EventLogForm 
                    closeDialog={() => setOpenDialog(null)} 
                    prefill={prefillData} 
                    variables={userData?.variables}
                    protocols={userData?.protocols}
                    events={userData?.events}
                />
            </DialogContent>
        </Dialog>

        {/* Other Dialogs */}
        <Dialog open={openDialog === 'transaction'} onOpenChange={(isOpen) => handleDialogChange(isOpen, 'transaction')}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Transacción</DialogTitle>
                    <DialogDescription>Añade un ingreso o un gasto para mantener tus finanzas al día.</DialogDescription>
                </DialogHeader>
                <TransactionLogForm closeDialog={() => setOpenDialog(null)} prefill={prefillData} accounts={userData?.accounts || []} debts={userData?.debts || []} />
            </DialogContent>
        </Dialog>

        <Dialog open={openDialog === 'interaction'} onOpenChange={(isOpen) => handleDialogChange(isOpen, 'interaction')}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Interacción Social</DialogTitle>
                    <DialogDescription>Evalúa el impacto energético de tus relaciones recientes.</DialogDescription>
                </DialogHeader>
                <InteractionLogForm closeDialog={() => setOpenDialog(null)} relations={userData?.relations || []}/>
            </DialogContent>
        </Dialog>

         <Dialog open={openDialog === 'habit'} onOpenChange={(isOpen) => handleDialogChange(isOpen, 'habit')}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Hábito Rápido</DialogTitle>
                    <DialogDescription>Crea un nuevo hábito para empezar a seguirlo desde hoy.</DialogDescription>
                </DialogHeader>
                <QuickHabitForm closeDialog={() => setOpenDialog(null)} />
            </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
}

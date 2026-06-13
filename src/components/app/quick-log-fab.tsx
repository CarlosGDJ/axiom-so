'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Plus, X, Zap, CheckCircle2, Smile, DollarSign, Users,
  Mic, MicOff, Search, Clock, ShieldAlert, Sparkles, Loader2, Trash2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useUserData } from '@/hooks/use-user-data';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import TransactionLogForm from './forms/transaction-log-form';
import InteractionLogForm from './forms/interaction-log-form';
import type { Variable } from '@/lib/types';
import { haptic } from '@/lib/haptic';
import { parseNaturalLogAction } from '@/lib/actions';
import type { ParseNaturalLogOutput, ParsedLogEvent } from '@/lib/actions';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
import { useTour } from '@/components/app/tour/tour-context';
type ActiveDialog = 'evento' | 'habito' | 'estado' | 'transaccion' | 'social' | 'nlp' | null;

const MOOD_OPTIONS = [
  { emoji: '😞', label: 'Muy mal',  var_id: 'FRUSTRATION', intensidad: 5 },
  { emoji: '😕', label: 'Mal',      var_id: 'FRUSTRATION', intensidad: 3 },
  { emoji: '😐', label: 'Regular',  var_id: 'GRATITUDE',   intensidad: 2 },
  { emoji: '🙂', label: 'Bien',     var_id: 'GRATITUDE',   intensidad: 3 },
  { emoji: '😊', label: 'Muy bien', var_id: 'GRATITUDE',   intensidad: 5 },
] as const;

const SPEED_DIAL_ACTIONS = [
  { key: 'evento' as ActiveDialog,      label: 'Evento',   icon: Zap,          color: 'bg-primary text-primary-foreground hover:bg-primary/90',       labelColor: 'bg-popover text-primary border-primary/40' },
  { key: 'habito' as ActiveDialog,      label: 'Hábito',   icon: CheckCircle2, color: 'bg-green-600 text-white hover:bg-green-700',                   labelColor: 'bg-popover text-green-500 border-green-500/40' },
  { key: 'estado' as ActiveDialog,      label: 'Estado',   icon: Smile,        color: 'bg-violet-600 text-white hover:bg-violet-700',                 labelColor: 'bg-popover text-violet-500 border-violet-500/40' },
  { key: 'transaccion' as ActiveDialog, label: 'Movimiento', icon: DollarSign,   color: 'bg-orange-500 text-white hover:bg-orange-600',                 labelColor: 'bg-popover text-orange-500 border-orange-500/40' },
  { key: 'social' as ActiveDialog,      label: 'Social',   icon: Users,        color: 'bg-blue-600 text-white hover:bg-blue-700',                     labelColor: 'bg-popover text-blue-500 border-blue-500/40' },
];

// Variable IDs suggested by time slot (morning/midday/afternoon/evening)
const TIME_SLOT_VARS: Record<string, string[]> = {
  morning:   ['SUEÑO_OK', 'ENERGIA', 'CAFÉ_CAFEÍNA', 'MEDITACION'],
  midday:    ['DEEP_WORK', 'ALIM_BASURA', 'EJERCICIO_FIS', 'CAFÉ_CAFEÍNA'],
  afternoon: ['DOPA_RAP', 'EJERCICIO_FIS', 'REACTIVIDAD', 'DEEP_WORK'],
  evening:   ['SOCIAL_NET', 'DOPA_RAP', 'SUEÑO_OK', 'GRATITUDE'],
  night:     ['SUEÑO_OK', 'REACTIVIDAD', 'DOPA_RAP', 'ALCOHOL'],
};

// Variable IDs boosted by system state
const STATE_BOOST_VARS: Record<string, string[]> = {
  CRITICO: ['SUEÑO_OK', 'GRATITUDE', 'MEDITACION', 'EJERCICIO_FIS'],
  RIESGO:  ['EJERCICIO_FIS', 'DEEP_WORK', 'SUEÑO_OK', 'MEDITACION'],
};

function getTimeSlot(): string {
  const h = new Date().getHours();
  if (h >= 6  && h < 11) return 'morning';
  if (h >= 11 && h < 15) return 'midday';
  if (h >= 15 && h < 20) return 'afternoon';
  if (h >= 20 && h < 24) return 'evening';
  return 'night';
}

function getTimeSlotLabel(slot: string): string {
  return { morning: 'Mañana', midday: 'Mediodía', afternoon: 'Tarde', evening: 'Noche', night: 'Noche' }[slot] ?? 'Ahora';
}

// ── Voice Hook ──────────────────────────────────────────────────────────────
function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!supported) return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      onResult(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [supported, onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening, supported };
}

// ── Searchable Variable Picker ───────────────────────────────────────────────
interface VarPickerProps {
  variables: Variable[];
  isLoading?: boolean;
  onSelect: (v: Variable) => void;
}

function VarPicker({ variables, isLoading, onSelect }: VarPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return variables.filter(v => !q || v.var_nombre.toLowerCase().includes(q) || v.var_id.toLowerCase().includes(q));
  }, [variables, query]);

  const positive = filtered.filter(v => v.polaridad === 1);
  const negative = filtered.filter(v => v.polaridad === -1);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar variable..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>
      <div className="max-h-52 overflow-y-auto rounded-md border bg-background divide-y divide-border">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Cargando variables…
          </div>
        )}
        {!isLoading && variables.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Completa la calibración inicial para ver tus variables.
          </p>
        )}
        {!isLoading && variables.length > 0 && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Sin resultados para "{query}"</p>
        )}
        {positive.length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-green-600 bg-green-50/50 dark:bg-green-900/10 sticky top-0">Positivos</p>
            {positive.map(v => (
              <button
                key={v.var_id}
                onClick={() => onSelect(v)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                {v.var_nombre}
              </button>
            ))}
          </div>
        )}
        {negative.length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-red-500 bg-red-50/50 dark:bg-red-900/10 sticky top-0">Negativos</p>
            {negative.map(v => (
              <button
                key={v.var_id}
                onClick={() => onSelect(v)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                {v.var_nombre}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function QuickLogFab() {
  const [dialOpen, setDialOpen]         = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [selectedVar, setSelectedVar]   = useState<Variable | null>(null);
  const [intensity, setIntensity]       = useState(3);
  const [note, setNote]                 = useState('');
  const [impulsivo, setImpulsivo]       = useState(false);

  const { data: userData, isLoading: isUserDataLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast }           = useToast();
  const { isActive: tourActive, currentStep, steps } = useTour();

  // Auto-open speed dial when the tour highlights this component
  useEffect(() => {
    if (tourActive && steps[currentStep]?.target === 'quick-log') {
      setDialOpen(true);
    } else if (!tourActive) {
      // Don't forcibly close when tour ends — user might want it open
    }
  }, [tourActive, currentStep, steps]);

  const allActiveVars = useMemo(
    () => (userData?.variables ?? []).filter(v => v.activo),
    [userData?.variables],
  );

  // Contextual suggestion chips
  const contextualChips = useMemo(() => {
    if (!userData?.variables) return [];
    const slot      = getTimeSlot();
    const state     = userData.overallState ?? 'OK';
    const varById   = Object.fromEntries(userData.variables.map(v => [v.var_id, v]));
    const freq: Record<string, number> = {};
    (userData.events ?? []).forEach(e => { freq[e.var_id] = (freq[e.var_id] || 0) + 1; });

    // Gather candidate IDs: state boost first, then time slot
    const stateCandidates  = (STATE_BOOST_VARS[state] ?? []);
    const timeCandidates   = (TIME_SLOT_VARS[slot]   ?? []);
    const ordered = [...new Set([...stateCandidates, ...timeCandidates])];

    // Map to real variables (only those the user actually has)
    const fromCandidates = ordered
      .map(id => varById[id])
      .filter(Boolean)
      .filter(v => v.activo)
      .slice(0, 3);

    // Fill remaining slots with frequency-based
    const usedIds = new Set(fromCandidates.map(v => v.var_id));
    const frequencyBased = userData.variables
      .filter(v => v.activo && freq[v.var_id] && !usedIds.has(v.var_id))
      .sort((a, b) => (freq[b.var_id] || 0) - (freq[a.var_id] || 0))
      .slice(0, 6 - fromCandidates.length);

    return [...fromCandidates, ...frequencyBased].slice(0, 6);
  }, [userData]);

  const timeSlot = getTimeSlot();
  const systemState = userData?.overallState ?? 'OK';

  const { isListening, startListening, stopListening, supported: voiceSupported } = useVoiceInput(
    (text) => setNote(prev => prev ? `${prev} ${text}` : text),
  );

  // ── NLP state ──
  const [nlpText, setNlpText]               = useState('');
  const [nlpParsing, setNlpParsing]         = useState(false);
  const [nlpError, setNlpError]             = useState<string | null>(null);
  const [nlpEvents, setNlpEvents]           = useState<ParsedLogEvent[]>([]);
  const [nlpResumen, setNlpResumen]         = useState('');
  const [nlpIntensities, setNlpIntensities] = useState<Record<number, number>>({});

  const { isListening: nlpListening, startListening: nlpStartListen, stopListening: nlpStopListen, supported: nlpVoiceSupported } = useVoiceInput(
    (text) => setNlpText(prev => prev ? `${prev} ${text}` : text),
  );

  function closeNlp() {
    setNlpText('');
    setNlpParsing(false);
    setNlpError(null);
    setNlpEvents([]);
    setNlpResumen('');
    setNlpIntensities({});
    if (nlpListening) nlpStopListen();
  }

  async function handleNlpParse() {
    if (!nlpText.trim()) return;
    setNlpParsing(true);
    setNlpError(null);
    setNlpEvents([]);
    try {
      const result = await parseNaturalLogAction(
        nlpText,
        allActiveVars.map(v => ({ var_id: v.var_id, var_nombre: v.var_nombre, polaridad: v.polaridad })),
      );
      setNlpEvents(result.events);
      setNlpResumen(result.resumen);
      setNlpIntensities(Object.fromEntries(result.events.map((e, i) => [i, e.intensidad])));
    } catch (err) {
      setNlpError(err instanceof Error ? err.message : 'Error al analizar el texto.');
    } finally {
      setNlpParsing(false);
    }
  }

  function handleNlpCommit() {
    if (!user || nlpEvents.length === 0) return;
    haptic('success');
    nlpEvents.forEach((ev, i) => {
      const intensidad = nlpIntensities[i] ?? ev.intensidad;
      addDocumentNonBlocking('events', {
        evento_id: `EVT_NLP_${Date.now()}_${i}`,
        fecha: new Date().toISOString(),
        var_id: ev.var_id,
        intensidad,
        contexto: ev.contexto,
        tipo: 'Variable',
        impulsivo: false,
      });
    });
    toast({
      title: `${nlpEvents.length} evento${nlpEvents.length > 1 ? 's' : ''} registrado${nlpEvents.length > 1 ? 's' : ''}`,
      description: nlpResumen,
    });
    closeNlp();
    closeDialog();
  }

  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function writeEvent(var_id: string | undefined, intensidad: number, contexto: string, tipo = 'Variable', isImpulsivo = false, habitoId?: string): () => void {
    if (!user) return () => {};

    // Cancel any previous pending write (edge case: rapid fire)
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);

    let cancelled = false;
    const undo = () => {
      cancelled = true;
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };

    pendingTimerRef.current = setTimeout(() => {
      if (cancelled) return;
      addDocumentNonBlocking('events', {
        evento_id: `EVT_QUICK_${Date.now()}`,
        fecha:     new Date().toISOString(),
        ...(var_id ? { var_id } : {}),
        ...(habitoId ? { habito_id: habitoId } : {}),
        intensidad,
        duracion_min: 0,
        contexto,
        impulsivo: isImpulsivo,
        persona_id: '',
        monto: 0,
        tipo,
        milestone_id: '',
      });
    }, 2500);

    return undo;
  }

  function openDialog(key: ActiveDialog) {
    setDialOpen(false);
    setActiveDialog(key);
  }

  function closeDialog() {
    setActiveDialog(null);
    setSelectedVar(null);
    setIntensity(3);
    setNote('');
    setImpulsivo(false);
    if (isListening) stopListening();
    closeNlp();
  }

  function handleQuickChip(v: Variable) {
    haptic('tap');
    const undo = writeEvent(v.var_id, 4, `Registro rápido: ${v.var_nombre}`);
    toast({
      title: 'Evento registrado',
      description: v.var_nombre,
      action: <ToastAction altText="Deshacer" onClick={undo}>Deshacer</ToastAction>,
    });
    closeDialog();
  }

  function handleSubmitEvento() {
    if (!selectedVar) return;
    haptic('success');
    const undo = writeEvent(selectedVar.var_id, intensity, note.trim() || 'Registro rápido', 'Variable', impulsivo);
    toast({
      title: 'Evento registrado',
      description: `${selectedVar.var_nombre} · ${intensity}/5`,
      action: <ToastAction altText="Deshacer" onClick={undo}>Deshacer</ToastAction>,
    });
    closeDialog();
  }

  function handleHabit(habit: { id: string; var_id?: string }, name: string) {
    haptic('success');
    const undo = writeEvent(habit.var_id, 5, `Hábito completado: ${name}`, 'Habito', false, habit.id);
    toast({
      title: '✓ Hábito completado',
      description: name,
      action: <ToastAction altText="Deshacer" onClick={undo}>Deshacer</ToastAction>,
    });
    closeDialog();
  }

  function handleMood(opt: (typeof MOOD_OPTIONS)[number]) {
    haptic('tap');
    const undo = writeEvent(opt.var_id, opt.intensidad, `Estado de ánimo: ${opt.label}`);
    toast({
      title: 'Estado registrado',
      description: opt.label,
      action: <ToastAction altText="Deshacer" onClick={undo}>Deshacer</ToastAction>,
    });
    closeDialog();
  }

  return (
    <>
      {/* Backdrop */}
      {dialOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDialOpen(false)} />
      )}

      {/* Speed dial — elevado en móvil para no chocar con la barra inferior */}
      <div data-tour="quick-log" className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end gap-2.5">

        {/* Standard actions */}
        {SPEED_DIAL_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          const delay = i * 40;
          return (
            <div
              key={action.key}
              className={cn(
                'flex items-center gap-3 transition-all duration-200',
                dialOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
              )}
              style={{ transitionDelay: dialOpen ? `${delay}ms` : `${(SPEED_DIAL_ACTIONS.length - 1 - i) * 30}ms` }}
            >
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm whitespace-nowrap', action.labelColor)}>
                {action.label}
              </span>
              <button
                onClick={() => openDialog(action.key)}
                className={cn(
                  'h-12 w-12 rounded-full shadow-md flex items-center justify-center hover:scale-110 btn-icon-press',
                  action.color,
                )}
                aria-label={action.label}
              >
                <Icon className="h-5 w-5" />
              </button>
            </div>
          );
        })}

        {/* IA Natural — pill button, visually separate */}
        <div
          className={cn(
            'transition-all duration-200 mt-1',
            dialOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
          )}
          style={{ transitionDelay: dialOpen ? `${SPEED_DIAL_ACTIONS.length * 40}ms` : '0ms' }}
        >
          <button
            onClick={() => openDialog('nlp')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-md bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 hover:scale-105 transition-all btn-icon-press"
            aria-label="Registro Natural con IA"
          >
            <Sparkles className="h-4 w-4" />
            Registro con IA
          </button>
        </div>

        {/* Main FAB */}
        <Button
          onClick={() => setDialOpen(v => !v)}
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg shadow-primary/30 transition-all duration-300 mt-1',
            dialOpen ? 'rotate-45 bg-muted-foreground hover:bg-muted-foreground/90' : 'rotate-0',
          )}
          aria-label={dialOpen ? 'Cerrar' : 'Registro rápido'}
        >
          {dialOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </div>

      {/* ── Dialog: Evento ── */}
      <Dialog open={activeDialog === 'evento'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Zap className="h-4 w-4 text-primary fill-primary" />
              Registrar Evento
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getTimeSlotLabel(timeSlot)}
              </span>
              {systemState !== 'OK' && (
                <span className={cn(
                  'flex items-center gap-1 font-semibold',
                  systemState === 'CRITICO' ? 'text-destructive' : 'text-amber-500',
                )}>
                  <ShieldAlert className="h-3 w-3" />
                  {systemState}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-5 space-y-4 max-h-[75vh] overflow-y-auto">

            {/* ── Contextual chips ── */}
            {!selectedVar && contextualChips.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sugeridos ahora
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {contextualChips.map(v => (
                    <button
                      key={v.var_id}
                      onClick={() => handleQuickChip(v)}
                      className={cn(
                        'px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                        v.polaridad === 1
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
                      )}
                    >
                      {v.var_nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Separator ── */}
            {!selectedVar && contextualChips.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    o busca otra
                  </span>
                </div>
              </div>
            )}

            {/* ── Variable picker / Selected variable ── */}
            {!selectedVar ? (
              <VarPicker variables={allActiveVars} isLoading={isUserDataLoading} onSelect={setSelectedVar} />
            ) : (
              <div className="space-y-4">
                {/* Selected variable header */}
                <div className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      selectedVar.polaridad === 1 ? 'bg-green-500' : 'bg-red-500',
                    )} />
                    <span className="text-sm font-medium truncate">{selectedVar.var_nombre}</span>
                  </div>
                  <button
                    onClick={() => setSelectedVar(null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline shrink-0"
                  >
                    cambiar
                  </button>
                </div>

                {/* Intensity */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Intensidad</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setIntensity(n)}
                        className={cn(
                          'flex-1 h-9 rounded-md text-sm font-bold border-2 transition-colors',
                          intensity === n
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note + voice */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Contexto</span>
                    {voiceSupported && (
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className={cn(
                          'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors',
                          isListening
                            ? 'bg-red-500 text-white border-red-500 animate-pulse'
                            : 'text-muted-foreground border-border hover:border-primary/40 hover:text-primary',
                        )}
                      >
                        {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        {isListening ? 'Detener' : 'Voz'}
                      </button>
                    )}
                  </div>
                  <Textarea
                    placeholder={isListening ? '🎤 Escuchando...' : 'Contexto (opcional)...'}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="resize-none h-16 text-sm"
                  />
                </div>

                {/* Impulsive toggle */}
                <button
                  onClick={() => setImpulsivo(v => !v)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                    impulsivo
                      ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400'
                      : 'bg-muted/30 border-border text-muted-foreground hover:border-amber-300/50',
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full transition-colors', impulsivo ? 'bg-amber-500' : 'bg-muted-foreground/40')} />
                  Comportamiento impulsivo (no planificado)
                </button>

                <Button onClick={handleSubmitEvento} className="w-full">
                  Registrar evento
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Hábito ── */}
      <Dialog open={activeDialog === 'habito'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Marcar Hábito
            </DialogTitle>
            <DialogDescription>Toca el hábito que has completado hoy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto -mx-1 px-1">
            {(userData?.habits ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay hábitos configurados.</p>
            ) : (
              userData!.habits.map(habit => {
                const variable = userData!.variables.find(v => v.var_id === habit.var_id);
                const name = habit.nombre || variable?.var_nombre || habit.description || 'Hábito';
                return (
                  <button
                    key={habit.habito_id}
                    onClick={() => handleHabit(habit, name)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border hover:bg-green-500/5 hover:border-green-500/30 transition-colors text-left group"
                  >
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground group-hover:text-green-600 transition-colors shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{habit.frecuencia} · {habit.duracion_min} min</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Estado ── */}
      <Dialog open={activeDialog === 'estado'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Smile className="h-4 w-4 text-violet-600" />
              ¿Cómo estás ahora?
            </DialogTitle>
            <DialogDescription>Se registra en tu bioperfil y afecta al estado del sistema.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-between gap-2 py-2">
            {MOOD_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMood(opt)}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-transparent hover:border-violet-400/40 hover:bg-violet-500/5 transition-all active:scale-95"
              >
                <span className="text-3xl leading-none">{opt.emoji}</span>
                <span className="text-[9px] font-semibold text-muted-foreground leading-tight text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Transacción ── */}
      <Dialog open={activeDialog === 'transaccion'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <DollarSign className="h-4 w-4 text-orange-500" />
              Registrar Transacción
            </DialogTitle>
            <DialogDescription>Añade un ingreso o un gasto.</DialogDescription>
          </DialogHeader>
          <TransactionLogForm closeDialog={closeDialog} accounts={userData?.accounts ?? []} debts={userData?.debts ?? []} />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Social ── */}
      <Dialog open={activeDialog === 'social'} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="h-4 w-4 text-blue-600" />
              Registrar Interacción Social
            </DialogTitle>
            <DialogDescription>Evalúa el impacto energético de una interacción reciente.</DialogDescription>
          </DialogHeader>
          <InteractionLogForm closeDialog={closeDialog} relations={userData?.relations ?? []} />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Registro Natural con IA ── */}
      <Dialog open={activeDialog === 'nlp'} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Registro con IA
            </DialogTitle>
            <DialogDescription>
              Describe lo que pasó hoy. La IA extrae los eventos automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Textarea + voz */}
            <div className="relative">
              <Textarea
                placeholder={nlpListening ? '🎤 Escuchando...' : '"Dormí mal, fui al gym, discutí con mi jefe, comí pizza"'}
                value={nlpText}
                onChange={e => { setNlpText(e.target.value); setNlpEvents([]); setNlpError(null); }}
                className="resize-none h-28 text-sm pr-16"
                disabled={nlpParsing}
              />
              {nlpVoiceSupported && (
                <button
                  onClick={nlpListening ? nlpStopListen : nlpStartListen}
                  className={cn(
                    'absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors',
                    nlpListening
                      ? 'bg-red-500 text-white border-red-500 animate-pulse'
                      : 'bg-background text-muted-foreground border-border hover:border-violet-400 hover:text-violet-500',
                  )}
                >
                  {nlpListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  Voz
                </button>
              )}
            </div>

            {/* Analyze button */}
            {nlpEvents.length === 0 && (
              <Button
                className="w-full"
                onClick={handleNlpParse}
                disabled={!nlpText.trim() || nlpParsing}
              >
                {nlpParsing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analizando…</>
                  : <><Sparkles className="h-4 w-4 mr-2" />Analizar y extraer eventos</>
                }
              </Button>
            )}

            {/* Error */}
            {nlpError && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{nlpError}</span>
              </div>
            )}

            {/* Parsed events */}
            {nlpEvents.length > 0 && (
              <div className="space-y-3">
                {nlpResumen && (
                  <p className="text-xs text-muted-foreground border-l-2 border-violet-500/40 pl-2 italic">{nlpResumen}</p>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nlpEvents.map((ev, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{ev.var_nombre}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{ev.contexto}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
                            ev.confianza === 'alta'  ? 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10'
                            : ev.confianza === 'media' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                            : 'border-border text-muted-foreground',
                          )}>
                            {ev.confianza}
                          </span>
                          <button onClick={() => setNlpEvents(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <button
                            key={n}
                            onClick={() => setNlpIntensities(prev => ({ ...prev, [i]: n }))}
                            className={cn(
                              'flex-1 h-5 rounded-sm text-[9px] font-bold transition-colors',
                              (nlpIntensities[i] ?? ev.intensidad) === n
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20',
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setNlpEvents([]); setNlpError(null); }}>
                    Editar texto
                  </Button>
                  <Button size="sm" className="flex-1" onClick={handleNlpCommit}>
                    Registrar {nlpEvents.length} evento{nlpEvents.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, BrainCircuit, Copy, Check, CircleCheck, Plus, X, Wallet, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useUserData } from '@/hooks/use-user-data';
import { sendChatMessage } from '@/lib/actions';
import type { ChatMessage, ChatContext, ChatAction, ChatActionHints } from '@/ai/flows/chat-with-axiom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/hooks/use-session-user';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/lib/api-writes';
import { revalidateCollection, useCollection } from '@/hooks/use-mongo-collection';
import { useFinanceCategories } from '@/hooks/use-finance-categories';
import { COLOR_PALETTE, ICON_OPTIONS } from '@/lib/finance-categories';
import { useToast } from '@/hooks/use-toast';
import NavigationReady from '@/components/app/navigation-ready';
const SUGGESTED_PROMPTS = [
  '¿Cuál es mi mayor punto débil esta semana?',
  '¿Qué hábito debería priorizar hoy?',
  '¿Cómo está mi nivel de estrés en los últimos 7 días?',
  'Dame un protocolo para mejorar mi energía',
  '¿Qué correlaciones ves en mis datos?',
  '¿En qué área de mi vida debería enfocarme este mes?',
];

interface DisplayMessage extends ChatMessage {
  id: string;
  timestamp: Date;
  isLoading?: boolean;
  actions?: ChatAction[];
}

function buildContext(userData: ReturnType<typeof useUserData>['data']): ChatContext {
  const fallback: ChatContext = {
    overallState: 'OK',
    score: 50,
    kpis: '{}',
    recentEvents: 'Sin eventos registrados.',
    areas: '',
  };
  if (!userData) return fallback;

  const stats = userData.rpg_stats;
  const biomarkers = stats
    ? [
        `Dopamina: ${stats.dopamina ?? '—'}/100`,
        `Serotonina: ${stats.serotonina ?? '—'}/100`,
        `Cortisol: ${stats.cortisol ?? '—'}/100`,
        `Foco: ${stats.foco ?? '—'}/100`,
        `Energía: ${stats.energia ?? '—'}/100`,
        `Sueño: ${stats.sueno ?? '—'}/100`,
        `Conexión social: ${stats.conexion_social ?? '—'}/100`,
        `Carga dopaminérgica: ${stats.carga_dopaminergica ?? '—'}/100`,
      ].join(', ')
    : undefined;

  const drainVars =
    userData.dominantVariables?.length
      ? userData.dominantVariables
          .map((v) => `${v.nombre || v.var_id} (impacto: ${v.total_impact}, ${v.hours_remaining}h restantes)`)
          .join('; ')
      : undefined;

  const gainVars =
    userData.explanation?.modifiers
      ?.filter((m) => m.startsWith('GAIN_'))
      ?.map((m) => m.replace('GAIN_', ''))
      ?.join(', ') || undefined;

  const velocityMod = userData.explanation?.modifiers?.find((m) => m.startsWith('VELOCITY_PROXY:'));
  const velocity = velocityMod
    ? `Proxy de velocidad: ${velocityMod.split(':')[1]}`
    : undefined;

  const vk = userData.kpis?.scoreVelocity;
  const velocityFull = vk
    ? `${vk.direction} · ${vk.weekly > 0 ? '+' : ''}${vk.weekly.toFixed(1)} pts/día (7d)`
    : velocity;

  const clinical = userData.clinical_v2
    ? `Banda de riesgo: ${userData.clinical_v2.risk_band} · Score clínico: ${userData.clinical_v2.risk_score?.toFixed(1)} · Marcadores: ${(userData.clinical_v2.markers ?? []).join(', ')}`
    : undefined;

  const recentEvents = (userData.events ?? [])
    .slice(0, 25)
    .map((e) => {
      const varName = userData.variables?.find((v) => v.var_id === e.var_id)?.var_nombre || e.var_id;
      return `${varName} (intensidad ${e.intensidad}, tipo ${e.tipo}, ${e.fecha?.split('T')[0] ?? ''})`;
    })
    .join('\n') || 'Sin eventos registrados.';

  const areas = (userData.kpis?.scoresByArea ?? [])
    .map((a) => `${a.area}: ${a.score}/100`)
    .join(', ');

  const kpis = JSON.stringify({
    scoresByArea: userData.kpis?.scoresByArea?.slice(0, 10),
    finanzas: userData.kpis?.monthlyFinancials,
  });

  const habits =
    (userData.habits ?? []).length
      ? (userData.habits ?? [])
          .slice(0, 10)
          .map((h) => `${h.var_id} (${h.frecuencia ?? 'sin frecuencia'})`)
          .join(', ')
      : undefined;

  const milestones =
    (userData.milestones ?? []).filter((m) => m.estado === 'Pendiente').length
      ? (userData.milestones ?? [])
          .filter((m) => m.estado === 'Pendiente')
          .slice(0, 5)
          .map((m) => `${m.nombre || m.milestone_id} — ${m.estado}`)
          .join('; ')
      : undefined;

  const playerProfile = userData.playerProfile
    ? [
        userData.playerProfile.age && `edad ${userData.playerProfile.age}`,
        userData.playerProfile.mbti_type && `MBTI ${userData.playerProfile.mbti_type}`,
        userData.playerProfile.enneagram_type && `Eneagrama ${userData.playerProfile.enneagram_type}`,
      ]
        .filter(Boolean)
        .join(', ')
    : undefined;

  return {
    overallState: userData.overallState ?? 'OK',
    score: stats?.player_score ?? 50,
    kpis,
    recentEvents,
    areas,
    playerProfile,
    biomarkers,
    drainVars,
    gainVars,
    velocity: velocityFull,
    clinical,
    habits,
    milestones,
  };
}

// ── Lightweight markdown renderer ──────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    nodes.push(
      <Tag key={key++} className={cn('my-1.5 space-y-0.5 pl-4', listType === 'ol' ? 'list-decimal' : 'list-disc')}>
        {listItems.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">{inlineMarkdown(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      nodes.push(<p key={key++} className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-3 mb-1">{inlineMarkdown(trimmed.slice(4))}</p>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      nodes.push(<p key={key++} className="text-sm font-bold mt-3 mb-1">{inlineMarkdown(trimmed.slice(3))}</p>);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      nodes.push(<p key={key++} className="text-base font-black mt-3 mb-1">{inlineMarkdown(trimmed.slice(2))}</p>);
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList();
      nodes.push(<hr key={key++} className="border-border/50 my-2" />);
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (ulMatch) {
      if (listType === 'ol') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (listType === 'ul') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
      continue;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      nodes.push(<br key={key++} />);
      continue;
    }

    // Normal paragraph
    flushList();
    nodes.push(<p key={key++} className="text-sm leading-relaxed">{inlineMarkdown(trimmed)}</p>);
  }

  flushList();
  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode {
  // Split on bold (**) and italic (*) and inline code (`)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
// ────────────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { data: userData, isLoading: isUserDataLoading } = useUserData();
  const { user, uid } = useUser();
  const { toast } = useToast();
  const { categories: financeCategories, expenseCategories, incomeCategories, saveCategories } = useFinanceCategories();
  const { data: dashboardConfig } = useCollection<{ key: string; value: string }>(uid ? 'dashboardConfig' : null, { orderBy: 'key', direction: 'asc' });
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  // Estado de las acciones propuestas: 'done' = confirmada y ejecutada, 'dismissed' = descartada.
  const [actionStatus, setActionStatus] = useState<Record<string, 'done' | 'dismissed'>>({});

  const executeAction = useCallback((key: string, action: ChatAction) => {
    if (action.type === 'logEvent') {
      addDocumentNonBlocking('events', {
        evento_id: `EVT_CHAT_${Date.now()}`,
        fecha: new Date().toISOString(),
        var_id: action.var_id,
        intensidad: action.intensidad,
        contexto: action.contexto || 'Registrado desde el chat',
        tipo: 'Variable',
        impulsivo: action.impulsivo,
      });
      toast({ title: 'Evento registrado', description: `${action.var_nombre} · ${action.intensidad}/10` });
    } else if (action.type === 'completeHabit') {
      const habit = userData?.habits?.find(h => h.id === action.habito_id);
      addDocumentNonBlocking('events', {
        evento_id: `EVT_HABIT_${Date.now()}`,
        fecha: new Date().toISOString(),
        habito_id: action.habito_id,
        ...(habit?.var_id ? { var_id: habit.var_id } : {}),
        intensidad: 5,
        contexto: `Hábito: ${action.habitName}`,
        tipo: 'Variable',
        impulsivo: false,
      });
      toast({ title: 'Hábito completado', description: action.habitName });
    } else if (action.type === 'createVariable') {
      // Crea la variable + su perfil de varianza hormonal (impactMatrix). Si no
      // trae impactos, el motor los deriva heurísticamente.
      addDocumentNonBlocking('variables', {
        var_id: action.var_id,
        var_nombre: action.var_nombre,
        area_id: action.area_id,
        tipo: action.tipo,
        polaridad: action.polaridad,
        impacto_base: action.impacto_base,
        curva: action.polaridad === -1 ? 'Exponencial' : 'Lineal',
        delay_dias: 0,
        duracion_dias: 0.25,
        umbral_riesgo: 2,
        controlabilidad: action.controlabilidad,
        activo: true,
      });
      action.impacts.forEach((im) => {
        addDocumentNonBlocking('impactMatrix', {
          matrix_id: `AI_${action.var_id}_${im.hormone_id}`,
          var_id: action.var_id,
          hormone_id: im.hormone_id,
          effect_size: im.effect_size,
          duration_hours: im.duration_hours,
        });
      });
      if (action.firstEvent) {
        addDocumentNonBlocking('events', {
          evento_id: `EVT_CHAT_${Date.now()}`,
          fecha: new Date().toISOString(),
          var_id: action.var_id,
          intensidad: action.firstEvent.intensidad,
          contexto: action.firstEvent.contexto || 'Registrado desde el chat',
          tipo: 'Variable',
          impulsivo: action.firstEvent.impulsivo,
        });
        revalidateCollection('events');
      }
      revalidateCollection('variables');
      revalidateCollection('impactMatrix');
      toast({ title: 'Variable creada', description: `${action.var_nombre} añadida a tu sistema` });
    } else if (action.type === 'logTransaction') {
      const acc = userData?.accounts?.[0];
      const signed = action.txType === 'Gasto' ? -Math.abs(action.monto) : Math.abs(action.monto);
      addDocumentNonBlocking('transactions', {
        transaccion_id: `TRN_${Date.now()}`,
        tipo: action.txType,
        categoria: action.categoria,
        monto: signed,
        impulsivo: action.impulsivo,
        notas: action.contexto || '',
        cuenta_id: acc?.cuenta_id ?? '',
        deuda_id: '',
        fecha: new Date().toISOString(),
        ...(action.impulsivo ? { var_id: 'GASTO_IMP' } : {}),
      });
      revalidateCollection('transactions');
      toast({ title: 'Movimiento registrado', description: `${action.txType} de ${action.monto} € · ${action.categoria}` });
    } else if (action.type === 'setPocket') {
      const raw = dashboardConfig?.find(c => c.key === 'financial_pockets')?.value;
      let pockets: Record<string, number> = {};
      try { pockets = raw ? JSON.parse(raw) : {}; } catch { pockets = {}; }
      const next = { ...pockets, [action.categoria]: action.monto };
      setDocumentNonBlocking('dashboardConfig', 'financial_pockets', { key: 'financial_pockets', value: JSON.stringify(next) });
      revalidateCollection('dashboardConfig');
      toast({ title: 'Presupuesto actualizado', description: `${action.categoria}: ${action.monto} €/mes` });
    } else if (action.type === 'createCategory') {
      const next = [...financeCategories, {
        name: action.name,
        type: action.categoryType,
        color: COLOR_PALETTE[financeCategories.length % COLOR_PALETTE.length],
        icon: action.icon,
      }];
      saveCategories(next);
      toast({ title: 'Categoría creada', description: `${action.name} (${action.categoryType === 'expense' ? 'gasto' : 'ingreso'})` });
    } else if (action.type === 'createHabit') {
      addDocumentNonBlocking('habits', {
        habito_id: `HB_${Date.now()}`,
        nombre: action.nombre,
        frecuencia: action.frecuencia,
        ...(action.var_id ? { var_id: action.var_id } : {}),
        duracion_min: 10,
        minimo_viable: true,
      });
      revalidateCollection('habits');
      toast({ title: 'Hábito creado', description: `${action.nombre} · ${action.frecuencia}` });
    } else if (action.type === 'createRelation') {
      const persona_id = `REL_${action.nombre.toUpperCase().replace(/\s/g, '_').substring(0, 5)}_${Date.now()}`;
      addDocumentNonBlocking('relations', {
        persona_id, nombre: action.nombre, rol: action.rol,
        energia_neta: 0, respeto: 5, frecuencia: 'Ocasional',
      });
      revalidateCollection('relations');
      toast({ title: 'Relación creada', description: `${action.nombre} (${action.rol})` });
    } else if (action.type === 'logInteraction') {
      addDocumentNonBlocking('interactions', {
        interaccion_id: `INT_${Date.now()}`,
        persona_id: action.persona_id,
        energia_resultante: action.energia,
        respeto_percibido: action.respeto,
        contexto: action.contexto || '',
        fecha: new Date().toISOString(),
      });
      revalidateCollection('interactions');
      toast({ title: 'Interacción registrada', description: action.persona_nombre });
    } else if (action.type === 'createMilestone') {
      addDocumentNonBlocking('milestones', {
        milestone_id: `MS_${Date.now()}`,
        nombre: action.nombre,
        estado: 'Pendiente',
        milestone_type: action.milestone_type,
        progress_count: 0,
        ...(action.fecha_objetivo ? { fecha_objetivo: new Date(action.fecha_objetivo).toISOString() } : {}),
        ...(action.target_count ? { target_count: action.target_count } : {}),
        ...(action.skill_id ? { skill_id: action.skill_id } : {}),
        ...(action.system_id ? { system_id: action.system_id } : {}),
      });
      revalidateCollection('milestones');
      toast({ title: 'Hito creado', description: action.nombre });
    }
    setActionStatus(prev => ({ ...prev, [key]: 'done' }));
  }, [userData, toast, dashboardConfig, financeCategories, saveCategories]);

  const dismissAction = useCallback((key: string) => {
    setActionStatus(prev => ({ ...prev, [key]: 'dismissed' }));
  }, []);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!uid) return;
    fetch(`/api/data/chatHistory?docId=current`)
      .then(r => r.json())
      .then(data => {
        const saved = data?.messages ?? [];
        if (saved.length > 0) {
          setMessages(saved.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          })));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Persist messages after each completed exchange
  useEffect(() => {
    if (!user || messages.length === 0) return;
    if (messages.some(m => m.isLoading)) return;
    const timer = setTimeout(() => {
      setDocumentNonBlocking('chatHistory', 'current', {
        messages: messages.slice(-50).map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [messages, user]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;

      const userMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      const loadingMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput('');
      setIsSending(true);

      const ctx = buildContext(userData);
      const history: ChatMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text.trim() },
      ];
      const hints: ChatActionHints = {
        variables: (userData?.variables ?? []).map(v => ({ var_id: v.var_id, var_nombre: v.var_nombre, polaridad: v.polaridad ?? 1 })),
        habits: (userData?.habits ?? []).map(h => ({ habito_id: h.id, nombre: h.nombre || h.description || h.var_id || 'Hábito' })),
        expenseCategories: expenseCategories.map(c => c.name),
        incomeCategories: incomeCategories.map(c => c.name),
        iconOptions: ICON_OPTIONS,
        relations: (userData?.relations ?? []).map(r => ({ persona_id: r.persona_id, nombre: r.nombre })),
        skills: (userData?.skills ?? []).map(s => ({ habilidad_id: s.habilidad_id, nombre: s.nombre })),
        systems: (userData?.systems ?? []).map(s => ({ sistema_id: s.sistema_id, objetivo: s.objetivo })),
      };

      try {
        const { reply, actions } = await sendChatMessage(history, ctx, hints);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id ? { ...m, content: reply, actions, isLoading: false } : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? { ...m, content: 'Hubo un error al conectar con el sistema. Inténtalo de nuevo.', isLoading: false }
              : m
          )
        );
      } finally {
        setIsSending(false);
        textareaRef.current?.focus();
      }
    },
    [isSending, messages, userData, expenseCategories, incomeCategories]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
    if (user) {
      setDocumentNonBlocking('chatHistory', 'current', { messages: [], updatedAt: new Date().toISOString() });
    }
    textareaRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px]">
      <NavigationReady />
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Axiom IA</h1>
            <p className="text-xs text-muted-foreground">
              Asesor personal con acceso a tus datos en tiempo real
            </p>
          </div>
        </div>
        {!isEmpty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className="h-3 w-3" />
            Nueva sesión
          </Button>
        )}
      </div>

      {/* Context strip */}
      {userData && (
        <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              userData.overallState === 'OK' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              userData.overallState === 'RIESGO' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              userData.overallState === 'CRITICO' && 'bg-red-500/10 text-red-600 dark:text-red-400',
            )}
          >
            {userData.overallState ?? '—'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Score {userData.rpg_stats?.player_score ?? '—'}/100
          </span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">
            {(userData.events ?? []).length} eventos · {(userData.areas ?? []).length} áreas
          </span>
          {userData.dominantVariables?.length > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-red-500 font-medium">
                {userData.dominantVariables.length} drenajes activos
              </span>
            </>
          )}
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto rounded-xl border bg-muted/20 mb-3"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full p-6 gap-6">
            <div className="text-center space-y-1">
              <Sparkles className="h-8 w-8 text-primary/40 mx-auto mb-3" />
              <p className="text-sm font-medium">¿En qué puedo ayudarte hoy?</p>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Tengo acceso completo a tus biomarcadores, hábitos, finanzas y estado del sistema.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isSending || isUserDataLoading}
                  className="text-left text-[11px] text-muted-foreground hover:text-foreground rounded-lg border border-border/50 hover:border-primary/30 bg-background/50 hover:bg-primary/5 px-3 py-2.5 transition-all leading-tight disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                actionStatus={actionStatus}
                onExecute={executeAction}
                onDismiss={dismissAction}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0">
        <div className="flex gap-2 items-end rounded-xl border bg-background p-2 focus-within:ring-1 focus-within:ring-primary/30 transition-shadow">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbeme algo… (Enter para enviar, Shift+Enter para nueva línea)"
            disabled={isSending || isUserDataLoading}
            rows={1}
            className="resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm min-h-[36px] max-h-[120px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending || isUserDataLoading}
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Axiom IA puede cometer errores. Verifica información importante.
        </p>
      </form>
    </div>
  );
}

function ActionCard({ action, status, onExecute, onDismiss }: {
  action: ChatAction;
  status?: 'done' | 'dismissed';
  onExecute: () => void;
  onDismiss: () => void;
}) {
  // Etiqueta, título, subtítulo e icono según el tipo de acción.
  let label = 'Acción';
  let title = '';
  let subtitle = '';
  let icon = <Plus className="h-4 w-4" />;
  let iconClass = 'bg-primary/10 text-primary';

  switch (action.type) {
    case 'logEvent':
      label = 'Registrar'; title = action.var_nombre;
      subtitle = `${action.impulsivo ? 'Impulsivo · ' : ''}Intensidad ${action.intensidad}/10${action.contexto ? ` · ${action.contexto}` : ''}`;
      break;
    case 'completeHabit':
      label = 'Completar hábito'; title = action.habitName; subtitle = 'Marcar como hecho hoy';
      icon = <CircleCheck className="h-4 w-4" />; iconClass = 'bg-green-500/10 text-green-600';
      break;
    case 'createVariable':
      label = 'Crear variable'; title = action.var_nombre;
      subtitle = `${action.polaridad > 0 ? 'Refuerza' : 'Drena'} · ${action.area_id}${action.rationale ? ` · ${action.rationale}` : ''}`;
      icon = <Sparkles className="h-4 w-4" />; iconClass = 'bg-violet-500/10 text-violet-500';
      break;
    case 'logTransaction':
      label = 'Registrar movimiento'; title = `${action.txType} ${action.monto} €`;
      subtitle = `${action.categoria}${action.contexto ? ` · ${action.contexto}` : ''}`;
      icon = <Wallet className="h-4 w-4" />; iconClass = 'bg-orange-500/10 text-orange-500';
      break;
    case 'setPocket':
      label = 'Presupuesto'; title = action.categoria; subtitle = `${action.monto} €/mes`;
      icon = <Target className="h-4 w-4" />; iconClass = 'bg-orange-500/10 text-orange-500';
      break;
    case 'createCategory':
      label = 'Crear categoría'; title = action.name; subtitle = action.categoryType === 'expense' ? 'Gasto' : 'Ingreso';
      icon = <Sparkles className="h-4 w-4" />; iconClass = 'bg-orange-500/10 text-orange-500';
      break;
    case 'createHabit':
      label = 'Crear hábito'; title = action.nombre; subtitle = action.frecuencia;
      icon = <Sparkles className="h-4 w-4" />; iconClass = 'bg-green-500/10 text-green-600';
      break;
    case 'createRelation':
      label = 'Crear relación'; title = action.nombre; subtitle = action.rol;
      icon = <Sparkles className="h-4 w-4" />; iconClass = 'bg-blue-500/10 text-blue-500';
      break;
    case 'logInteraction':
      label = 'Registrar interacción'; title = action.persona_nombre;
      subtitle = `Energía ${action.energia > 0 ? '+' : action.energia < 0 ? '−' : '='} · Respeto ${action.respeto > 0 ? '+' : action.respeto < 0 ? '−' : '='}`;
      icon = <CircleCheck className="h-4 w-4" />; iconClass = 'bg-blue-500/10 text-blue-500';
      break;
    case 'createMilestone':
      label = 'Crear hito'; title = action.nombre;
      subtitle = `${action.milestone_type === 'recurring' ? 'Recurrente' : 'Único'}${action.fecha_objetivo ? ` · ${action.fecha_objetivo}` : ''}`;
      icon = <Sparkles className="h-4 w-4" />; iconClass = 'bg-primary/10 text-primary';
      break;
  }

  return (
    <div className={cn(
      'rounded-xl border px-3 py-2.5 flex items-center gap-3',
      status === 'done' ? 'border-green-500/30 bg-green-500/5' :
      status === 'dismissed' ? 'border-border bg-muted/20 opacity-60' :
      'border-primary/30 bg-primary/5',
    )}>
      <div className={cn('h-7 w-7 rounded-lg shrink-0 flex items-center justify-center', iconClass)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold truncate">{label}: {title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      {status === 'done' ? (
        <span className="text-[10px] font-bold text-green-600 flex items-center gap-1 shrink-0"><Check className="h-3 w-3" /> Hecho</span>
      ) : status === 'dismissed' ? (
        <span className="text-[10px] text-muted-foreground shrink-0">Descartado</span>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" className="h-7 text-xs" onClick={onExecute}>Confirmar</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDismiss} aria-label="Descartar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, actionStatus, onExecute, onDismiss }: {
  message: DisplayMessage;
  actionStatus: Record<string, 'done' | 'dismissed'>;
  onExecute: (key: string, action: ChatAction) => void;
  onDismiss: (key: string) => void;
}) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={cn('flex gap-2.5 group', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'h-7 w-7 rounded-full shrink-0 flex items-center justify-center mt-0.5',
          isUser ? 'bg-primary/10' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className={cn('flex flex-col gap-1 max-w-[82%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm text-sm leading-relaxed'
              : 'bg-background border rounded-tl-sm'
          )}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-1 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="space-y-1">{renderMarkdown(message.content)}</div>
          )}
        </div>
        {/* Acciones propuestas por la IA — requieren confirmación */}
        {!isUser && !message.isLoading && message.actions && message.actions.length > 0 && (
          <div className="w-full space-y-1.5 mt-1">
            {message.actions.map((action, idx) => {
              const key = `${message.id}-${idx}`;
              return (
                <ActionCard
                  key={key}
                  action={action}
                  status={actionStatus[key]}
                  onExecute={() => onExecute(key, action)}
                  onDismiss={() => onDismiss(key)}
                />
              );
            })}
          </div>
        )}
        <div className={cn('flex items-center gap-2', isUser && 'flex-row-reverse')}>
          <span className="text-[10px] text-muted-foreground px-1">
            {format(message.timestamp, 'HH:mm', { locale: es })}
          </span>
          {!isUser && !message.isLoading && message.content && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded"
              title="Copiar respuesta"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, BrainCircuit, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useUserData } from '@/hooks/use-user-data';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { sendChatMessage } from '@/lib/actions';
import type { ChatMessage, ChatContext } from '@/ai/flows/chat-with-axiom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history from Firestore on mount
  useEffect(() => {
    if (!user || !firestore) return;
    const histRef = doc(firestore, `users/${user.uid}/chatHistory`, 'current');
    getDoc(histRef).then(snap => {
      if (snap.exists()) {
        const saved = snap.data()?.messages ?? [];
        if (saved.length > 0) {
          setMessages(saved.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          })));
        }
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Persist messages to Firestore after each completed exchange
  useEffect(() => {
    if (!user || !firestore || messages.length === 0) return;
    if (messages.some(m => m.isLoading)) return;
    const timer = setTimeout(() => {
      const histRef = doc(firestore, `users/${user.uid}/chatHistory`, 'current');
      setDoc(histRef, {
        messages: messages.slice(-50).map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [messages, user, firestore]);

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

      try {
        const reply = await sendChatMessage(history, ctx);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id ? { ...m, content: reply, isLoading: false } : m
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
    [isSending, messages, userData]
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
    if (user && firestore) {
      const histRef = doc(firestore, `users/${user.uid}/chatHistory`, 'current');
      setDoc(histRef, { messages: [], updatedAt: new Date().toISOString() }).catch(() => {});
    }
    textareaRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px]">
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
              <MessageBubble key={msg.id} message={msg} />
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

function MessageBubble({ message }: { message: DisplayMessage }) {
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

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import NavigationReady from '@/components/app/navigation-ready';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Timer, Brain, SunMoon, CheckCircle2, Repeat, Repeat1,
} from 'lucide-react';

// ── Track catalogue ─────────────────────────────────────────────────────────

interface Track {
  id: string;
  title: string;
  subtitle: string;
  file: string;
  mood: string;
  color: string;
  gradient: string;
  benefit: string;
}

const TRACKS: Track[] = [
  {
    id: 'temple_gate',
    title: 'At the Temple Gate',
    subtitle: 'Arraigo ceremonial',
    file: '/meditation/At_The_Temple_Gate.mp3',
    mood: 'Grounding',
    color: 'text-amber-500',
    gradient: 'from-amber-950/60 to-stone-950/80',
    benefit: 'Cortisol −10 · 4h',
  },
  {
    id: 'mountain_gate',
    title: 'Dawn at the Mountain Gate',
    subtitle: 'Claridad matutina',
    file: '/meditation/Dawn_at_the_Mountain_Gate.mp3',
    mood: 'Clarity',
    color: 'text-sky-400',
    gradient: 'from-sky-950/60 to-slate-950/80',
    benefit: 'Foco +15 · 2h',
  },
  {
    id: 'summit',
    title: 'Morning at the Summit',
    subtitle: 'Foco expansivo',
    file: '/meditation/Morning_at_the_Summit.mp3',
    mood: 'Focus',
    color: 'text-violet-400',
    gradient: 'from-violet-950/60 to-slate-950/80',
    benefit: 'Dopamina +10 · 4h',
  },
  {
    id: 'tipping_stone',
    title: 'The Tipping Stone',
    subtitle: 'Equilibrio y quietud',
    file: '/meditation/The_Tipping_Stone.mp3',
    mood: 'Balance',
    color: 'text-emerald-400',
    gradient: 'from-emerald-950/60 to-stone-950/80',
    benefit: 'Serotonina +10 · 8h',
  },
  {
    id: 'water_stone',
    title: 'Water on Stone',
    subtitle: 'Soltar y fluir',
    file: '/meditation/Water_on_Stone.mp3',
    mood: 'Release',
    color: 'text-cyan-400',
    gradient: 'from-cyan-950/60 to-slate-950/80',
    benefit: 'Cortisol −15 · 6h',
  },
  {
    id: 'tide_rests',
    title: 'Where the Tide Rests',
    subtitle: 'Paz profunda',
    file: '/meditation/Where_the_Tide_Rests.mp3',
    mood: 'Rest',
    color: 'text-indigo-300',
    gradient: 'from-indigo-950/60 to-slate-950/80',
    benefit: 'Sueño +15 · 8h',
  },
];

const SESSION_PRESETS = [5, 10, 15, 20, 30];

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MeditationPage() {
  const { data: userData, isLoading } = useUserData();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Player state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);         // 0–1
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(false);

  // Session timer
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const track = TRACKS[currentIndex];

  // ── Audio setup ────────────────────────────────────────────────────────────

  useEffect(() => {
    const audio = new Audio(track.file);
    audio.volume = muted ? 0 : volume;
    audio.loop = loop;
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    });
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => {
      if (!loop) {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    });

    if (isPlaying) audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.src = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = loop;
  }, [loop]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(v => !v);
  };

  const seek = (pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = pct * audio.duration;
  };

  const prev = () => setCurrentIndex(i => (i - 1 + TRACKS.length) % TRACKS.length);
  const next = () => setCurrentIndex(i => (i + 1) % TRACKS.length);

  // ── Session timer ──────────────────────────────────────────────────────────

  const startSession = (minutes: number) => {
    setSessionMinutes(minutes);
    setSessionSecondsLeft(minutes * 60);
    setSessionActive(true);
    setSessionDone(false);

    const audio = audioRef.current;
    if (audio && !isPlaying) {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const stopSession = useCallback(() => {
    setSessionActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!sessionActive) return;
    timerRef.current = setInterval(() => {
      setSessionSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setSessionActive(false);
          setSessionDone(true);
          audioRef.current?.pause();
          setIsPlaying(false);

          // Log meditation event in Axiom
          if (user && firestore) {
            addDocumentNonBlocking(collection(firestore, `users/${user.uid}/events`), {
              fecha: new Date().toISOString(),
              evento_id: `EVT_MED_${Date.now()}`,
              var_id: 'MEDITACION',
              intensidad: 7,
              contexto: `Sesión de meditación ${sessionMinutes}min — ${track.title}`,
              tipo: 'Variable',
              impulsivo: false,
            });
          }

          toast({
            title: '🧘 Sesión completada',
            description: `${sessionMinutes} min · ${track.title} · ${track.benefit}`,
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionActive]);

  // ── Contextual recommendation ──────────────────────────────────────────────

  const recommendation = (() => {
    if (!userData) return null;
    const cortisol = userData.rpg_stats?.cortisol ?? 20;
    const sueno = userData.rpg_stats?.sueno ?? 50;
    const foco = userData.rpg_stats?.foco ?? 50;
    if (cortisol > 60) return { track: TRACKS.find(t => t.id === 'water_stone')!, reason: 'Cortisol alto — la liberación ayuda a desactivar la respuesta de estrés.' };
    if (sueno < 40)    return { track: TRACKS.find(t => t.id === 'tide_rests')!, reason: 'Sueño bajo — la meditación nocturna mejora la calidad del descanso.' };
    if (foco < 40)     return { track: TRACKS.find(t => t.id === 'mountain_gate')!, reason: 'Foco bajo — la claridad matutina reactiva la red ejecutiva prefrontal.' };
    return null;
  })();

  if (isLoading && !userData) return <AreaPageSkeleton />;

  const sessionProgress = sessionMinutes
    ? 1 - sessionSecondsLeft / (sessionMinutes * 60)
    : 0;

  return (
    <div className="space-y-6 pb-16">
      <NavigationReady />

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Meditación</h1>
          <Badge variant="outline" className="font-mono text-[10px]">{TRACKS.length} pistas</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Sesiones de sonido para reducir cortisol, restaurar foco y preparar el sueño.
        </p>
      </div>

      {/* Recommendation banner */}
      {recommendation && (
        <Card className="border-primary/20 bg-primary/5 cursor-pointer" onClick={() => {
          setCurrentIndex(TRACKS.indexOf(recommendation.track));
          setSessionDone(false);
        }}>
          <CardContent className="pt-3 pb-3 flex items-start gap-3">
            <SunMoon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Recomendado ahora</p>
              <p className="text-xs font-semibold truncate">{recommendation.track.title}</p>
              <p className="text-[10px] text-muted-foreground">{recommendation.reason}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[9px]">{recommendation.track.benefit}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Now playing */}
      <Card className={cn('overflow-hidden border-0 bg-gradient-to-br', track.gradient)}>
        <CardContent className="pt-6 pb-6 space-y-5">

          {/* Track info */}
          <div className="text-center space-y-1">
            <div className={cn('text-4xl font-black tracking-tight', track.color)}>
              {track.mood}
            </div>
            <p className="text-white font-bold text-lg">{track.title}</p>
            <p className="text-white/60 text-sm">{track.subtitle}</p>
            <Badge variant="outline" className={cn('border-white/20 text-white/70 text-[10px]')}>
              {track.benefit}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div
              className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden"
              onClick={e => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                seek((e.clientX - rect.left) / rect.width);
              }}
            >
              <div
                className="h-full bg-white/60 rounded-full transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/40 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{duration ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setLoop(v => !v)}
              className={cn('p-2 rounded-full transition-colors', loop ? 'text-white' : 'text-white/30 hover:text-white/60')}
              title={loop ? 'Loop activo' : 'Loop inactivo'}
            >
              {loop ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
            <button onClick={prev} className="p-2 rounded-full text-white/70 hover:text-white transition-colors">
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={togglePlay}
              className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all active:scale-95"
            >
              {isPlaying
                ? <Pause className="h-6 w-6 text-white" />
                : <Play className="h-6 w-6 text-white ml-0.5" />}
            </button>
            <button onClick={next} className="p-2 rounded-full text-white/70 hover:text-white transition-colors">
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMuted(v => !v)}
              className="p-2 rounded-full text-white/70 hover:text-white transition-colors"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 px-4">
            <VolumeX className="h-3 w-3 text-white/30 shrink-0" />
            <Slider
              min={0} max={1} step={0.01}
              value={[muted ? 0 : volume]}
              onValueChange={([v]) => { setVolume(v); setMuted(false); }}
              className="flex-1"
            />
            <Volume2 className="h-3 w-3 text-white/30 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Session timer */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Temporizador de sesión
            </p>
          </div>

          {!sessionActive && !sessionDone && (
            <div className="flex flex-wrap gap-2">
              {SESSION_PRESETS.map(m => (
                <Button
                  key={m}
                  variant={sessionMinutes === m ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => startSession(m)}
                >
                  {m} min
                </Button>
              ))}
            </div>
          )}

          {sessionActive && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black font-mono tabular-nums text-primary">
                  {formatTime(sessionSecondsLeft)}
                </span>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={stopSession}>
                  Cancelar
                </Button>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${sessionProgress * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Al finalizar se registrará un evento de meditación en tu bioperfil.
              </p>
            </div>
          )}

          {sessionDone && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">Sesión completada</p>
                <p className="text-[10px] text-muted-foreground">Registrada en tu bioperfil · {track.benefit}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Track list */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Pistas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TRACKS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => { setCurrentIndex(i); setSessionDone(false); }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                currentIndex === i
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30',
              )}
            >
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50')}>
                {currentIndex === i && isPlaying
                  ? <Pause className={cn('h-4 w-4', t.color)} />
                  : <Play className={cn('h-4 w-4 ml-0.5', t.color)} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{t.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t.subtitle}</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0 hidden sm:flex">{t.mood}</Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Why it matters */}
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Brain className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Por qué importa</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                10 minutos de meditación con sonidos ambientales reduce el cortisol sérico un <strong>15–20%</strong> y aumenta la coherencia de las ondas alfa. A diferencia del entretenimiento pasivo, genera <strong>dopamina intrínseca sin resaca</strong> y mejora la calidad del sueño si se practica antes de las 22h.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

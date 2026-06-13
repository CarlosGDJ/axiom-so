'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Brain, Moon, AlertTriangle, Clock, Activity, Sunrise, Shield,
  SunMoon, Users, UserCheck, Dna,
} from 'lucide-react';
import type { UserData } from '@/lib/types';

interface KairosLivePanelProps {
  userData: UserData;
}

function parseModifier(modifiers: string[], key: string): number | null {
  const entry = modifiers.find(m => m.startsWith(`${key}:`));
  if (!entry) return null;
  const raw = entry.split(':')[1];
  if (!raw) return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function parseString(modifiers: string[], key: string): string | null {
  const entry = modifiers.find(m => m.startsWith(`${key}:`));
  if (!entry) return null;
  return entry.split(':').slice(1).join(':') || null;
}

function hasFlag(modifiers: string[], flag: string): boolean {
  return modifiers.some(m => m === flag || m.startsWith(`${flag}:`));
}

function parseDays(modifiers: string[], key: string): number | null {
  const entry = modifiers.find(m => m.startsWith(`${key}:`));
  if (!entry) return null;
  const raw = entry.split(':')[1]?.replace('d', '');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

interface MetricRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  level: 'ok' | 'warn' | 'bad' | 'neutral';
  barPct?: number;
  tooltip?: string;
}

const LEVEL = {
  ok:      { text: 'text-green-500 dark:text-green-400',   bar: 'bg-green-500',   dot: 'bg-green-500' },
  warn:    { text: 'text-orange-500 dark:text-orange-400', bar: 'bg-orange-500',  dot: 'bg-orange-500' },
  bad:     { text: 'text-red-500 dark:text-red-400',       bar: 'bg-red-500',     dot: 'bg-red-500 animate-pulse' },
  neutral: { text: 'text-muted-foreground',                bar: 'bg-primary/60',  dot: 'bg-muted-foreground' },
};

function MetricRow({ icon: Icon, label, value, subtext, level, barPct, tooltip }: MetricRowProps) {
  const s = LEVEL[level];
  const inner = (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={cn('h-3 w-3 shrink-0', s.text)} />
          <span className={cn('text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate', tooltip && 'cursor-help underline decoration-dotted underline-offset-2')}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {subtext && <span className="text-[9px] text-muted-foreground">{subtext}</span>}
          <span className={cn('text-xs font-black tabular-nums', s.text)}>{value}</span>
        </div>
      </div>
      {barPct !== undefined && (
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700', s.bar)} style={{ width: `${barPct}%` }} />
        </div>
      )}
    </div>
  );

  if (!tooltip) return inner;
  // Popover (tap), no Tooltip (hover): en móvil no hay hover, así que tocar la
  // fila abre la explicación. La fila entera es el área táctil.
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="w-full text-left">{inner}</button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={4} className="max-w-[240px] text-[11px] leading-snug">
        {tooltip}
      </PopoverContent>
    </Popover>
  );
}

function getBracLabel(phase: number): { label: string; level: 'ok' | 'warn' | 'bad' | 'neutral'; pct: number } {
  const pct = Math.round(phase * 100);
  if (phase <= 0.55) return { label: 'Pico cognitivo', level: 'ok', pct };
  if (phase <= 0.75) return { label: 'Transición', level: 'neutral', pct };
  return { label: 'Valle · reposo', level: 'warn', pct };
}

function getChronolabel(c: number): string {
  if (c >= 0.5) return 'Muy matutino';
  if (c >= 0.2) return 'Matutino';
  if (c >= -0.2) return 'Neutro';
  if (c >= -0.5) return 'Nocturno';
  return 'Muy nocturno';
}

function getRhythmLevel(label: string | null): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (label === 'óptimo') return 'ok';
  if (label === 'monótono') return 'warn';
  if (label === 'caótico') return 'bad';
  return 'neutral';
}

export default function KairosLivePanel({ userData }: KairosLivePanelProps) {
  const modifiers: string[] = useMemo(
    () => userData.explanation?.modifiers ?? [],
    [userData.explanation],
  );

  const bracPhase      = parseModifier(modifiers, 'BRAC_PHASE');
  const carContrib     = parseModifier(modifiers, 'CAR_CONTRIB');
  const chronotype     = parseModifier(modifiers, 'CHRONOTYPE');
  const sjlIntensity   = parseModifier(modifiers, 'SJL_INTENSITY');
  const decisionFat    = parseModifier(modifiers, 'DECISION_FATIGUE');
  const alloWeeks      = parseModifier(modifiers, 'ALLOSTATIC_WEEKS');
  const resBufDays     = parseDays(modifiers, 'RESILIENCE_BUFFER');
  const habituation    = parseModifier(modifiers, 'HABITUATION');
  const novelty        = parseModifier(modifiers, 'NOVELTY_STRESS');
  const nightAmp       = hasFlag(modifiers, 'NIGHT_CORTISOL');

  // Entropía conductual
  const rhythmSD       = parseModifier(modifiers, 'RHYTHM_SD');
  const rhythmLabel    = parseString(modifiers, 'RHYTHM_LABEL');

  // Red social tóxica
  const toxicAnchors   = parseModifier(modifiers, 'TOXIC_ANCHORS');
  const positiveAnchors = parseModifier(modifiers, 'POSITIVE_ANCHORS');
  const socialDebt     = parseString(modifiers, 'SOCIAL_DEBT');

  // Cascadas PK activas
  const pkFocus        = parseModifier(modifiers, 'PK_FOCUS_BOOST');
  const pkSerotoninDrain = parseModifier(modifiers, 'PK_SEROTONIN_DRAIN');
  const pkExercise     = parseModifier(modifiers, 'PK_EXERCISE_BOOST');
  const hasPkActivity  = (pkFocus ?? 0) > 0 || (pkSerotoninDrain ?? 0) > 0 || (pkExercise ?? 0) > 0;

  const brac = bracPhase !== null ? getBracLabel(bracPhase) : null;
  const rhythmLevel = getRhythmLevel(rhythmLabel);

  return (
    <Card className="h-full flex flex-col shadow-sm border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="font-black tracking-tighter text-primary">KAIROS</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">· Motor en vivo</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-3.5">

        {/* BRAC */}
        {brac && (
          <MetricRow
            icon={Activity}
            label="Ciclo BRAC"
            value={brac.label}
            subtext={`${brac.pct}% del ciclo`}
            level={brac.level}
            barPct={brac.pct}
            tooltip="Ritmo básico de actividad-descanso (~90 min). Pico cognitivo = primer tercio: óptimo para trabajo profundo y decisiones importantes. Valle = reposo activo o tareas rutinarias."
          />
        )}

        {/* Cronotipo */}
        {chronotype !== null && (
          <MetricRow
            icon={Clock}
            label="Cronotipo"
            value={getChronolabel(chronotype)}
            subtext={`${chronotype >= 0 ? '+' : ''}${chronotype.toFixed(2)}`}
            level="neutral"
            tooltip="Predisposición genética del reloj circadiano. Matutino: picos hormonales 2-3h antes del promedio. Nocturno: picos 2-3h más tardíos. Afecta cuándo rindes mejor y cuándo necesitas descanso."
          />
        )}

        {/* CAR */}
        {carContrib !== null && carContrib > 2 && (
          <MetricRow
            icon={Sunrise}
            label="Exención CAR"
            value={`−${carContrib.toFixed(0)} pts`}
            subtext="cortisol matutino"
            level="ok"
            barPct={Math.min(100, (carContrib / 30) * 100)}
            tooltip="El cortisol awakening response (CAR) es el pico fisiológico de cortisol al despertar. Es un proceso anabólico saludable que activa el metabolismo y la memoria. El motor lo descuenta de la penalización de cortisol."
          />
        )}

        {/* SJL */}
        {sjlIntensity !== null && sjlIntensity > 0 && (
          <MetricRow
            icon={Moon}
            label="Jet lag social"
            value={`${Math.round(sjlIntensity * 100)}%`}
            subtext="desalineación circadiana"
            level={sjlIntensity > 0.5 ? 'bad' : 'warn'}
            barPct={sjlIntensity * 100}
            tooltip="Desalineación entre tu ritmo biológico real y los horarios sociales (trabajo, compromisos). Causa somnolencia, menor rendimiento cognitivo y aumento de cortisol. Se reduce manteniendo horarios de sueño consistentes."
          />
        )}

        {/* Fatiga decisiones */}
        {decisionFat !== null && (
          <MetricRow
            icon={Brain}
            label="Fatiga PFC"
            value={`${decisionFat.toFixed(0)}/100`}
            subtext="decisiones 24h"
            level={decisionFat > 60 ? 'bad' : decisionFat > 30 ? 'warn' : 'ok'}
            barPct={decisionFat}
            tooltip="Agotamiento de la corteza prefrontal por volumen de decisiones en las últimas 24h. Por encima de 60 aumenta la impulsividad, reduce el autocontrol y eleva el riesgo de malas decisiones. Descansa o delega."
          />
        )}

        {/* Carga alostática */}
        {alloWeeks !== null && alloWeeks > 0 && (
          <MetricRow
            icon={AlertTriangle}
            label="Carga crónica"
            value={`${alloWeeks} sem.`}
            subtext="consecutivas en riesgo"
            level={alloWeeks >= 3 ? 'bad' : alloWeeks >= 2 ? 'warn' : 'neutral'}
            tooltip="Semanas consecutivas con puntuación en zona de riesgo o crítica. El estrés crónico acumulado reduce la neuroplasticidad, eleva la línea base de cortisol y dificulta la recuperación. Requiere intervención activa."
          />
        )}

        {/* Buffer de resiliencia */}
        {resBufDays !== null && (
          <MetricRow
            icon={Shield}
            label="Resiliencia"
            value={`${resBufDays}/14 días`}
            subtext="hábitos positivos"
            level={resBufDays >= 10 ? 'ok' : resBufDays >= 5 ? 'warn' : 'bad'}
            barPct={(resBufDays / 14) * 100}
            tooltip="Días con hábitos positivos registrados en los últimos 14 días. Actúa como buffer fisiológico contra el estrés agudo: cuantos más días, mayor capacidad de recuperación ante eventos negativos."
          />
        )}

        {/* ── Entropía conductual ── */}
        {rhythmSD !== null && (
          <MetricRow
            icon={SunMoon}
            label="Ritmo vital"
            value={rhythmLabel ?? '—'}
            subtext={`SD ${rhythmSD.toFixed(1)}`}
            level={rhythmLevel}
            tooltip="Variabilidad en el patrón de eventos diarios (entropía conductual). Óptimo = variedad moderada con estructura. Monótono = sin estimulación, riesgo de anhedonia. Caótico = sin rutina, el sistema nervioso no descansa."
          />
        )}

        {/* ── Red social ── */}
        {(toxicAnchors !== null && toxicAnchors > 0) && (
          <MetricRow
            icon={Users}
            label="Anclajes tóxicos"
            value={`${toxicAnchors} persona${toxicAnchors !== 1 ? 's' : ''}`}
            subtext={socialDebt ? `deuda ${socialDebt}` : undefined}
            level={toxicAnchors >= 2 ? 'bad' : 'warn'}
            tooltip="Personas en tu red que generan energía negativa de forma consistente. Su presencia frecuente eleva el cortisol basal y reduce la serotonina. Considera limitar la exposición o renegociar la dinámica."
          />
        )}
        {(positiveAnchors !== null && positiveAnchors > 0) && (
          <MetricRow
            icon={UserCheck}
            label="Anclajes positivos"
            value={`${positiveAnchors} persona${positiveAnchors !== 1 ? 's' : ''}`}
            level="ok"
            tooltip="Personas en tu red que generan energía positiva de forma consistente. Refuerzan la oxitocina, la serotonina y la conexión social. Prioriza tiempo de calidad con ellas."
          />
        )}

        {/* Amplificador nocturno */}
        {nightAmp && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="w-full rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/30 text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                <Moon className="h-3 w-3" /> Cortisol nocturno amplificado
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={4} className="max-w-[240px] text-[11px] leading-snug">
              Tus niveles de cortisol están elevados en horario nocturno. Esto interfiere con la secreción de melatonina y reduce la calidad del sueño profundo. Considera respiración 4-7-8 o meditación antes de dormir.
            </PopoverContent>
          </Popover>
        )}

        {/* Habituación / Novedad */}
        {(habituation !== null || novelty !== null) && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
            {habituation !== null && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="space-y-0.5 text-left">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground underline decoration-dotted underline-offset-2">Habituación</p>
                    <p className="text-xs font-black text-green-500">−{habituation.toFixed(1)} cort.</p>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" sideOffset={4} className="max-w-[240px] text-[11px] leading-snug">
                  Reducción del impacto del cortisol por exposición repetida a los mismos estresores. El sistema nervioso aprende a desensibilizarse. Indica adaptación saludable al estrés habitual.
                </PopoverContent>
              </Popover>
            )}
            {novelty !== null && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="space-y-0.5 text-left">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground underline decoration-dotted underline-offset-2">Novedad</p>
                    <p className="text-xs font-black text-orange-500">+{novelty.toFixed(1)} cort.</p>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" sideOffset={4} className="max-w-[240px] text-[11px] leading-snug">
                  Estrés adicional de cortisol por exposición a situaciones nuevas o inesperadas. Es temporal: se normaliza con familiarización. No requiere intervención si no hay otras señales de alerta.
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {/* ── Cascadas PK activas ── */}
        {hasPkActivity && (
          <div className="pt-1 border-t border-border/40 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Dna className="h-2.5 w-2.5" /> Metabolitos activos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(pkFocus ?? 0) > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      NE foco +{pkFocus!.toFixed(1)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" sideOffset={4} className="max-w-[220px] text-[11px] leading-snug">
                    Norepinefrina activa por trabajo de enfoque profundo. Aumenta la atención sostenida y la motivación de ejecución.
                  </PopoverContent>
                </Popover>
              )}
              {(pkSerotoninDrain ?? 0) > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      5-HT −{pkSerotoninDrain!.toFixed(1)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" sideOffset={4} className="max-w-[220px] text-[11px] leading-snug">
                    Drenaje de serotonina activo detectado. Un evento negativo reciente está reduciendo tu nivel de bienestar basal. El efecto decae en las próximas horas.
                  </PopoverContent>
                </Popover>
              )}
              {(pkExercise ?? 0) > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                      BDNF +{pkExercise!.toFixed(1)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" sideOffset={4} className="max-w-[220px] text-[11px] leading-snug">
                    Factor neurotrófico derivado del ejercicio activo. El BDNF promueve la neuroplasticidad, mejora el estado de ánimo y protege contra el estrés crónico.
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}

        {modifiers.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">
            Esperando primera ejecución del motor…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

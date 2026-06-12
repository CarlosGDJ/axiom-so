'use client';

import { useMemo, useState } from 'react';
import {
  Activity, Plus, TrendingDown, TrendingUp, Zap,
  AlertTriangle, CheckCircle, Shield,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { computeClinicalModelV2 } from '@/lib/model-v2-clinical';
import type { RPGStats, UserData } from '@/lib/types';
import { clinicalMarkerLabel } from '@/lib/clinical-labels';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking } from '@/lib/api-writes';
// ─── Constants ────────────────────────────────────────────────────────────────

const DECAY_K = 0.14; // hr⁻¹ — same as area-scoring.ts

// Maps hormone IDs → RPG stat deltas (per unit of effect_size)
const HORMONE_STAT_MAP: Record<string, Partial<Record<keyof RPGStats, number>>> = {
  DOPAMINA:      { dopamina: 1.0, foco: 0.25, carga_dopaminergica: 0.4 },
  SEROTONINA:    { serotonina: 1.0, conexion_social: 0.15 },
  CORTISOL:      { cortisol: 1.0, foco: -0.25, energia: -0.15 },
  NOREPINEFRINA: { foco: 0.5, energia: 0.3, cortisol: 0.15 },
  MELATONINA:    { sueno: 1.0 },
  OXITOCINA:     { conexion_social: 1.0, serotonina: 0.3 },
  ENDORFINA:     { energia: 0.5, serotonina: 0.25 },
  TESTOSTERONA:  { energia: 0.4, foco: 0.2 },
  GH:            { energia: 0.3, sueno: 0.2 },
  BDNF:          { foco: 0.5, serotonina: 0.2 },
  GABA:          { sueno: 0.5, cortisol: -0.3 },
  ADENOSINA:     { sueno: 0.4, foco: -0.3 },
  INSULINA:      { energia: 0.2 },
  CRH:           { cortisol: 0.5 },
  ADRENALINA:    { energia: 0.4, cortisol: 0.3, foco: 0.2 },
};

const STAT_META: Array<{
  key: keyof RPGStats;
  label: string;
  color: string;
  invertDelta?: boolean;
}> = [
  { key: 'foco',              label: 'Foco',        color: '#6366f1' },
  { key: 'energia',           label: 'Energía',     color: '#22c55e' },
  { key: 'dopamina',          label: 'Dopamina',    color: '#f59e0b' },
  { key: 'serotonina',        label: 'Serotonina',  color: '#ec4899' },
  { key: 'cortisol',          label: 'Cortisol',    color: '#ef4444', invertDelta: true },
  { key: 'sueno',             label: 'Sueño',       color: '#8b5cf6' },
  { key: 'conexion_social',   label: 'Social',      color: '#06b6d4' },
  { key: 'carga_dopaminergica', label: 'Carga Dopa', color: '#f97316', invertDelta: true },
];

const HORIZON_OPTIONS = [
  { label: '24 h', days: 1 },
  { label: '3 d',  days: 3 },
  { label: '7 d',  days: 7 },
  { label: '14 d', days: 14 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function curveFactor(curva: string, intensity: number): number {
  const x = clamp(intensity / 5, 0, 1);
  if (curva === 'Exponencial') return x * x;
  if (curva === 'Umbral')      return x < 0.6 ? x * 0.45 : 0.27 + ((x - 0.6) / 0.4) * 0.73;
  return x;
}

function computeDecayCurve(
  impactoBase: number,
  polaridad: 1 | -1,
  curva: string,
  duracionDias: number,
  delayDias: number,
  intensity: number,
  horizonDays: number,
): Array<{ label: string; impact: number; pct: number }> {
  const durationHrs = Math.max(1, duracionDias * 24);
  const delayHrs    = Math.max(0, delayDias * 24);
  const peakImpact  = polaridad * impactoBase * curveFactor(curva, intensity);
  const totalHrs    = horizonDays * 24;
  const SAMPLES     = 48;
  const step        = totalHrs / SAMPLES;

  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i * step;
    let impact = 0;
    if (t >= delayHrs) {
      const effectiveDt = t - delayHrs;
      if (effectiveDt <= durationHrs) {
        impact = peakImpact;
      } else {
        impact = peakImpact * Math.exp(-DECAY_K * (effectiveDt - durationHrs));
      }
    }
    const label = t < 24
      ? `${Math.round(t)}h`
      : `${Math.round(t / 24)}d`;
    return { label, impact: Math.round(impact * 100) / 100, pct: Math.abs(impact) };
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ImpactSimulatorProps {
  userData: UserData;
}

export default function ImpactSimulator({ userData }: ImpactSimulatorProps) {
  const { user, uid } = useUser();
  const { toast } = useToast();

  const [selectedId, setSelectedId]     = useState<string>('');
  const [selectedType, setSelectedType] = useState<'Variable' | 'Protocolo'>('Variable');
  const [intensity, setIntensity]       = useState(3);
  const [horizonDays, setHorizonDays]   = useState(3);

  const currentStats: RPGStats = userData.rpg_stats ?? {
    dopamina: 50, serotonina: 50, cortisol: 20, foco: 70,
    energia: 75, sueno: 50, conexion_social: 50,
    carga_dopaminergica: 20, player_score: 50,
  } as RPGStats;

  const options = useMemo(() => {
    if (selectedType === 'Variable') {
      return (userData.variables ?? []).map((v) => ({ id: v.var_id, label: v.var_nombre }));
    }
    return (userData.protocols ?? []).map((p) => ({ id: p.protocolo_id, label: p.nombre }));
  }, [selectedType, userData.variables, userData.protocols]);

  const selectedVariable = useMemo(() => {
    if (selectedType !== 'Variable') return null;
    return (userData.variables ?? []).find((v) => v.var_id === selectedId) ?? null;
  }, [selectedId, selectedType, userData.variables]);

  // Stat deltas from hormone matrix
  const statDeltas = useMemo<Partial<Record<keyof RPGStats, number>>>(() => {
    if (!selectedId) return {};
    const impacts = (userData.impactMatrix ?? []).filter((im) => im.var_id === selectedId);
    const deltas: Partial<Record<keyof RPGStats, number>> = {};
    impacts.forEach((im) => {
      const scaledEffect = im.effect_size * (intensity / 5);
      const mapping = HORMONE_STAT_MAP[im.hormone_id] ?? {};
      for (const [stat, weight] of Object.entries(mapping) as [keyof RPGStats, number][]) {
        deltas[stat] = (deltas[stat] ?? 0) + scaledEffect * weight;
      }
    });
    return deltas;
  }, [selectedId, intensity, userData.impactMatrix]);

  const projectedStats = useMemo<RPGStats>(() => {
    const s = { ...currentStats };
    for (const [stat, delta] of Object.entries(statDeltas) as [keyof RPGStats, number][]) {
      if (typeof s[stat] === 'number') {
        (s as any)[stat] = clamp(Math.round((s[stat] as number) + delta));
      }
    }
    return s;
  }, [currentStats, statDeltas]);

  const clinicalCurrent  = useMemo(() => computeClinicalModelV2({ enabled: true, stats: currentStats, events7d: 15, interactions7d: 5, transactions7d: 5, calibrationConfidence: 0.7 }), [currentStats]);
  const clinicalProjected = useMemo(() => computeClinicalModelV2({ enabled: true, stats: projectedStats, events7d: 15, interactions7d: 5, transactions7d: 5, calibrationConfidence: 0.7 }), [projectedStats]);

  const decayCurve = useMemo(() => {
    if (!selectedVariable) return [];
    return computeDecayCurve(
      selectedVariable.impacto_base,
      selectedVariable.polaridad,
      selectedVariable.curva,
      selectedVariable.duracion_dias,
      selectedVariable.delay_dias,
      intensity,
      horizonDays,
    );
  }, [selectedVariable, intensity, horizonDays]);

  const radarData = useMemo(() => {
    if (!clinicalCurrent || !clinicalProjected) return [];
    const axes = clinicalCurrent.axis_scores;
    const axesP = clinicalProjected.axis_scores;
    return [
      { axis: 'Amenaza',    current: axes.threat_load,     projected: axesP.threat_load     },
      { axis: 'Recompensa', current: axes.reward_drive,    projected: axesP.reward_drive     },
      { axis: 'Control',    current: axes.executive_control, projected: axesP.executive_control },
      { axis: 'Recuperación', current: axes.recovery_capacity, projected: axesP.recovery_capacity },
      { axis: 'Social',     current: axes.social_buffer,   projected: axesP.social_buffer   },
    ];
  }, [clinicalCurrent, clinicalProjected]);

  const peakImpact = decayCurve.length > 0
    ? decayCurve.reduce((max, p) => Math.abs(p.impact) > Math.abs(max) ? p.impact : max, 0)
    : 0;
  const isPositive = peakImpact >= 0;

  const handleApply = () => {
    if (!uid || !selectedId) return;
    addDocumentNonBlocking('events', {
      evento_id: `EVT_SIM_${Date.now()}`,
      fecha: new Date().toISOString(),
      var_id: selectedId,
      intensidad: intensity,
      contexto: 'Registrado desde simulador de impacto.',
      tipo: selectedType,
    });
    toast({ title: 'Impacto aplicado', description: 'El evento se registró en el sistema.' });
    setSelectedId('');
  };

  const riskDelta = clinicalProjected && clinicalCurrent
    ? clinicalProjected.risk_score - clinicalCurrent.risk_score
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Selector ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Simulador de Impacto — Predicción de escenarios
          </CardTitle>
          <CardDescription>
            Selecciona una variable o protocolo para ver cómo afecta a tu sistema biológico antes de actuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['Variable', 'Protocolo'] as const).map((t) => (
              <Button
                key={t}
                variant={selectedType === t ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => { setSelectedType(t); setSelectedId(''); }}
              >
                {t === 'Variable' ? <Activity className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                {t}
              </Button>
            ))}
          </div>

          {/* Variable/Protocol select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Seleccionar {selectedType === 'Variable' ? 'variable' : 'protocolo'}
            </label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Elige una opción…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Intensity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Intensidad
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setIntensity(v)}
                    className={cn(
                      'h-7 w-7 rounded text-xs font-bold transition-colors',
                      intensity === v ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <Slider min={1} max={5} step={1} value={[intensity]} onValueChange={(v) => setIntensity(v[0])} disabled={!selectedId} />
          </div>

          {/* Horizon */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Horizonte de predicción
            </label>
            <div className="flex gap-2">
              {HORIZON_OPTIONS.map((h) => (
                <button
                  key={h.days}
                  onClick={() => setHorizonDays(h.days)}
                  className={cn(
                    'flex-1 h-8 rounded-md text-xs font-medium transition-colors border',
                    horizonDays === h.days
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent border-border hover:border-primary/50'
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedId && (
        <>
          {/* ── Decay Curve ─────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Curva de Impacto y Decaimiento</CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-bold',
                    isPositive
                      ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                      : 'border-red-500/30 text-red-600 bg-red-500/10'
                  )}
                >
                  {isPositive ? '▲' : '▼'} {Math.abs(peakImpact).toFixed(1)} pico
                </Badge>
              </div>
              <CardDescription className="text-[11px]">
                Evolución del impacto en las próximas {horizonDays === 1 ? '24 horas' : `${horizonDays} días`}. La curva decae según la semivida biológica de la variable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={decayCurve} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="impactGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9 }}
                    interval={Math.floor(decayCurve.length / 8)}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(v: number) => [`${v.toFixed(2)}`, 'Impacto']}
                  />
                  <Area
                    type="monotone"
                    dataKey="impact"
                    stroke={isPositive ? '#22c55e' : '#ef4444'}
                    fill="url(#impactGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {selectedVariable && (
                <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span>Duración: <strong>{selectedVariable.duracion_dias}d</strong></span>
                  <span>Delay: <strong>{selectedVariable.delay_dias}d</strong></span>
                  <span>Curva: <strong>{selectedVariable.curva}</strong></span>
                  <span>Polaridad: <strong className={selectedVariable.polaridad > 0 ? 'text-emerald-500' : 'text-red-500'}>{selectedVariable.polaridad > 0 ? '+' : '−'}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── RPG Stats Grid ───────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Impacto en Biomarcadores</CardTitle>
              <CardDescription className="text-[11px]">
                Estado actual vs proyectado si ejecutas esta acción ahora con intensidad {intensity}/5.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STAT_META.map(({ key, label, color, invertDelta }) => {
                  const current = (currentStats[key] as number) ?? 0;
                  const projected = (projectedStats[key] as number) ?? 0;
                  const delta = projected - current;
                  const isGood = invertDelta ? delta <= 0 : delta >= 0;
                  const hasChange = Math.abs(delta) > 0.5;
                  return (
                    <div key={key} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {label}
                          </span>
                        </div>
                        {hasChange && (
                          <span className={cn('text-[10px] font-bold flex items-center gap-0.5', isGood ? 'text-emerald-500' : 'text-red-500')}>
                            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(delta).toFixed(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-lg font-bold tabular-nums" style={{ color }}>
                          {projected}
                        </span>
                        {hasChange && (
                          <span className="text-xs text-muted-foreground line-through pb-0.5">{current}</span>
                        )}
                      </div>
                      {/* bar */}
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${projected}%`, backgroundColor: color, opacity: 0.8 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Clinical Model Comparison ────────── */}
          {clinicalCurrent && clinicalProjected && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Modelo Clínico V2 — 5 Ejes</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Actual: {clinicalCurrent.risk_band}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold',
                        riskDelta < -2 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' :
                        riskDelta > 2  ? 'text-red-600 bg-red-500/10 border-red-500/30' : ''
                      )}
                    >
                      {riskDelta === 0 ? '=' : riskDelta > 0 ? `+${riskDelta}` : riskDelta} riesgo
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-[11px]">
                  Puntuación de riesgo: <strong>{clinicalCurrent.risk_score}</strong> → <strong>{clinicalProjected.risk_score}</strong>. Escala de amenaza sistémica 0–100.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
                      <Radar name="Actual" dataKey="current" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                      <Radar name="Proyectado" dataKey="projected" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {radarData.map((row) => {
                      const diff = row.projected - row.current;
                      return (
                        <div key={row.axis} className="flex items-center gap-2 text-xs">
                          <span className="w-24 text-muted-foreground shrink-0">{row.axis}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${row.projected}%` }} />
                          </div>
                          <span className="w-6 text-right tabular-nums">{row.projected}</span>
                          {Math.abs(diff) > 1 && (
                            <span className={cn('text-[10px] font-bold w-8', diff > 0 ? 'text-emerald-500' : 'text-red-500')}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {/* Markers */}
                    {clinicalProjected.markers.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Marcadores proyectados</p>
                        {clinicalProjected.markers.map((m) => (
                          <div key={m} className="flex items-center gap-1.5 text-[10px] text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            {clinicalMarkerLabel(m)}
                          </div>
                        ))}
                      </div>
                    )}
                    {clinicalProjected.markers.length === 0 && clinicalCurrent.markers.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        Esta acción resuelve todos los marcadores activos
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Apply ───────────────────────────── */}
          <Button className="w-full h-11 font-bold" onClick={handleApply}>
            <Plus className="mr-2 h-4 w-4" />
            Aplicar impacto al sistema
          </Button>
        </>
      )}

      {!selectedId && (
        <div className="h-40 rounded-xl border border-dashed flex items-center justify-center">
          <div className="text-center space-y-1">
            <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Selecciona una variable para proyectar su impacto</p>
          </div>
        </div>
      )}
    </div>
  );
}

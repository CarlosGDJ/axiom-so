'use client';

import { cn } from '@/lib/utils';
import { ShieldAlert, Activity } from 'lucide-react';
import type { ClinicalV2ModelOutput } from '@/lib/types';

interface ClinicalAxesCardProps {
  clinical: ClinicalV2ModelOutput;
}

const BAND_CONFIG = {
  LOW:      { label: 'Bajo',    cls: 'bg-green-500/15 border-green-500/30 text-green-500' },
  MODERATE: { label: 'Moderado', cls: 'bg-orange-500/15 border-orange-500/30 text-orange-500' },
  HIGH:     { label: 'Alto',    cls: 'bg-red-500/15 border-red-500/30 text-red-500' },
  SEVERE:   { label: 'Severo',  cls: 'bg-red-600/20 border-red-600/40 text-red-600 animate-pulse' },
};

const AXES = [
  { key: 'threat_load',       label: 'Amenaza',    invert: true  },
  { key: 'reward_drive',      label: 'Recompensa', invert: false },
  { key: 'executive_control', label: 'Control',    invert: false },
  { key: 'recovery_capacity', label: 'Recuper.',   invert: false },
  { key: 'social_buffer',     label: 'Social',     invert: false },
] as const;

function axisLevel(value: number, invert: boolean): 'ok' | 'warn' | 'bad' {
  const effective = invert ? 100 - value : value;
  if (effective >= 55) return 'ok';
  if (effective >= 35) return 'warn';
  return 'bad';
}

const AXIS_COLORS = {
  ok:   { bar: 'bg-green-500',  text: 'text-green-500' },
  warn: { bar: 'bg-orange-500', text: 'text-orange-500' },
  bad:  { bar: 'bg-red-500',    text: 'text-red-500' },
};

export default function ClinicalAxesCard({ clinical }: ClinicalAxesCardProps) {
  const band = BAND_CONFIG[clinical.risk_band];
  const confidencePct = Math.round(clinical.confidence * 100);
  const hasMarkers = clinical.markers.length > 0;

  return (
    <div className="rounded-xl border bg-card/80 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">

      {/* Riesgo clínico */}
      <div className="flex items-center gap-4">
        <div className={cn('rounded-xl p-3 border', band.cls)}>
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Riesgo clínico</p>
          <div className="flex items-baseline gap-1.5">
            <p className={cn('text-3xl font-black tabular-nums leading-none', band.cls.split(' ').find(c => c.startsWith('text-')))}>
              {clinical.risk_score}
            </p>
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', band.cls)}>
              {band.label}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            confianza {confidencePct}%
          </p>
        </div>
      </div>

      {/* 5 ejes */}
      <div className="space-y-2 sm:col-span-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Activity className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ejes clínicos</span>
        </div>
        {AXES.map(axis => {
          const value = clinical.axis_scores[axis.key];
          const level = axisLevel(value, axis.invert);
          const c = AXIS_COLORS[level];
          const barPct = axis.invert ? 100 - value : value;
          return (
            <div key={axis.key} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-14 shrink-0">{axis.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', c.bar)}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className={cn('text-[9px] font-black tabular-nums w-6 text-right', c.text)}>{value}</span>
            </div>
          );
        })}
      </div>

      {/* Marcadores activos */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          {hasMarkers ? `${clinical.markers.length} marcador${clinical.markers.length !== 1 ? 'es' : ''} activo${clinical.markers.length !== 1 ? 's' : ''}` : 'Sin marcadores activos'}
        </p>
        {hasMarkers ? (
          <div className="flex flex-wrap gap-1">
            {clinical.markers.slice(0, 4).map(marker => {
              const sev = clinical.marker_severities[marker] ?? 0;
              const sevLevel = sev > 0.6 ? 'bad' : sev > 0.3 ? 'warn' : 'neutral';
              const sevCls = sevLevel === 'bad'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : sevLevel === 'warn'
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-muted border-border text-muted-foreground';
              return (
                <span key={marker} className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded border', sevCls)}>
                  {marker.replace(/_/g, ' ')}
                </span>
              );
            })}
            {clinical.markers.length > 4 && (
              <span className="text-[8px] text-muted-foreground px-1">+{clinical.markers.length - 4}</span>
            )}
          </div>
        ) : (
          <p className="text-[9px] text-muted-foreground">Sistema dentro de rangos saludables.</p>
        )}
      </div>

    </div>
  );
}

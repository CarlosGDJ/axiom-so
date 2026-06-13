'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OverallState, UserData } from '@/lib/types';
import { clinicalMarkerLabel } from '@/lib/clinical-labels';

interface DiagnosticDialogProps {
  open: boolean;
  onClose: () => void;
  userData: UserData;
  overallState: OverallState;
  dominantVariables: UserData['dominantVariables'];
}

const STAT_LABELS: Record<string, { label: string; highIsBad?: boolean }> = {
  dopamina:   { label: 'Dopamina' },
  serotonina: { label: 'Serotonina' },
  cortisol:   { label: 'Cortisol', highIsBad: true },
  foco:       { label: 'Foco' },
  energia:    { label: 'Energía' },
  sueno:      { label: 'Sueño' },
};

function formatPrimaryCause(raw: string): string {
  return raw.replace(/^[A-Z_]+:/, '');
}

export default function DiagnosticDialog({ open, onClose, userData, dominantVariables }: DiagnosticDialogProps) {
  const score = userData.rpg_stats?.player_score ?? 0;
  const explanation = userData.explanation;
  const stats = userData.rpg_stats;
  const velocity = userData.kpis?.scoreVelocity;
  const isFalling = velocity?.direction === 'falling' || velocity?.direction === 'plunging';

  const affectedStats = Object.entries(STAT_LABELS).filter(([key, cfg]) => {
    const raw = (stats as any)?.[key] as number | undefined;
    if (raw === undefined) return false;
    const val = Math.round(raw);
    return cfg.highIsBad ? val > 65 : val < 50;
  });

  const worstAreas = [...(userData.kpis?.scoresByArea ?? [])]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  // Índice de carga alostática (0–8), leído de la fuente única: los modifiers
  // del motor (`ALLOSTATIC_INDEX:X/8`). No se recalcula aquí para no divergir.
  const allostaticIndex = (() => {
    const m = explanation?.modifiers?.find(x => x.startsWith('ALLOSTATIC_INDEX:'));
    if (!m) return null;
    const n = parseInt(m.split(':')[1], 10);
    return Number.isFinite(n) ? n : null;
  })();

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Diagnóstico del sistema
          </DialogTitle>
          <DialogDescription>
            Score actual: <strong>{score}/100</strong>
            {isFalling && (
              <span className="ml-2 text-orange-500 font-semibold text-xs">
                ↘ {velocity!.weekly.toFixed(1)} pts/día
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 text-sm">

            {explanation?.primary_cause && (
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Causa principal</h4>
                <p className="text-sm leading-snug">{formatPrimaryCause(explanation.primary_cause)}</p>
              </section>
            )}

            {(explanation?.secondary_causes?.length ?? 0) > 0 && (
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Factores secundarios</h4>
                <ul className="space-y-1">
                  {explanation!.secondary_causes.map((c, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-snug">
                      <span className="text-orange-500 mt-0.5 shrink-0">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {dominantVariables.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Zap size={10} /> Variables drenando el sistema
                </h4>
                <div className="space-y-1.5">
                  {dominantVariables.map((v, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
                      <span className="text-xs font-medium">{v.nombre || v.var_id}</span>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="text-orange-500 font-bold">−{v.total_impact.toFixed(1)} pts</span>
                        <span>~{v.hours_remaining}h restante</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {affectedStats.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Biomarcadores fuera de rango</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {affectedStats.map(([key, cfg]) => {
                    const val = Math.round((stats as any)[key] as number);
                    const isBad = cfg.highIsBad ? val > 65 : val < 50;
                    return (
                      <div key={key} className={cn(
                        'flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs',
                        isBad ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-muted/40'
                      )}>
                        <span className="text-muted-foreground">{cfg.label}</span>
                        <span className={cn('font-bold tabular-nums flex items-center gap-0.5', isBad ? 'text-orange-500' : 'text-foreground')}>
                          {cfg.highIsBad ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {allostaticIndex !== null && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Carga alostática</h4>
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Ejes biológicos en zona de riesgo</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-3 w-1.5 rounded-sm',
                            i < allostaticIndex
                              ? allostaticIndex >= 5 ? 'bg-red-500' : allostaticIndex >= 3 ? 'bg-orange-500' : 'bg-orange-500'
                              : 'bg-muted',
                          )}
                        />
                      ))}
                    </div>
                    <span className={cn(
                      'text-xs font-bold tabular-nums',
                      allostaticIndex >= 5 ? 'text-red-500' : allostaticIndex >= 3 ? 'text-orange-500' : allostaticIndex > 0 ? 'text-orange-600' : 'text-green-600',
                    )}>
                      {allostaticIndex}/8
                    </span>
                  </div>
                </div>
              </section>
            )}

            {worstAreas.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Áreas arrastrando el score</h4>
                <div className="space-y-1">
                  {worstAreas.map(a => (
                    <div key={a.area} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{a.area}</span>
                      <span className={cn('font-bold tabular-nums', a.score < 40 ? 'text-red-500' : 'text-orange-500')}>
                        {a.score}/100
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {userData.clinical_v2?.enabled && (userData.clinical_v2.markers?.length ?? 0) > 0 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Marcadores clínicos</h4>
                <div className="space-y-1">
                  {userData.clinical_v2.markers.map((m, i) => {
                    const sev = userData.clinical_v2!.marker_severities?.[m] ?? 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs rounded-md bg-muted/40 px-2.5 py-1.5">
                        <span className="text-muted-foreground">{clinicalMarkerLabel(m)}</span>
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', sev > 0.7 ? 'bg-red-500' : sev > 0.4 ? 'bg-orange-500' : 'bg-orange-500')}
                            style={{ width: `${sev * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!explanation?.primary_cause && dominantVariables.length === 0 && affectedStats.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                El motor aún no ha generado un diagnóstico detallado. Registra más eventos para mejorar el análisis.
              </p>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

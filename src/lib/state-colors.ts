// Vocabulario de color de estado — ÚNICA fuente de verdad para toda la app.
//
// Tres niveles + neutro. Patrón de apps de salud (Oura/WHOOP): un vocabulario
// estrecho y consistente para que el color signifique siempre lo mismo.
//   VERDE  = bien / ok
//   NARANJA = atención / riesgo   (NUNCA amarillo ni ámbar para "riesgo")
//   ROJO   = crítico / mal
//   GRIS   = sin datos / calibrando
//
// Umbrales canónicos para cualquier score 0–100: >=60 ok · >=40 riesgo · <40 crítico.

export type StateLevel = 'ok' | 'warn' | 'critical' | 'none';

/** Nivel canónico de un score 0–100 (mayor = mejor). null/undefined → 'none'. */
export function scoreLevel(score: number | null | undefined): StateLevel {
  if (score == null || Number.isNaN(score)) return 'none';
  if (score >= 60) return 'ok';
  if (score >= 40) return 'warn';
  return 'critical';
}

/** Nivel a partir del estado global del motor. */
export function stateLevel(state: 'OK' | 'RIESGO' | 'CRITICO' | string | undefined): StateLevel {
  if (state === 'CRITICO') return 'critical';
  if (state === 'RIESGO') return 'warn';
  return 'ok';
}

export const STATE_TEXT: Record<StateLevel, string> = {
  ok: 'text-green-500',
  warn: 'text-orange-500',
  critical: 'text-red-500',
  none: 'text-muted-foreground',
};

export const STATE_BAR: Record<StateLevel, string> = {
  ok: 'bg-green-500',
  warn: 'bg-orange-500',
  critical: 'bg-red-500',
  none: 'bg-muted-foreground/40',
};

export const STATE_SOFT_BG: Record<StateLevel, string> = {
  ok: 'bg-green-500/10',
  warn: 'bg-orange-500/10',
  critical: 'bg-red-500/10',
  none: 'bg-muted/10',
};

/** Badge completo (fondo + texto + borde) para chips de estado. */
export const STATE_BADGE: Record<StateLevel, string> = {
  ok: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  warn: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  none: 'bg-muted/50 text-muted-foreground border-border',
};

/** Color HSL crudo para fills de gráficos (recharts). */
export const STATE_HSL: Record<StateLevel, string> = {
  ok: 'hsl(142 71% 45%)',     // green-500
  warn: 'hsl(25 95% 53%)',    // orange-500
  critical: 'hsl(0 84% 60%)', // red-500
  none: 'hsl(var(--muted-foreground))',
};

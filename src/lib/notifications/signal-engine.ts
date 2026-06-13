// Motor de señales de notificación — capa determinista del sistema híbrido.
//
// En vez de umbrales fijos iguales para todos, detecta DESVIACIONES de la línea
// base del propio usuario, CORRELACIONES entre señales, y PREVISIONES, y asigna
// a cada señal una prioridad (severidad × categoría × momento × novedad). La capa
// de IA solo redacta la señal de mayor prioridad (ver generate-notification-insight).

import type { UserData } from '@/lib/types';
import { parseISO, differenceInHours, differenceInCalendarDays } from 'date-fns';

export type SignalCategory = 'finance' | 'habit' | 'milestone' | 'state' | 'general';
export type SignalTiming = 'morning' | 'evening' | 'any';

export interface Signal {
  key: string;                  // dedupe_key
  category: SignalCategory;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;                // título plantilla (fallback si la IA falla)
  message: string;              // mensaje plantilla con cifras reales (fallback)
  evidence: Record<string, string | number>; // hechos para la IA y el "¿por qué?"
  link: string;
  actionLabel?: string;
  cooldownHours: number;
  timing: SignalTiming;
  severity: number;             // 0..1 importancia bruta
  aiEligible: boolean;          // ¿merece redacción por IA?
}

export interface RankedSignal extends Signal {
  priority: number;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const safeParse = (s: string): Date | null => {
  if (!s) return null;
  const d = parseISO(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Correlación de Pearson; 0 si no hay varianza o muy pocos puntos. */
function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 4) return 0;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

const timeSlot = (hour: number): SignalTiming =>
  hour >= 5 && hour < 12 ? 'morning' : hour >= 18 && hour < 24 ? 'evening' : 'any';

// ──────────────────────────────────────────────────────────────────────────
// Detección de señales
// ──────────────────────────────────────────────────────────────────────────

export interface DetectInput {
  userData: UserData;
  pockets: Record<string, number>;
  now: Date;
}

export function detectSignals({ userData, pockets, now }: DetectInput): Signal[] {
  const out: Signal[] = [];
  const hour = now.getHours();
  const slot = timeSlot(hour);

  const events = userData.events || [];
  const transactions = userData.allTransactions || [];
  const interactions = userData.interactions || [];
  const milestones = userData.milestones || [];
  const habits = userData.habits || [];
  const rpg = userData.rpg_stats;
  const trend = userData.kpis?.dailyScoreTrend || [];
  const velocity = userData.kpis?.scoreVelocity;
  const learning = userData.isLearningMode;

  // ── Series diarias para líneas base ──
  const byDay = (items: { fecha: string }[]) => {
    const m: Record<string, number> = {};
    for (const it of items) {
      const d = safeParse(it.fecha);
      if (d) m[dayKey(d)] = (m[dayKey(d)] || 0) + 1;
    }
    return m;
  };

  // Score por día (reutilizado por varias correlaciones).
  const scoreByDay: Record<string, number> = {};
  for (const p of trend) { const d = safeParse(p.date); if (d) scoreByDay[dayKey(d)] = p.score; }

  // Detecta var_ids por palabras clave en el nombre (para correlaciones de sueño, etc.).
  const varIdsByKeyword = (keywords: string[]): Set<string> => {
    const set = new Set<string>();
    for (const v of userData.variables || []) {
      const name = (v.var_nombre || '').toLowerCase();
      if (keywords.some(k => name.includes(k))) set.add(v.var_id);
    }
    return set;
  };

  // ── FINANZAS: mes actual ──
  const month = now.getMonth(), year = now.getFullYear();
  const monthTx = transactions.filter(t => {
    const d = safeParse(t.fecha);
    return d && d.getMonth() === month && d.getFullYear() === year;
  });
  const income = monthTx.filter(t => t.tipo === 'Ingreso').reduce((a, t) => a + t.monto, 0);
  const expenses = monthTx.filter(t => t.tipo === 'Gasto').reduce((a, t) => a + Math.abs(t.monto), 0);
  const savings = income - expenses;
  const impulsive = monthTx.filter(t => t.tipo === 'Gasto' && t.impulsivo).reduce((a, t) => a + Math.abs(t.monto), 0);
  const impulsiveShare = expenses > 0 ? (impulsive / expenses) * 100 : 0;
  const debtPayments = monthTx.filter(t => t.tipo === 'Gasto' && t.categoria === 'Deudas').reduce((a, t) => a + Math.abs(t.monto), 0);
  const debtServiceRatio = income > 0 ? (debtPayments / income) * 100 : 0;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  // 1) Flujo de caja negativo (severidad por magnitud relativa al ingreso)
  if (savings < 0 && income > 0) {
    const sev = clamp(Math.abs(savings) / income, 0.2, 1);
    out.push({
      key: 'finance_negative_cashflow', category: 'finance', type: 'warning',
      title: 'Flujo de caja en negativo',
      message: `Este mes gastas ${Math.round(Math.abs(savings))} € más de lo que ingresas.`,
      evidence: { ingresos: Math.round(income), gastos: Math.round(expenses), balance: Math.round(savings) },
      link: '/dashboard/finances', actionLabel: 'Ver finanzas',
      cooldownHours: 24, timing: 'any', severity: 0.6 + sev * 0.4, aiEligible: true,
    });
  }

  // 2) PREVISIÓN: proyección de gasto por pocket → sobrepaso a fin de mes
  if (monthProgress > 0.25) {
    const spentByCat: Record<string, number> = {};
    for (const t of monthTx) {
      if (t.tipo === 'Gasto') spentByCat[t.categoria] = (spentByCat[t.categoria] || 0) + Math.abs(t.monto);
    }
    let worst: { cat: string; projected: number; budget: number; over: number } | null = null;
    for (const [cat, budget] of Object.entries(pockets)) {
      if (!budget || budget <= 0) continue;
      const spent = spentByCat[cat] || 0;
      const projected = spent / monthProgress; // run-rate a fin de mes
      const over = projected - budget;
      if (projected > budget * 1.15 && (!worst || over > worst.over)) {
        worst = { cat, projected, budget, over };
      }
    }
    if (worst) {
      const sev = clamp(worst.over / worst.budget, 0.2, 1);
      out.push({
        key: 'finance_overspend_forecast', category: 'finance', type: 'warning',
        title: `Vas camino de pasarte en ${worst.cat}`,
        message: `A este ritmo gastarás ~${Math.round(worst.projected)} € en ${worst.cat} este mes (presupuesto ${Math.round(worst.budget)} €).`,
        evidence: { categoria: worst.cat, proyectado: Math.round(worst.projected), presupuesto: Math.round(worst.budget), dia_del_mes: dayOfMonth },
        link: '/dashboard/finances', actionLabel: 'Ajustar pocket',
        cooldownHours: 36, timing: 'any', severity: 0.45 + sev * 0.35, aiEligible: true,
      });
    }
  }

  // 3) CORRELACIÓN: gasto impulsivo en días de bajo estado
  if (trend.length >= 6 && expenses > 0) {
    const impulsiveByDay: Record<string, number> = {};
    const totalByDay: Record<string, number> = {};
    for (const t of transactions) {
      if (t.tipo !== 'Gasto') continue;
      const d = safeParse(t.fecha); if (!d) continue;
      const k = dayKey(d);
      totalByDay[k] = (totalByDay[k] || 0) + Math.abs(t.monto);
      if (t.impulsivo) impulsiveByDay[k] = (impulsiveByDay[k] || 0) + Math.abs(t.monto);
    }
    const days = Object.keys(scoreByDay).filter(k => totalByDay[k] > 0);
    if (days.length >= 6) {
      const scores = days.map(k => scoreByDay[k]);
      const shares = days.map(k => ((impulsiveByDay[k] || 0) / totalByDay[k]) * 100);
      const r = pearson(scores, shares); // esperado negativo: peor estado → más impulsivo
      const lowDays = days.filter(k => scoreByDay[k] < 50);
      const highDays = days.filter(k => scoreByDay[k] >= 50);
      const lowShare = mean(lowDays.map(k => ((impulsiveByDay[k] || 0) / totalByDay[k]) * 100));
      const highShare = mean(highDays.map(k => ((impulsiveByDay[k] || 0) / totalByDay[k]) * 100));
      if (r <= -0.45 && lowDays.length >= 3 && lowShare - highShare >= 12) {
        out.push({
          key: 'finance_impulsive_state_link', category: 'finance', type: 'info',
          title: 'Tu estado dispara el gasto impulsivo',
          message: `En tus días de bajo estado, el gasto impulsivo sube a ${lowShare.toFixed(0)}% (vs ${highShare.toFixed(0)}% en días buenos).`,
          evidence: { correlacion: Number(r.toFixed(2)), share_dias_malos: Math.round(lowShare), share_dias_buenos: Math.round(highShare) },
          link: '/dashboard/finances', actionLabel: 'Ver patrón',
          cooldownHours: 72, timing: 'any', severity: 0.55, aiEligible: true,
        });
      }
    }
  }

  // 4) Presión de deuda
  if (debtServiceRatio >= 35 && income > 0) {
    out.push({
      key: 'finance_debt_service_high', category: 'finance', type: 'warning',
      title: 'Presión de deuda elevada',
      message: `La deuda consume ${debtServiceRatio.toFixed(0)}% de tus ingresos este mes.`,
      evidence: { ratio: Math.round(debtServiceRatio), pagos_deuda: Math.round(debtPayments), ingresos: Math.round(income) },
      link: '/dashboard/finances', actionLabel: 'Estrategia de deuda',
      cooldownHours: 48, timing: 'any', severity: clamp(debtServiceRatio / 100, 0.4, 0.9), aiEligible: true,
    });
  }

  // 4b) CORRELACIÓN: dormir bien sube el score del día siguiente
  if (trend.length >= 8) {
    const sleepVars = varIdsByKeyword(['sueño', 'sueno', 'dormir', 'sleep', 'descanso']);
    if (sleepVars.size > 0) {
      // Calidad de sueño por día = media de intensidad de eventos de sueño.
      const sleepByDay: Record<string, number[]> = {};
      for (const e of events) {
        if (!sleepVars.has(e.var_id)) continue;
        const d = safeParse(e.fecha); if (!d) continue;
        (sleepByDay[dayKey(d)] ||= []).push((e as any).intensidad ?? 3);
      }
      const xs: number[] = []; const ys: number[] = [];
      for (const [k, vals] of Object.entries(sleepByDay)) {
        const [y, m, dd] = k.split('-').map(Number);
        const next = new Date(y, m, dd + 1);
        const ns = scoreByDay[dayKey(next)];
        if (typeof ns === 'number') { xs.push(mean(vals)); ys.push(ns); }
      }
      const r = pearson(xs, ys); // positivo: mejor sueño → mejor score al día siguiente
      if (r >= 0.45 && xs.length >= 6) {
        const goodNights = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.x >= 4);
        const badNights = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.x < 3);
        const diff = goodNights.length && badNights.length ? mean(goodNights.map(p => p.y)) - mean(badNights.map(p => p.y)) : 0;
        out.push({
          key: 'insight_sleep_next_day', category: 'state', type: 'info',
          title: 'Tu sueño marca el día siguiente',
          message: diff > 3
            ? `Cuando duermes bien, tu score al día siguiente sube ~${Math.round(diff)} pts. Protege el sueño esta noche.`
            : 'Hay una relación clara entre tu sueño y tu rendimiento al día siguiente. Protege el sueño esta noche.',
          evidence: { correlacion: Number(r.toFixed(2)), dif_pts: Math.round(diff), noches_analizadas: xs.length },
          link: '/dashboard/analytics', actionLabel: 'Ver patrón',
          cooldownHours: 96, timing: 'evening', severity: 0.5, aiEligible: true,
        });
      }
    }
  }

  // 4c) CORRELACIÓN: las interacciones que te drenan bajan tu score
  if (trend.length >= 6 && interactions.length >= 6) {
    const energyByDay: Record<string, number> = {};
    for (const it of interactions) {
      const d = safeParse(it.fecha); if (!d) continue;
      energyByDay[dayKey(d)] = (energyByDay[dayKey(d)] || 0) + ((it as any).energia_resultante ?? 0);
    }
    const drainDays = Object.keys(energyByDay).filter(k => energyByDay[k] < 0 && typeof scoreByDay[k] === 'number');
    const goodDays = Object.keys(energyByDay).filter(k => energyByDay[k] > 0 && typeof scoreByDay[k] === 'number');
    if (drainDays.length >= 3 && goodDays.length >= 3) {
      const drainScore = mean(drainDays.map(k => scoreByDay[k]));
      const goodScore = mean(goodDays.map(k => scoreByDay[k]));
      if (goodScore - drainScore >= 8) {
        out.push({
          key: 'insight_social_drain', category: 'state', type: 'info',
          title: 'Las relaciones que te drenan te pasan factura',
          message: `Tus días con interacciones que te drenan tienen un score ~${Math.round(goodScore - drainScore)} pts más bajo.`,
          evidence: { score_dias_drenantes: Math.round(drainScore), score_dias_buenos: Math.round(goodScore), dias_drenantes: drainDays.length },
          link: '/dashboard/relations', actionLabel: 'Ver relaciones',
          cooldownHours: 96, timing: 'any', severity: 0.5, aiEligible: true,
        });
      }
    }
  }

  // ── HÁBITOS: racha global ──
  const habitDayActive = byDay(events.filter(e => (e as any).habito_id));
  const activeDayKeys = new Set(Object.keys(habitDayActive));
  const computeStreak = () => {
    let cursor = activeDayKeys.has(dayKey(now)) ? new Date(now) : new Date(now.getTime() - 864e5);
    if (!activeDayKeys.has(dayKey(cursor))) return 0;
    let s = 0;
    while (activeDayKeys.has(dayKey(cursor))) { s++; cursor = new Date(cursor.getTime() - 864e5); }
    return s;
  };
  const streak = computeStreak();
  const loggedToday = activeDayKeys.has(dayKey(now));

  // 5) PREVISIÓN + TIMING: racha en riesgo (tarde, sin registrar hoy)
  if (streak >= 3 && !loggedToday && hour >= 17) {
    out.push({
      key: 'habit_streak_at_risk', category: 'habit', type: 'warning',
      title: `Tu racha de ${streak} días está en riesgo`,
      message: `Aún no has registrado ningún hábito hoy. Marca uno para no romper la racha de ${streak} días.`,
      evidence: { racha: streak, hora: hour },
      link: '/dashboard/milestones', actionLabel: 'Marcar hábito',
      cooldownHours: 6, timing: 'evening', severity: clamp(0.4 + streak / 50, 0.4, 0.85), aiEligible: false,
    });
  }

  // 6) Hito de racha alcanzado (refuerzo positivo)
  if ([7, 30, 100, 365].includes(streak) && loggedToday) {
    out.push({
      key: `habit_streak_milestone_${streak}`, category: 'habit', type: 'success',
      title: `¡${streak} días de racha!`,
      message: `Has mantenido tus hábitos ${streak} días seguidos. El sistema se está consolidando.`,
      evidence: { racha: streak },
      link: '/dashboard/milestones', actionLabel: 'Ver progreso',
      cooldownHours: 24, timing: 'any', severity: 0.5, aiEligible: false,
    });
  }

  // 7) ANOMALÍA: hábitos diarios sin actividad vs su cadencia
  const dailyHabits = habits.filter(h => h.frecuencia === 'Diaria');
  if (dailyHabits.length > 0) {
    const twoDaysAgo = now.getTime() - 864e5 * 2;
    const missed = dailyHabits.filter(h =>
      !events.some(e => {
        if ((e as any).habito_id !== (h as any).id && e.var_id !== h.var_id) return false;
        const d = safeParse(e.fecha); return d ? d.getTime() >= twoDaysAgo : false;
      }),
    ).length;
    if (missed > 0) {
      out.push({
        key: 'habit_daily_missed_recent', category: 'habit', type: 'info',
        title: 'Hábitos diarios sin registro',
        message: `${missed} de tus hábitos diarios no tienen actividad en 48h.`,
        evidence: { sin_actividad: missed, total_diarios: dailyHabits.length },
        link: '/dashboard/milestones', actionLabel: 'Registrar',
        cooldownHours: 18, timing: 'morning', severity: clamp(0.3 + missed / (dailyHabits.length * 2), 0.3, 0.6), aiEligible: false,
      });
    }
  }

  // ── HITOS ──
  const pendingMs = milestones.filter(m => m.estado === 'Pendiente' && m.fecha_objetivo);
  const overdue = pendingMs.filter(m => { const d = safeParse(m.fecha_objetivo!); return d ? d.getTime() < now.getTime() : false; });
  if (overdue.length > 0) {
    out.push({
      key: 'milestone_overdue_pending', category: 'milestone', type: 'info',
      title: 'Hitos vencidos',
      message: `Tienes ${overdue.length} hito${overdue.length > 1 ? 's' : ''} pendiente${overdue.length > 1 ? 's' : ''} fuera de fecha.`,
      evidence: { vencidos: overdue.length },
      link: '/dashboard/milestones', actionLabel: 'Revisar hitos',
      cooldownHours: 24, timing: 'any', severity: clamp(0.3 + overdue.length / 10, 0.3, 0.6), aiEligible: false,
    });
  }
  // 8) PREVISIÓN: hito a punto de vencer (3 días)
  const dueSoon = pendingMs.filter(m => {
    const d = safeParse(m.fecha_objetivo!); if (!d) return false;
    const days = differenceInCalendarDays(d, now);
    return days >= 0 && days <= 3;
  });
  if (dueSoon.length > 0) {
    const next = dueSoon.sort((a, b) => safeParse(a.fecha_objetivo!)!.getTime() - safeParse(b.fecha_objetivo!)!.getTime())[0];
    const days = differenceInCalendarDays(safeParse(next.fecha_objetivo!)!, now);
    out.push({
      key: 'milestone_due_soon', category: 'milestone', type: 'warning',
      title: 'Hito a punto de vencer',
      message: `"${(next as any).nombre || 'Un hito'}" vence ${days === 0 ? 'hoy' : `en ${days} día${days > 1 ? 's' : ''}`}.`,
      evidence: { hito: (next as any).nombre || '', dias: days, total_proximos: dueSoon.length },
      link: '/dashboard/milestones', actionLabel: 'Ver hito',
      cooldownHours: 24, timing: 'morning', severity: clamp(0.7 - days * 0.1, 0.4, 0.7), aiEligible: true,
    });
  }

  // ── ESTADO DEL SISTEMA ──
  if (!learning && userData.overallState === 'CRITICO') {
    const topDrain = userData.dominantVariables?.[0]?.nombre;
    out.push({
      key: 'state_critical', category: 'state', type: 'error',
      title: 'Sistema en estado crítico',
      message: `Tu sistema está en estado crítico${topDrain ? `. Principal drenaje: ${topDrain}` : ''}. Prioriza estabilización.`,
      evidence: { score: Math.round(rpg?.player_score ?? 0), drenaje_principal: topDrain || 'n/d' },
      link: '/dashboard/analytics', actionLabel: 'Ver diagnóstico',
      cooldownHours: 12, timing: 'any', severity: 1, aiEligible: true,
    });
  } else if (!learning && userData.overallState === 'RIESGO') {
    const topDrain = userData.dominantVariables?.[0]?.nombre;
    out.push({
      key: 'state_risk', category: 'state', type: 'warning',
      title: 'Sistema en riesgo',
      message: `Hay señales de desgaste${topDrain ? ` (${topDrain})` : ''}. Actúa sobre sueño, estrés y gasto impulsivo.`,
      evidence: { score: Math.round(rpg?.player_score ?? 0), drenaje_principal: topDrain || 'n/d' },
      link: '/dashboard/analytics', actionLabel: 'Ver diagnóstico',
      cooldownHours: 16, timing: 'any', severity: 0.7, aiEligible: true,
    });
  }

  // 9) PREDICCIÓN: caída acelerada antes de tocar RIESGO
  if (!learning && velocity && (velocity.earlyWarning || velocity.direction === 'plunging') && userData.overallState === 'OK') {
    out.push({
      key: 'state_downtrend_warning', category: 'state', type: 'warning',
      title: 'Tu score está cayendo rápido',
      message: `Tu puntuación baja ~${Math.abs(velocity.weekly).toFixed(1)} pts/día. A este ritmo entrarás en riesgo pronto.`,
      evidence: { velocidad_diaria: Number(velocity.weekly.toFixed(1)), direccion: velocity.direction },
      link: '/dashboard/analytics', actionLabel: 'Ver tendencia',
      cooldownHours: 18, timing: 'any', severity: clamp(0.5 + Math.abs(velocity.momentum) / 200, 0.5, 0.85), aiEligible: true,
    });
  }

  // 10) Sueño bajo (absoluto + deuda crónica)
  const sleep = rpg?.sueno;
  const sleepDebt = rpg?.sleep_debt_score ?? 0;
  if (!learning && typeof sleep === 'number' && (sleep < 38 || sleepDebt >= 35)) {
    out.push({
      key: 'state_low_sleep', category: 'state', type: 'warning',
      title: 'Recuperación de sueño baja',
      message: `Tu recuperación de sueño está en ${Math.round(sleep)}/100${sleepDebt >= 35 ? ` con deuda acumulada (${Math.round(sleepDebt)})` : ''}. Riesgo de caída en foco y energía.`,
      evidence: { sueno: Math.round(sleep), deuda_sueno: Math.round(sleepDebt) },
      link: '/dashboard/analytics', actionLabel: 'Ver biomarcadores',
      cooldownHours: 18, timing: 'morning', severity: clamp(0.4 + (50 - sleep) / 100 + sleepDebt / 200, 0.4, 0.8), aiEligible: true,
    });
  }

  // ── GENERAL ──
  // 11) ANOMALÍA: poca actividad de registro vs línea base personal
  const allSignals = [
    ...events.map(e => safeParse(e.fecha)?.getTime()),
    ...interactions.map(i => safeParse(i.fecha)?.getTime()),
    ...transactions.map(t => safeParse(t.fecha)?.getTime()),
  ].filter((x): x is number => typeof x === 'number');
  if (allSignals.length >= 5) {
    const lastTs = Math.max(...allSignals);
    const idleHours = differenceInHours(now, new Date(lastTs));
    // Línea base: registros/día en los últimos 14 días.
    const fourteenAgo = now.getTime() - 864e5 * 14;
    const recent = allSignals.filter(t => t >= fourteenAgo);
    const perDay = recent.length / 14;
    const expectedGap = 24 / Math.max(perDay, 0.1);
    if (perDay >= 0.5 && idleHours > Math.max(30, expectedGap * 3)) {
      out.push({
        key: 'general_low_logging_activity', category: 'general', type: 'info',
        title: 'Llevas más tiempo del habitual sin registrar',
        message: `${idleHours}h sin registrar nada. Sueles hacerlo cada ~${Math.round(expectedGap)}h; tus recomendaciones pierden precisión.`,
        evidence: { horas_inactivo: idleHours, cadencia_habitual_h: Math.round(expectedGap), registros_por_dia: Number(perDay.toFixed(1)) },
        link: '/dashboard', actionLabel: 'Registrar ahora',
        cooldownHours: 24, timing: 'any', severity: clamp(0.3 + idleHours / 240, 0.3, 0.6), aiEligible: false,
      });
    }
  }

  // 12) Refuerzo: buen momentum
  if (!learning && velocity?.direction === 'rising' && userData.overallState === 'OK' && savings >= 0 && impulsiveShare < 12 && impulsiveShare >= 0) {
    out.push({
      key: 'general_positive_momentum', category: 'general', type: 'success',
      title: 'Buen momentum',
      message: `Tu score sube y tus finanzas están bajo control (gasto impulsivo ${impulsiveShare.toFixed(0)}%). Mantén el sistema.`,
      evidence: { velocidad: Number((velocity.weekly).toFixed(1)), impulsivo_pct: Math.round(impulsiveShare) },
      link: '/dashboard', actionLabel: 'Ver dashboard',
      cooldownHours: 72, timing: 'morning', severity: 0.35, aiEligible: false,
    });
  }

  // 13) Recordatorio matinal de la directiva del día
  if (slot === 'morning') {
    out.push({
      key: 'daily_directive_prompt', category: 'general', type: 'info',
      title: 'Recibir Directiva del Día',
      message: 'Abre tu briefing táctico para alinear foco, energía y ejecución antes de empezar.',
      evidence: {},
      link: '/dashboard', actionLabel: 'Ver briefing',
      cooldownHours: 20, timing: 'morning', severity: 0.25, aiEligible: false,
    });
  }

  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Priorización
// ──────────────────────────────────────────────────────────────────────────

const CATEGORY_WEIGHT: Record<SignalCategory, number> = {
  state: 1.0, finance: 0.85, habit: 0.75, milestone: 0.7, general: 0.55,
};

export interface RankContext {
  now: Date;
  /** Backoff por categoría/clave: clave→multiplicador de prioridad (<1 reduce). */
  engagement?: Record<string, number>;
}

/** Ordena las señales por prioridad = severidad × peso × momento × engagement. */
export function rankSignals(signals: Signal[], ctx: RankContext): RankedSignal[] {
  const slot = timeSlot(ctx.now.getHours());
  return signals
    .map((s): RankedSignal => {
      const timingFit = s.timing === 'any' || s.timing === slot ? 1 : 0.45;
      const eng = ctx.engagement?.[s.key] ?? 1;
      const priority = clamp(s.severity, 0, 1) * CATEGORY_WEIGHT[s.category] * timingFit * eng;
      return { ...s, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}

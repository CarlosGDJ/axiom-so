'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import type { Notification } from '@/lib/types';
import { parseISO, differenceInHours } from 'date-fns';
import { useUser } from '@/hooks/use-session-user';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/lib/api-writes';
import { useCollection, useDoc } from '@/hooks/use-mongo-collection';
interface NotificationPrefs {
  finance: boolean;
  habits: boolean;
  milestones: boolean;
  system: boolean;
  morning_briefing: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  finance: true,
  habits: true,
  milestones: true,
  system: true,
  morning_briefing: true,
};

type Candidate = {
  dedupe_key: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  link: string;
  category: Notification['category'];
  cooldownHours: number;
};

const MIN_GENERATION_INTERVAL_MS = 1000 * 30;
const DUPLICATE_CLEANUP_INTERVAL_MS = 1000 * 60;

function toDate(input: any): Date | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const parsed = parseISO(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof input?.toDate === 'function') {
    const parsed = input.toDate();
    return parsed instanceof Date ? parsed : null;
  }
  return null;
}

export function useSmartNotifications() {
  const { user, uid } = useUser();  const { data: userData, isLoading } = useUserData();

  const { data: prefsDoc } = useDoc<NotificationPrefs>('settings', uid ? 'notifications' : null);
  const prefs: NotificationPrefs = useMemo(() => ({ ...DEFAULT_PREFS, ...(prefsDoc || {}) }), [prefsDoc]);

  const { data: allNotificationsRaw, isLoading: isAllNotificationsLoading } = useCollection<Notification>(uid ? 'notifications' : null, { orderBy: 'createdAt', direction: 'desc', limit: 200 });
  const existingNotifications = useMemo(() => (allNotificationsRaw || []).filter(n => n.smart), [allNotificationsRaw]);
  const allNotifications = allNotificationsRaw;
  const isExistingNotificationsLoading = isAllNotificationsLoading;

  const lastRunRef = useRef(0);
  const lastCleanupRef = useRef(0);

  const candidates = useMemo(() => {
    if (!userData) return [] as Candidate[];

    const output: Candidate[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const transactions = userData.allTransactions || [];
    const events = userData.events || [];
    const interactions = userData.interactions || [];
    const milestones = userData.milestones || [];
    const habits = userData.habits || [];
    const rpg = userData.rpg_stats;

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthTx = transactions.filter((t) => {
      const d = parseISO(t.fecha);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthTx.filter(t => t.tipo === 'Ingreso').reduce((a, t) => a + t.monto, 0);
    const expenses = monthTx.filter(t => t.tipo === 'Gasto').reduce((a, t) => a + Math.abs(t.monto), 0);
    const savings = income - expenses;
    const impulsive = monthTx.filter(t => t.tipo === 'Gasto' && t.impulsivo).reduce((a, t) => a + Math.abs(t.monto), 0);
    const impulsiveShare = expenses > 0 ? (impulsive / expenses) * 100 : 0;
    const debtPayments = monthTx.filter(t => t.tipo === 'Gasto' && t.categoria === 'Deudas').reduce((a, t) => a + Math.abs(t.monto), 0);
    const debtServiceRatio = income > 0 ? (debtPayments / income) * 100 : 0;

    // Recordatorio inteligente para abrir "Recibir Directiva del Día".
    // Se emite solo en ventana matinal y luego se controla por dedupe/cooldown
    // para evitar spam en el centro de notificaciones.
    if (currentHour >= 5 && currentHour <= 13) {
      output.push({
        dedupe_key: 'daily_directive_prompt',
        title: 'Recibir Directiva del Día',
        message: 'Abre tu briefing táctico para alinear foco, energía y ejecución antes de empezar.',
        type: 'info',
        link: '/dashboard',
        category: 'general',
        cooldownHours: 20,
      });
    }

    if (savings < 0) {
      output.push({
        dedupe_key: 'finance_negative_cashflow',
        title: 'Flujo de caja en negativo',
        message: `Este mes vas en negativo (${Math.round(savings)} EUR). Revisa gastos variables y deuda.`,
        type: 'warning',
        link: '/dashboard/finances',
        category: 'finance',
        cooldownHours: 24,
      });
    }

    if (impulsiveShare >= 22 && expenses > 0) {
      output.push({
        dedupe_key: 'finance_impulsive_ratio_high',
        title: 'Impulsividad financiera alta',
        message: `${impulsiveShare.toFixed(1)}% de tus gastos del mes son impulsivos.`,
        type: 'warning',
        link: '/dashboard/finances',
        category: 'finance',
        cooldownHours: 24,
      });
    }

    if (debtServiceRatio >= 35 && income > 0) {
      output.push({
        dedupe_key: 'finance_debt_service_high',
        title: 'Presión de deuda elevada',
        message: `El servicio de deuda consume ${debtServiceRatio.toFixed(1)}% de tus ingresos del mes.`,
        type: 'warning',
        link: '/dashboard/finances',
        category: 'finance',
        cooldownHours: 24,
      });
    }

    const overdueMilestones = milestones.filter((m) => {
      if (m.estado !== 'Pendiente' || !m.fecha_objetivo) return false;
      const target = parseISO(m.fecha_objetivo);
      return target.getTime() < now.getTime();
    }).length;
    if (overdueMilestones > 0) {
      output.push({
        dedupe_key: 'milestone_overdue_pending',
        title: 'Hitos vencidos',
        message: `Tienes ${overdueMilestones} hitos pendientes fuera de fecha objetivo.`,
        type: 'info',
        link: '/dashboard/milestones',
        category: 'milestone',
        cooldownHours: 18,
      });
    }

    const dailyHabits = habits.filter((h) => h.frecuencia === 'Diaria');
    if (dailyHabits.length > 0) {
      const twoDaysAgo = new Date(now.getTime() - (1000 * 60 * 60 * 24 * 2));
      const missedCount = dailyHabits.filter((h) => {
        const hasRecent = events.some((e) => {
          if (e.var_id !== h.var_id) return false;
          const d = parseISO(e.fecha);
          return d.getTime() >= twoDaysAgo.getTime();
        });
        return !hasRecent;
      }).length;

      if (missedCount > 0) {
        output.push({
          dedupe_key: 'habit_daily_missed_recent',
          title: 'Hábitos diarios sin registro',
          message: `${missedCount} hábitos diarios no tienen actividad en 48h.`,
          type: 'info',
          link: '/dashboard/milestones',
          category: 'habit',
          cooldownHours: 16,
        });
      }
    }

    const lastSignals = [
      ...events.map(e => parseISO(e.fecha).getTime()),
      ...interactions.map(i => parseISO(i.fecha).getTime()),
      ...transactions.map(t => parseISO(t.fecha).getTime()),
    ];
    const lastSignalTs = lastSignals.length > 0 ? Math.max(...lastSignals) : 0;
    if (lastSignalTs > 0) {
      const idleHours = differenceInHours(now, new Date(lastSignalTs));
      if (idleHours >= 48) {
        output.push({
          dedupe_key: 'general_low_logging_activity',
          title: 'Poca actividad de registro',
          message: `Llevas ${idleHours}h sin registrar eventos o movimientos. Tus recomendaciones pierden precisión.`,
          type: 'info',
          link: '/dashboard',
          category: 'general',
          cooldownHours: 24,
        });
      }
    }

    if (userData.overallState === 'CRITICO') {
      output.push({
        dedupe_key: 'state_critical',
        title: 'Sistema en estado crítico',
        message: 'Se detectó estado crítico. Prioriza protocolos de estabilización y revisa variables dominantes.',
        type: 'error',
        link: '/dashboard/analytics',
        category: 'state',
        cooldownHours: 12,
      });
    } else if (userData.overallState === 'RIESGO') {
      output.push({
        dedupe_key: 'state_risk',
        title: 'Sistema en riesgo',
        message: 'Hay señales de desgaste. Actúa sobre sueño, estrés y gastos impulsivos.',
        type: 'warning',
        link: '/dashboard/analytics',
        category: 'state',
        cooldownHours: 16,
      });
    }

    const sleep = (rpg as any)?.['sueño'] ?? (rpg as any)?.sueno;
    if (typeof sleep === 'number' && sleep < 35) {
      output.push({
        dedupe_key: 'state_low_sleep',
        title: 'Recuperación de sueño baja',
        message: `Nivel de sueño en ${Math.round(sleep)}/100. Riesgo de caída en foco y energía.`,
        type: 'warning',
        link: '/dashboard/analytics',
        category: 'state',
        cooldownHours: 16,
      });
    }

    if (savings > 0 && impulsiveShare < 10 && userData.overallState === 'OK') {
      output.push({
        dedupe_key: 'finance_positive_control',
        title: 'Buen control financiero',
        message: `Ahorro positivo y gasto impulsivo bajo (${impulsiveShare.toFixed(1)}%). Mantén el sistema.`,
        type: 'success',
        link: '/dashboard/finances',
        category: 'finance',
        cooldownHours: 48,
      });
    }

    return output.filter((c) => {
      if (c.category === 'finance') return prefs.finance;
      if (c.category === 'habit') return prefs.habits;
      if (c.category === 'milestone') return prefs.milestones;
      if (c.category === 'state') return prefs.system;
      if (c.dedupe_key === 'daily_directive_prompt') return prefs.morning_briefing;
      return true;
    });
  }, [userData, prefs]);

  useEffect(() => {
    if (!user || isLoading || !userData) return;
    // Evita recrear alertas como no leídas antes de que cargue el histórico remoto.
    if (isExistingNotificationsLoading || isAllNotificationsLoading) return;
    if (existingNotifications === null || allNotifications === null) return;
    const nowTs = Date.now();
    if ((nowTs - lastRunRef.current) < MIN_GENERATION_INTERVAL_MS) return;

    const existingByKey = new Map<string, { latest: Notification; anyRead: boolean }>();
    (allNotifications || []).forEach((n) => {
      if (!n?.dedupe_key) return;
      const d = toDate(n.createdAt);
      if (!d) return;
      const prev = existingByKey.get(n.dedupe_key);
      const prevDate = prev ? toDate(prev.latest.createdAt) : null;
      if (!prevDate || d.getTime() > prevDate.getTime()) {
        existingByKey.set(n.dedupe_key, {
          latest: n,
          anyRead: Boolean(n.read) || Boolean(prev?.anyRead),
        });
      } else if (prev && n.read) {
        existingByKey.set(n.dedupe_key, {
          latest: prev.latest,
          anyRead: true,
        });
      }
    });

    const now = new Date();
    const writes: Array<{ id: string; data: Record<string, any> }> = [];
    const activeKeys = new Set(candidates.map((c) => c.dedupe_key));

    candidates.forEach((item) => {
      const id = `smart__${item.dedupe_key}`;
      const existingMeta = existingByKey.get(item.dedupe_key);
      const existing = existingMeta?.latest;
      const existingCreatedAt = existing ? toDate(existing.createdAt) : null;
      const existingReadAt = existing ? (toDate((existing as any).readAt) || (existing.read ? toDate((existing as any).updatedAt) : null)) : null;
      const renotifyAnchor =
        existingReadAt && existingCreatedAt
          ? (existingReadAt.getTime() > existingCreatedAt.getTime() ? existingReadAt : existingCreatedAt)
          : (existingReadAt || existingCreatedAt);
      const canRenotify =
        !renotifyAnchor || differenceInHours(now, renotifyAnchor) >= item.cooldownHours;

      // Mantener "leído" persistente para que no reaparezca enseguida como no leído.
      // Solo volver a no leído cuando pase el cooldown.
      const nextRead = Boolean(existingMeta?.anyRead) && !canRenotify ? true : false;

      const hasChanged =
        !existing ||
        existing.title !== item.title ||
        existing.message !== item.message ||
        existing.type !== item.type ||
        existing.link !== item.link ||
        existing.category !== (item.category || 'general') ||
        existing.read !== nextRead ||
        !existing.dedupe_key;

      if (!hasChanged) return;

      writes.push({
        id,
        data: {
          title: item.title,
          message: item.message,
          type: item.type,
          read: nextRead,
          createdAt: canRenotify || !existingCreatedAt ? now.toISOString() : existingCreatedAt.toISOString(),
          updatedAt: now.toISOString(),
          link: item.link,
          dedupe_key: item.dedupe_key,
          category: item.category || 'general',
          smart: true,
        },
      });
    });

    // Si una alerta inteligente deja de aplicar, no debe seguir contando como no leída.
    (allNotifications || []).forEach((n) => {
      if (!n?.smart || !n?.dedupe_key) return;
      if (activeKeys.has(n.dedupe_key)) return;
      if (n.read) return;

      writes.push({
        id: n.id || `smart__${n.dedupe_key}`,
        data: {
          read: true,
          updatedAt: now.toISOString(),
          smart: true,
          dedupe_key: n.dedupe_key,
        },
      });
    });

    if (writes.length === 0) {
      lastRunRef.current = nowTs;
      return;
    }

    writes.slice(0, 6).forEach((w) => {
            setDocumentNonBlocking('notifications', w.id, w.data, { merge: true });
    });

    // Disparar notificación OS para alertas urgentes nuevas (sin servidor push)
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      'serviceWorker' in navigator
    ) {
      const urgentWrite = writes.find(w =>
        !w.data.read &&
        (w.data.type === 'error' || w.data.type === 'warning') &&
        (w.data.dedupe_key?.startsWith('state_') || w.data.dedupe_key === 'finance_negative_cashflow')
      );
      if (urgentWrite) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(urgentWrite.data.title, {
            body: urgentWrite.data.message,
            icon: '/icon-192.svg',
            tag: urgentWrite.id,
            data: { url: urgentWrite.data.link || '/dashboard' },
          }).catch(() => {});
        }).catch(() => {});
      }
    }

    lastRunRef.current = nowTs;
  }, [
    user,
    isLoading,
    userData,
    existingNotifications,
    allNotifications,
    isExistingNotificationsLoading,
    isAllNotificationsLoading,
    candidates,
  ]);

  useEffect(() => {
    if (!user || !allNotifications || allNotifications.length < 2) return;
    const nowTs = Date.now();
    if ((nowTs - lastCleanupRef.current) < DUPLICATE_CLEANUP_INTERVAL_MS) return;

    const byKey = new Map<string, Notification[]>();
    allNotifications.forEach((n) => {
      if (!n?.dedupe_key) return;
      const arr = byKey.get(n.dedupe_key) || [];
      arr.push(n);
      byKey.set(n.dedupe_key, arr);
    });

    byKey.forEach((group, key) => {
      if (group.length <= 1) return;
      const canonicalId = `smart__${key}`;

      const sorted = [...group].sort((a, b) => {
        const da = toDate(a.createdAt)?.getTime() || 0;
        const db = toDate(b.createdAt)?.getTime() || 0;
        return db - da;
      });
      const latest = sorted[0];
      const hasCanonical = sorted.some((n) => n.id === canonicalId);
      const anyRead = sorted.some((n) => Boolean(n.read));

      if (!hasCanonical) {
        const latestDate = toDate(latest.createdAt);
        const { id: _dropId, ...latestData } = latest as any;
                setDocumentNonBlocking('notifications', canonicalId, {
          ...latestData,
          read: anyRead ? true : Boolean(latest.read),
          dedupe_key: key,
          smart: true,
          createdAt: latestDate ? latestDate.toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else if (anyRead) {
                setDocumentNonBlocking('notifications', canonicalId, {
          read: true,
          updatedAt: new Date().toISOString(),
          dedupe_key: key,
          smart: true,
        }, { merge: true });
      }

      sorted.forEach((n) => {
        if (n.id === canonicalId) return;
                deleteDocumentNonBlocking('notifications', n.id);
      });
    });

    lastCleanupRef.current = nowTs;
  }, [user, allNotifications]);
}

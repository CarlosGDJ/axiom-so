'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import type { Notification } from '@/lib/types';
import { differenceInHours, parseISO } from 'date-fns';
import { useUser } from '@/hooks/use-session-user';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/lib/api-writes';
import { useCollection, useDoc } from '@/hooks/use-mongo-collection';
import { detectSignals, rankSignals, type Signal } from '@/lib/notifications/signal-engine';
import { generateNotificationInsightAction } from '@/lib/actions';

interface NotificationPrefs {
  finance: boolean;
  habits: boolean;
  milestones: boolean;
  system: boolean;
  morning_briefing: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  finance: true, habits: true, milestones: true, system: true, morning_briefing: true,
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

// Backoff adaptativo: si una alerta se ha mostrado varias veces y nunca se ha
// pulsado, la espaciamos (cooldown ×) y la bajamos en prioridad.
function backoffFactor(existing: Notification | undefined): number {
  if (!existing) return 1;
  const shows = existing.shows ?? 0;
  if (existing.clicked) return 1;
  if (shows >= 5) return 3;
  if (shows >= 3) return 2;
  return 1;
}

export function useSmartNotifications() {
  const { user, uid } = useUser();
  const { data: userData, isLoading } = useUserData();

  const { data: prefsDoc } = useDoc<NotificationPrefs>('settings', uid ? 'notifications' : null);
  const prefs: NotificationPrefs = useMemo(() => ({ ...DEFAULT_PREFS, ...(prefsDoc || {}) }), [prefsDoc]);

  // Presupuestos de pockets para las previsiones de gasto.
  const { data: dashboardConfig } = useCollection<{ key: string; value: string }>(uid ? 'dashboardConfig' : null, { orderBy: 'key', direction: 'asc' });
  const pockets = useMemo<Record<string, number>>(() => {
    const raw = dashboardConfig?.find(c => c.key === 'financial_pockets')?.value;
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }, [dashboardConfig]);

  const { data: allNotifications, isLoading: isAllNotificationsLoading } =
    useCollection<Notification>(uid ? 'notifications' : null, { orderBy: 'createdAt', direction: 'desc', limit: 200 });

  const lastRunRef = useRef(0);
  const lastCleanupRef = useRef(0);
  const aiInFlightRef = useRef<Set<string>>(new Set());

  // ── Señales detectadas (motor determinista) ──
  const signals = useMemo<Signal[]>(() => {
    if (!userData) return [];
    const all = detectSignals({ userData, pockets, now: new Date() });
    return all.filter((s) => {
      if (s.category === 'finance') return prefs.finance;
      if (s.category === 'habit') return prefs.habits;
      if (s.category === 'milestone') return prefs.milestones;
      if (s.category === 'state') return prefs.system;
      if (s.key === 'daily_directive_prompt') return prefs.morning_briefing;
      return true;
    });
  }, [userData, pockets, prefs]);

  useEffect(() => {
    if (!user || isLoading || !userData) return;
    if (isAllNotificationsLoading || allNotifications === null) return;
    const nowTs = Date.now();
    if ((nowTs - lastRunRef.current) < MIN_GENERATION_INTERVAL_MS) return;

    // Última notificación por clave (tras el cleanup hay ~1 canónica por clave).
    const existingByKey = new Map<string, Notification>();
    (allNotifications || []).forEach((n) => {
      if (!n?.dedupe_key) return;
      const d = toDate(n.createdAt);
      const prev = existingByKey.get(n.dedupe_key);
      const prevD = prev ? toDate(prev.createdAt) : null;
      if (!prev || (d && prevD && d.getTime() > prevD.getTime())) existingByKey.set(n.dedupe_key, n);
    });

    const now = new Date();
    const engagement: Record<string, number> = {};
    signals.forEach((s) => { engagement[s.key] = 1 / backoffFactor(existingByKey.get(s.key)); });
    const ranked = rankSignals(signals, { now, engagement });

    // Qué señales (re)emiten ahora (respetando cooldown × backoff).
    type Plan = { signal: typeof ranked[number]; existing?: Notification; willEmit: boolean; nextRead: boolean };
    const plans: Plan[] = ranked.map((signal) => {
      const existing = existingByKey.get(signal.key);
      const createdAt = existing ? toDate(existing.createdAt) : null;
      const readAt = existing ? (toDate(existing.readAt) || (existing.read ? toDate(existing.updatedAt) : null)) : null;
      const anchor = readAt && createdAt ? (readAt > createdAt ? readAt : createdAt) : (readAt || createdAt);
      const effectiveCooldown = signal.cooldownHours * backoffFactor(existing);
      const canRenotify = !anchor || differenceInHours(now, anchor) >= effectiveCooldown;
      const willEmit = !existing || canRenotify;
      const nextRead = Boolean(existing?.read) && !canRenotify ? true : false;
      return { signal, existing, willEmit, nextRead };
    });

    // La señal de mayor prioridad que va a emitir y es apta para IA → la redacta la IA.
    const aiTarget = plans.find(p => p.willEmit && p.signal.aiEligible);

    const applyWrites = (aiText: { title: string; message: string } | null) => {
      const writes: Array<{ id: string; data: Record<string, any> }> = [];
      const activeKeys = new Set(signals.map(s => s.key));

      plans.forEach(({ signal, existing, willEmit, nextRead }) => {
        const id = `smart__${signal.key}`;
        const isAiOne = aiTarget && signal.key === aiTarget.signal.key && aiText;
        const title = isAiOne ? aiText!.title : signal.title;
        const message = isAiOne ? aiText!.message : signal.message;

        if (willEmit) {
          const createdAtIso = now.toISOString(); // (re)emitir ancla la fecha al ahora
          const shows = (existing?.shows ?? 0) + 1;
          const changed = !existing
            || existing.title !== title
            || existing.message !== message
            || existing.read !== nextRead
            || existing.shows !== shows;
          if (!changed) return;
          writes.push({
            id,
            data: {
              title, message, type: signal.type, read: nextRead,
              createdAt: createdAtIso, updatedAt: now.toISOString(),
              link: signal.link, dedupe_key: signal.key, category: signal.category,
              smart: true, priority: Number(signal.priority.toFixed(3)),
              evidence: signal.evidence, actionLabel: signal.actionLabel || '',
              aiGenerated: Boolean(isAiOne), shows,
              // al re-emitir, reseteamos clicked para volver a medir interés
              clicked: false,
            },
          });
        } else if (existing && existing.read !== nextRead) {
          writes.push({ id, data: { read: nextRead, updatedAt: now.toISOString(), smart: true, dedupe_key: signal.key } });
        }
      });

      // Señales que dejaron de aplicar → marcar leídas (no cuentan como no leídas).
      (allNotifications || []).forEach((n) => {
        if (!n?.smart || !n?.dedupe_key || activeKeys.has(n.dedupe_key) || n.read) return;
        writes.push({ id: n.id || `smart__${n.dedupe_key}`, data: { read: true, updatedAt: now.toISOString(), smart: true, dedupe_key: n.dedupe_key } });
      });

      if (writes.length === 0) { lastRunRef.current = nowTs; return; }
      writes.slice(0, 8).forEach((w) => setDocumentNonBlocking('notifications', w.id, w.data, { merge: true }));

      // Push del SO para la alerta urgente nueva.
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        const urgent = writes.find(w => !w.data.read && (w.data.type === 'error' || w.data.type === 'warning') &&
          (String(w.data.dedupe_key).startsWith('state_') || w.data.dedupe_key === 'finance_negative_cashflow'));
        if (urgent) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(urgent.data.title, {
              body: urgent.data.message, icon: '/icon-192.svg', tag: urgent.id,
              data: { url: urgent.data.link || '/dashboard' },
            }).catch(() => {});
          }).catch(() => {});
        }
      }
      lastRunRef.current = nowTs;
    };

    // Si hay objetivo de IA y no está ya en vuelo, pedimos la redacción; si no, plantilla.
    if (aiTarget && !aiInFlightRef.current.has(aiTarget.signal.key)) {
      aiInFlightRef.current.add(aiTarget.signal.key);
      // Marcamos el run como hecho para no relanzar mientras la IA responde.
      lastRunRef.current = nowTs;
      generateNotificationInsightAction({
        category: aiTarget.signal.category,
        severity: Number(aiTarget.signal.severity.toFixed(2)),
        fallbackTitle: aiTarget.signal.title,
        fallbackMessage: aiTarget.signal.message,
        evidence: JSON.stringify(aiTarget.signal.evidence),
        actionLabel: aiTarget.signal.actionLabel,
      }).then((res) => {
        applyWrites(res);
      }).catch(() => {
        applyWrites(null);
      }).finally(() => {
        aiInFlightRef.current.delete(aiTarget.signal.key);
      });
    } else if (!aiTarget) {
      applyWrites(null);
    }
  }, [user, isLoading, userData, allNotifications, isAllNotificationsLoading, signals]);

  // ── Limpieza de duplicados (colapsa a una doc canónica por clave) ──
  useEffect(() => {
    if (!user || !allNotifications || allNotifications.length < 2) return;
    const nowTs = Date.now();
    if ((nowTs - lastCleanupRef.current) < DUPLICATE_CLEANUP_INTERVAL_MS) return;

    const byKey = new Map<string, Notification[]>();
    allNotifications.forEach((n) => {
      if (!n?.dedupe_key) return;
      const arr = byKey.get(n.dedupe_key) || [];
      arr.push(n); byKey.set(n.dedupe_key, arr);
    });

    byKey.forEach((group, key) => {
      if (group.length <= 1) return;
      const canonicalId = `smart__${key}`;
      const sorted = [...group].sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
      const latest = sorted[0];
      const hasCanonical = sorted.some(n => n.id === canonicalId);
      const anyRead = sorted.some(n => Boolean(n.read));
      const maxShows = Math.max(...sorted.map(n => n.shows ?? 0));
      const anyClicked = sorted.some(n => Boolean(n.clicked));

      if (!hasCanonical) {
        const latestDate = toDate(latest.createdAt);
        const { id: _drop, ...latestData } = latest as any;
        setDocumentNonBlocking('notifications', canonicalId, {
          ...latestData, read: anyRead ? true : Boolean(latest.read), dedupe_key: key, smart: true,
          shows: maxShows, clicked: anyClicked,
          createdAt: latestDate ? latestDate.toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else if (anyRead || anyClicked) {
        setDocumentNonBlocking('notifications', canonicalId, {
          read: anyRead ? true : undefined, clicked: anyClicked ? true : undefined,
          shows: maxShows, updatedAt: new Date().toISOString(), dedupe_key: key, smart: true,
        }, { merge: true });
      }

      sorted.forEach((n) => { if (n.id !== canonicalId) deleteDocumentNonBlocking('notifications', n.id); });
    });

    lastCleanupRef.current = nowTs;
  }, [user, allNotifications]);
}

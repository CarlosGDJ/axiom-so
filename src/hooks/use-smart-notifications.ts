'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import type { Notification } from '@/lib/types';
import { differenceInHours, parseISO } from 'date-fns';
import { useUser } from '@/hooks/use-session-user';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/lib/api-writes';
import { useCollection, useDoc } from '@/hooks/use-mongo-collection';
import { detectSignals, rankSignals, type Signal, type RankedSignal } from '@/lib/notifications/signal-engine';
import { generateNotificationInsightAction, generateDailyDigestAction } from '@/lib/actions';

type Sensitivity = 'low' | 'normal' | 'high';

interface NotificationPrefs {
  finance: boolean;
  habits: boolean;
  milestones: boolean;
  system: boolean;
  morning_briefing: boolean;
  digest: boolean;
  sensitivity: Sensitivity;
}

const DEFAULT_PREFS: NotificationPrefs = {
  finance: true, habits: true, milestones: true, system: true,
  morning_briefing: true, digest: true, sensitivity: 'normal',
};

// Calibración por sensibilidad: gate de prioridad mínima + multiplicador de cooldown.
const SENS: Record<Sensitivity, { minPriority: number; cooldownMult: number }> = {
  low:    { minPriority: 0.45, cooldownMult: 1.5 },
  normal: { minPriority: 0.28, cooldownMult: 1.0 },
  high:   { minPriority: 0.15, cooldownMult: 0.75 },
};

const MIN_GENERATION_INTERVAL_MS = 1000 * 30;
const DUPLICATE_CLEANUP_INTERVAL_MS = 1000 * 60;
const DIGEST_COOLDOWN_H = 18;

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

function backoffFactor(existing: Notification | undefined): number {
  if (!existing) return 1;
  if (existing.clicked) return 1;
  const shows = existing.shows ?? 0;
  if (shows >= 5) return 3;
  if (shows >= 3) return 2;
  return 1;
}

function renotifyAnchor(existing: Notification | undefined): Date | null {
  if (!existing) return null;
  const createdAt = toDate(existing.createdAt);
  const readAt = toDate(existing.readAt) || (existing.read ? toDate(existing.updatedAt) : null);
  if (readAt && createdAt) return readAt > createdAt ? readAt : createdAt;
  return readAt || createdAt;
}

export function useSmartNotifications() {
  const { user, uid } = useUser();
  const { data: userData, isLoading } = useUserData();

  const { data: prefsDoc } = useDoc<NotificationPrefs>('settings', uid ? 'notifications' : null);
  const prefs: NotificationPrefs = useMemo(() => ({ ...DEFAULT_PREFS, ...(prefsDoc || {}) }), [prefsDoc]);

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

    const sens = SENS[prefs.sensitivity] || SENS.normal;
    const now = new Date();
    const hour = now.getHours();
    const morning = hour >= 5 && hour < 12;

    const existingByKey = new Map<string, Notification>();
    (allNotifications || []).forEach((n) => {
      if (!n?.dedupe_key) return;
      const d = toDate(n.createdAt);
      const prev = existingByKey.get(n.dedupe_key);
      const prevD = prev ? toDate(prev.createdAt) : null;
      if (!prev || (d && prevD && d.getTime() > prevD.getTime())) existingByKey.set(n.dedupe_key, n);
    });

    // Ranking con backoff de engagement.
    const engagement: Record<string, number> = {};
    signals.forEach((s) => { engagement[s.key] = 1 / backoffFactor(existingByKey.get(s.key)); });
    let ranked = rankSignals(signals, { now, engagement });
    // Gate de sensibilidad (las críticas/error nunca se filtran).
    ranked = ranked.filter(s => s.type === 'error' || s.priority >= sens.minPriority);

    type Plan = { signal: RankedSignal; existing?: Notification; willEmit: boolean; nextRead: boolean };
    const plans: Plan[] = ranked.map((signal) => {
      const existing = existingByKey.get(signal.key);
      const anchor = renotifyAnchor(existing);
      const effectiveCooldown = signal.cooldownHours * backoffFactor(existing) * sens.cooldownMult;
      const canRenotify = !anchor || differenceInHours(now, anchor) >= effectiveCooldown;
      const willEmit = !existing || canRenotify;
      const nextRead = Boolean(existing?.read) && !canRenotify ? true : false;
      return { signal, existing, willEmit, nextRead };
    });

    // ── Resumen diario (mañana) ──
    const digestExisting = existingByKey.get('daily_digest');
    const digestAnchor = renotifyAnchor(digestExisting);
    const canEmitDigest = !digestAnchor || differenceInHours(now, digestAnchor) >= DIGEST_COOLDOWN_H * sens.cooldownMult;
    const digestSource = ranked.filter(s => s.key !== 'daily_directive_prompt').slice(0, 3);
    const digestApplies = prefs.digest && morning && canEmitDigest && digestSource.length >= 2;
    const digestKeys = new Set(digestApplies ? digestSource.map(s => s.key) : []);

    // ── Escritura ──
    const applyWrites = (opts: {
      digest: { title: string; message: string } | null;
      aiText: { title: string; message: string } | null;
      aiKey: string | null;
    }) => {
      const writes: Array<{ id: string; data: Record<string, any> }> = [];
      const activeKeys = new Set<string>([...signals.map(s => s.key), 'daily_digest']);

      // Notificación de resumen diario.
      if (opts.digest) {
        const shows = (digestExisting?.shows ?? 0) + 1;
        writes.push({
          id: 'smart__daily_digest',
          data: {
            title: opts.digest.title, message: opts.digest.message, type: 'info', read: false,
            createdAt: now.toISOString(), updatedAt: now.toISOString(), link: '/dashboard',
            dedupe_key: 'daily_digest', category: 'general', smart: true, priority: 0.9,
            evidence: {}, actionLabel: 'Ver dashboard', aiGenerated: true, shows, clicked: false,
          },
        });
      }

      plans.forEach(({ signal, existing, willEmit, nextRead }) => {
        const id = `smart__${signal.key}`;
        // Cubierta por el resumen (salvo críticas) → no la duplicamos como suelta.
        const coveredByDigest = digestKeys.has(signal.key) && signal.type !== 'error';
        const suppressedByDigest = opts.digest && (coveredByDigest || signal.key === 'daily_directive_prompt');

        if (suppressedByDigest) {
          if (existing && !existing.read) {
            writes.push({ id, data: { read: true, updatedAt: now.toISOString(), smart: true, dedupe_key: signal.key } });
          }
          return;
        }

        const isAiOne = opts.aiText && opts.aiKey === signal.key;
        const title = isAiOne ? opts.aiText!.title : signal.title;
        const message = isAiOne ? opts.aiText!.message : signal.message;

        if (willEmit) {
          const shows = (existing?.shows ?? 0) + 1;
          const changed = !existing
            || existing.title !== title || existing.message !== message
            || existing.read !== nextRead || existing.shows !== shows;
          if (!changed) return;
          writes.push({
            id,
            data: {
              title, message, type: signal.type, read: nextRead,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              link: signal.link, dedupe_key: signal.key, category: signal.category,
              smart: true, priority: Number(signal.priority.toFixed(3)),
              evidence: signal.evidence, actionLabel: signal.actionLabel || '',
              aiGenerated: Boolean(isAiOne), shows, clicked: false,
            },
          });
        } else if (existing && existing.read !== nextRead) {
          writes.push({ id, data: { read: nextRead, updatedAt: now.toISOString(), smart: true, dedupe_key: signal.key } });
        }
      });

      // Señales que dejaron de aplicar → marcar leídas.
      (allNotifications || []).forEach((n) => {
        if (!n?.smart || !n?.dedupe_key || activeKeys.has(n.dedupe_key) || n.read) return;
        writes.push({ id: n.id || `smart__${n.dedupe_key}`, data: { read: true, updatedAt: now.toISOString(), smart: true, dedupe_key: n.dedupe_key } });
      });

      if (writes.length === 0) { lastRunRef.current = nowTs; return; }
      writes.slice(0, 10).forEach((w) => setDocumentNonBlocking('notifications', w.id, w.data, { merge: true }));

      // Push del SO para alerta urgente nueva.
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        const urgent = writes.find(w => !w.data.read && (w.data.type === 'error' || w.data.type === 'warning') &&
          (String(w.data.dedupe_key).startsWith('state_') || w.data.dedupe_key === 'finance_negative_cashflow'));
        if (urgent) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(urgent.data.title, { body: urgent.data.message, icon: '/icon-192.svg', tag: urgent.id, data: { url: urgent.data.link || '/dashboard' } }).catch(() => {});
          }).catch(() => {});
        }
      }
      lastRunRef.current = nowTs;
    };

    // ── Orquestación de las llamadas IA ──
    if (digestApplies && !aiInFlightRef.current.has('daily_digest')) {
      aiInFlightRef.current.add('daily_digest');
      lastRunRef.current = nowTs;
      generateDailyDigestAction({
        overallState: userData.overallState ?? 'OK',
        signals: digestSource.map(s => ({ category: s.category, title: s.title, evidence: JSON.stringify(s.evidence) })),
      }).then((res) => {
        if (res) applyWrites({ digest: res, aiText: null, aiKey: null });
        else applyWrites({ digest: null, aiText: null, aiKey: null }); // fallback: sin digest, emite individuales
      }).catch(() => applyWrites({ digest: null, aiText: null, aiKey: null }))
        .finally(() => aiInFlightRef.current.delete('daily_digest'));
      return;
    }

    // Insight individual: la señal top que va a emitir y es apta para IA.
    const aiTarget = plans.find(p => p.willEmit && p.signal.aiEligible);
    if (aiTarget && !aiInFlightRef.current.has(aiTarget.signal.key)) {
      aiInFlightRef.current.add(aiTarget.signal.key);
      lastRunRef.current = nowTs;
      generateNotificationInsightAction({
        category: aiTarget.signal.category,
        severity: Number(aiTarget.signal.severity.toFixed(2)),
        fallbackTitle: aiTarget.signal.title,
        fallbackMessage: aiTarget.signal.message,
        evidence: JSON.stringify(aiTarget.signal.evidence),
        actionLabel: aiTarget.signal.actionLabel,
      }).then((res) => applyWrites({ digest: null, aiText: res, aiKey: aiTarget.signal.key }))
        .catch(() => applyWrites({ digest: null, aiText: null, aiKey: null }))
        .finally(() => aiInFlightRef.current.delete(aiTarget.signal.key));
    } else if (!aiTarget) {
      applyWrites({ digest: null, aiText: null, aiKey: null });
    }
  }, [user, isLoading, userData, allNotifications, isAllNotificationsLoading, signals, prefs]);

  // ── Limpieza de duplicados ──
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
      const anyClicked = sorted.some(n => Boolean(n.clicked));
      const maxShows = Math.max(...sorted.map(n => n.shows ?? 0));

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

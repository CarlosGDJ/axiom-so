'use client';

/**
 * Notification system for Axiom.
 *
 * Uses the Web Notification API (works locally without FCM).
 * Schedules two daily reminders at user-configurable times:
 *   - Morning: "Tu briefing matutino está listo"
 *   - Evening: "¿Has completado tus hábitos de hoy?"
 *
 * Preferences are stored in localStorage so they persist across sessions.
 * An interval running every 60s checks if it's time to fire a notification.
 */

import { useEffect, useState, useRef } from 'react';
import { Bell, BellOff, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREFS_KEY      = 'axiom_notif_prefs';
const DISMISSED_KEY  = 'axiom_notif_prompt_dismissed';
const CHECK_INTERVAL = 60 * 1000; // 1 minute

interface NotifPrefs {
  enabled: boolean;
  morning: string;  // "HH:MM"
  evening: string;  // "HH:MM"
  lastMorning: string;  // "YYYY-MM-DD" last day morning was sent
  lastEvening: string;
}

const DEFAULT_PREFS: NotifPrefs = {
  enabled: false,
  morning: '08:30',
  evening: '20:00',
  lastMorning: '',
  lastEvening: '',
};

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: NotifPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function sendNotification(title: string, body: string, url = '/dashboard') {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: title,
  });
  n.onclick = () => {
    window.focus();
    window.location.href = url;
    n.close();
  };
}

function checkAndFire(prefs: NotifPrefs): NotifPrefs {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];
  let updated = { ...prefs };

  if (timeStr === prefs.morning && prefs.lastMorning !== today) {
    sendNotification(
      '☀️ Buenos días — Axiom',
      'Tu briefing matutino del sistema está listo.',
      '/dashboard'
    );
    updated = { ...updated, lastMorning: today };
    savePrefs(updated);
  }

  if (timeStr === prefs.evening && prefs.lastEvening !== today) {
    sendNotification(
      '🌙 Cierre del día — Axiom',
      '¿Has completado tus hábitos de hoy? Revisa tu progreso.',
      '/dashboard/milestones'
    );
    updated = { ...updated, lastEvening: today };
    savePrefs(updated);
  }

  return updated;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationPrompt() {
  const [mounted, setMounted]       = useState(false);
  const [supported, setSupported]   = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [prefs, setPrefs]           = useState<NotifPrefs>(DEFAULT_PREFS);
  const [dismissed, setDismissed]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [justEnabled, setJustEnabled]   = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init — all client-only state reads happen after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const notifSupported = 'Notification' in window;
    setSupported(notifSupported);
    if (!notifSupported) return;
    setPermission(Notification.permission);
    setPrefs(loadPrefs());
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');
  }, []);

  // Notification check loop
  useEffect(() => {
    if (!supported) return;
    if (Notification.permission !== 'granted') return;
    if (!prefs.enabled) return;

    intervalRef.current = setInterval(() => {
      setPrefs((p) => checkAndFire(p));
    }, CHECK_INTERVAL);

    // Check immediately on mount
    setPrefs((p) => checkAndFire(p));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [supported, prefs.enabled, permission]);

  if (!supported) return null;
  if (permission === 'denied') return null;
  if (dismissed && permission !== 'granted') return null;

  const handleRequestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      const newPrefs = { ...prefs, enabled: true };
      savePrefs(newPrefs);
      setPrefs(newPrefs);
      setJustEnabled(true);
      setTimeout(() => setJustEnabled(false), 3000);
      // Test notification
      setTimeout(() => {
        sendNotification(
          '✅ Notificaciones activadas — Axiom',
          `Recibirás un recordatorio a las ${newPrefs.morning} y a las ${newPrefs.evening}.`
        );
      }, 500);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const handleTimeChange = (field: 'morning' | 'evening', value: string) => {
    const updated = { ...prefs, [field]: value };
    savePrefs(updated);
    setPrefs(updated);
  };

  const handleToggle = (enabled: boolean) => {
    const updated = { ...prefs, enabled };
    savePrefs(updated);
    setPrefs(updated);
    if (enabled) {
      setTimeout(() => {
        sendNotification('✅ Recordatorios activados', `Mañana a las ${prefs.morning} y las ${prefs.evening}.`);
      }, 400);
    }
  };

  // ── Already granted: show compact settings ──
  if (permission === 'granted') {
    return (
      <div className="px-4 lg:px-6 pt-3 mb-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">
              Recordatorios: {prefs.enabled ? `${prefs.morning} · ${prefs.evening}` : 'desactivados'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showSettings && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={prefs.morning}
                  onChange={e => handleTimeChange('morning', e.target.value)}
                  className="text-xs border rounded px-1.5 py-0.5 bg-background w-24"
                  aria-label="Hora matutina"
                />
                <input
                  type="time"
                  value={prefs.evening}
                  onChange={e => handleTimeChange('evening', e.target.value)}
                  className="text-xs border rounded px-1.5 py-0.5 bg-background w-24"
                  aria-label="Hora vespertina"
                />
              </div>
            )}
            <button
              onClick={() => setShowSettings(s => !s)}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              {showSettings ? 'Guardar' : 'Configurar'}
            </button>
            <button
              onClick={() => handleToggle(!prefs.enabled)}
              className={`text-[10px] font-medium hover:underline ${prefs.enabled ? 'text-muted-foreground' : 'text-primary'}`}
            >
              {prefs.enabled ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Permission not yet requested: show prompt card ──
  return (
    <div className="px-4 lg:px-6 pt-3 mb-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Activa los recordatorios de hábitos</p>
            <p className="text-[11px] text-muted-foreground">Notificaciones matutinas y de cierre del día, configurables.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-7 text-xs px-3"
            onClick={handleRequestPermission}
          >
            Activar
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded p-1 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Download, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_DISMISSED_KEY = 'axiom_install_dismissed';

export function PwaInit() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // En desarrollo, desregistramos cualquier service worker y limpiamos las cachés para evitar el caching y asegurar HMR
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) console.log('[SW] Service Worker desregistrado con éxito en desarrollo.');
            });
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name).then(() => {
              console.log(`[Cache] Caché '${name}' eliminada con éxito en desarrollo.`);
            });
          }
        });
      }
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Check for an already-waiting worker (user had the app open across an update)
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdateBanner(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdateBanner(true);
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));

    // Reload when the new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  // Tras un redeploy, el HTML cacheado puede referenciar chunks con hash antiguo
  // que ya no existen → ChunkLoadError al navegar (p. ej. a /finances). Recargamos
  // una sola vez para coger el HTML nuevo; el flag evita bucles si el fallo persiste.
  useEffect(() => {
    const RELOAD_KEY = 'axiom_chunk_reloaded';
    const isChunkError = (msg: unknown) =>
      typeof msg === 'string' &&
      (msg.includes('ChunkLoadError') || msg.includes('Loading chunk') || msg.includes('Loading CSS chunk'));

    const recover = (reason: unknown) => {
      const msg = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
      if (!isChunkError(msg)) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return; // ya recargamos una vez
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => recover(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => recover(e.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    // Si la página vive ~8s sin volver a fallar, damos el deploy por bueno y
    // limpiamos el flag para permitir recuperación en el PRÓXIMO deploy. No lo
    // limpiamos al instante: así, si el HTML nuevo también falla, no entra en bucle.
    const clearTimer = window.setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 8000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissed) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone === true);
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowInstallBanner(true), 8000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
  };

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdateBanner(false);
  };

  return (
    <>
      {/* Update available banner */}
      {showUpdateBanner && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50">
          <div className="flex items-center gap-3 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Nueva versión disponible</p>
              <p className="text-[11px] text-muted-foreground">Recarga para actualizar Axiom</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" className="h-7 text-xs px-3" onClick={handleUpdate}>
                Recargar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setShowUpdateBanner(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Install prompt banner */}
      {showInstallBanner && installPrompt && !showUpdateBanner && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50">
          <div className="flex items-center gap-3 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-3.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Instalar Axiom</p>
              <p className="text-[11px] text-muted-foreground">Acceso directo desde tu pantalla de inicio</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" className="h-7 text-xs px-3" onClick={handleInstall}>
                Instalar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleDismissInstall}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

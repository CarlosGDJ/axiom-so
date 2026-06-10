'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, WifiOff, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-redirect when connection is restored
  useEffect(() => {
    if (isOnline) {
      const t = setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = '/dashboard';
      } else {
        setRetrying(false);
      }
    }, 800);
  };

  if (isOnline) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Conexión restaurada</h1>
            <p className="text-muted-foreground text-sm">Volviendo al dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full">

        {/* Icon */}
        <div className="relative">
          <BrainCircuit className="h-20 w-20 text-primary/30" />
          <WifiOff className="absolute -bottom-1 -right-1 h-7 w-7 text-muted-foreground bg-background rounded-full p-1 border" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Axiom está offline</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No hay conexión a Internet. Axiom detectará la reconexión automáticamente y sincronizará tus datos.
          </p>
        </div>

        {/* What happens offline */}
        <div className="w-full rounded-xl border bg-muted/30 p-4 space-y-3 text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Mientras estás offline
          </p>
          <div className="space-y-2">
            {[
              { icon: CheckCircle2, text: 'Tus datos locales están disponibles', ok: true },
              { icon: CheckCircle2, text: 'Los registros se encolarán en Firestore', ok: true },
              { icon: Clock, text: 'La sincronización ocurre al reconectarte', ok: true },
            ].map(({ icon: Icon, text, ok }) => (
              <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${ok ? 'text-green-500' : 'text-orange-500'}`} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Retry */}
        <Button
          onClick={handleRetry}
          disabled={retrying}
          variant="outline"
          className="w-full gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Comprobando conexión...' : 'Reintentar conexión'}
        </Button>
      </div>
    </div>
  );
}

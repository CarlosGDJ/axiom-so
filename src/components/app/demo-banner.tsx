'use client';

import { useUser } from '@/firebase';
import { FlaskConical, X } from 'lucide-react';
import { useState } from 'react';

const DEMO_EMAIL = 'demo@axiom.app';

export function DemoBanner() {
  const { user } = useUser();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || user?.email !== DEMO_EMAIL) return null;

  return (
    <div className="px-4 lg:px-6 pt-4 mb-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-2 text-amber-700 dark:text-amber-400">
        <div className="flex items-center gap-2 text-xs font-medium">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" />
          <span>
            Modo Demo — estás viendo 90 días de datos simulados.
            Los cambios no son persistentes entre sesiones.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Cerrar aviso demo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

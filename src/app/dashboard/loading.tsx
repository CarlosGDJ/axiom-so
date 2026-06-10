'use client';

import { useEffect, useState } from 'react';
import { HeartPulse } from 'lucide-react';

const WELLNESS_MESSAGES = [
  'Respira profundo: 4 segundos al inhalar, 6 al exhalar.',
  'Dormir bien hoy mejora tu enfoque de mañana.',
  'Un paseo corto también cuenta como autocuidado.',
  'Hidratarte puede subir tu energía mental.',
  'Pequeños hábitos diarios vencen grandes impulsos.',
  'Tu progreso no es lineal, pero sí acumulativo.',
  'Descansar a tiempo también es productividad.',
  'Prioriza una tarea clave antes de abrir más frentes.',
];

export default function DashboardLoading() {
  // Keep first render deterministic to avoid SSR/CSR hydration mismatch.
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(Math.floor(Math.random() * WELLNESS_MESSAGES.length));

    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % WELLNESS_MESSAGES.length);
    }, 2600);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4 text-center">
      <div className="flex flex-col items-center">
        <HeartPulse className="h-16 w-16 text-primary animate-pulse" />
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl font-headline mt-4">
          Cargando tu Axiom...
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl mt-2">
          Analizando tus datos para ofrecerte las últimas ideas.
        </p>
        <p className="max-w-[560px] text-sm md:text-base text-primary/90 mt-3 font-medium animate-in fade-in duration-500">
          {WELLNESS_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  );
}

'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'hud',
    title: 'HUD de Biomarcadores',
    content: 'Tu panel de control biológico en tiempo real: dopamina, serotonina, cortisol, foco, energía y sueño — calculados automáticamente a partir de tus registros.',
    position: 'bottom',
  },
  {
    target: 'overview',
    title: 'Estado del Sistema',
    content: 'El motor Axiom calcula tu estado global (ÓPTIMO / OK / RIESGO / CRÍTICO) y detecta las variables dominantes que más te afectan hoy. El panel derecho muestra tu motor de causalidad (KAIROS).',
    position: 'bottom',
  },
  {
    target: 'quick-log',
    title: 'Registro Rápido',
    content: 'Tu herramienta principal. Pulsa "+" para registrar cualquier evento: "dormí 7 horas", "hice ejercicio", "me siento ansioso". Puedes escribir en lenguaje natural — la IA lo interpreta sola.',
    position: 'top',
  },
  {
    target: 'areas-nav',
    title: 'Áreas de Vida',
    content: 'Axiom monitoriza 8 dimensiones: Sueño, Salud física, Relaciones, Dopamina, Creatividad, Estudios, Propósito y Entorno. Cada área tiene métricas, gráficas y hábitos propios.',
    position: 'right',
  },
  {
    target: 'chat-nav',
    title: 'Chat con IA',
    content: 'Habla con Axiom IA para analizar tus patrones, entender por qué estás en cierto estado, o pedir estrategias de recuperación personalizadas basadas en tus datos reales.',
    position: 'right',
  },
  {
    target: 'analytics-nav',
    title: 'Analíticas',
    content: 'Descubre qué hábitos impactan más en tu rendimiento. El sistema detecta correlaciones entre variables y muestra tendencias históricas de 30 a 90 días.',
    position: 'right',
  },
];

const STORAGE_KEY = 'axiom-tour-seen-v1';

interface TourContextValue {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const forceTour = sessionStorage.getItem('axiom-launch-tour');
    if (forceTour) {
      sessionStorage.removeItem('axiom-launch-tour');
      localStorage.removeItem(STORAGE_KEY);
      const t = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(t);
    }
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setIsActive(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(s => Math.min(TOUR_STEPS.length - 1, s + 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(0, s - 1));
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  return (
    <TourContext.Provider value={{ isActive, currentStep, steps: TOUR_STEPS, startTour, nextStep, prevStep, endTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}

'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

// ── Dashboard ──────────────────────────────────────────────────────────────
const DASHBOARD_STEPS: TourStep[] = [
  {
    target: 'hud',
    title: 'HUD de Biomarcadores',
    content: 'Tu panel de control biológico en tiempo real: dopamina, serotonina, cortisol, foco, energía y sueño — calculados automáticamente a partir de tus registros.',
    position: 'bottom',
  },
  {
    target: 'overview',
    title: 'Estado del Sistema',
    content: 'El motor Axiom calcula tu estado global (ÓPTIMO / OK / RIESGO / CRÍTICO) y detecta las variables dominantes que más te afectan hoy.',
    position: 'bottom',
  },
  {
    target: 'quick-log',
    title: 'Registro Rápido',
    content: 'Tu herramienta principal. Pulsa "+" para registrar cualquier evento: "dormí 7 horas", "hice ejercicio", "me siento ansioso". La IA lo interpreta sola.',
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

// ── Perfil ─────────────────────────────────────────────────────────────────
const PROFILE_STEPS: TourStep[] = [
  {
    target: 'profile-photo',
    title: 'Foto de perfil',
    content: 'Personaliza tu avatar con una foto tomada desde la cámara o subida desde tu dispositivo. Se usa en el dashboard y en las notificaciones.',
    position: 'bottom',
  },
  {
    target: 'profile-params',
    title: 'Parámetros biológicos',
    content: 'Configura tu perfil físico y de personalidad. Estos datos calibran el motor de Axiom para que las métricas sean precisas contigo.',
    position: 'top',
  },
  {
    target: 'profile-calibration',
    title: 'Calibración automática',
    content: 'A medida que registras datos, el sistema ajusta tu perfil de sensibilidad automáticamente. Cuantos más eventos registres, más preciso será Axiom.',
    position: 'top',
  },
];

// ── Finanzas ───────────────────────────────────────────────────────────────
const FINANCE_STEPS: TourStep[] = [
  {
    target: 'finances-add',
    title: 'Registrar movimiento',
    content: 'Añade ingresos y gastos. Axiom calcula tu flujo de caja, detecta patrones de gasto impulsivo y monitoriza tu salud financiera en tiempo real.',
    position: 'bottom',
  },
  {
    target: 'finances-tabs',
    title: 'Módulos de finanzas',
    content: 'Navega entre Resumen (flujo neto), Pockets (ahorro por objetivo), Ingresos, Evolución temporal, Movimientos y Deuda. Cada sección tiene métricas propias.',
    position: 'bottom',
  },
];

// ── Habit Tracker ──────────────────────────────────────────────────────────
const MILESTONES_STEPS: TourStep[] = [
  {
    target: 'milestones-habits',
    title: 'Check diario de hábitos',
    content: 'Marca tus hábitos completados cada día. Cada check suma XP, activa multiplicadores de racha y refuerza las áreas de vida conectadas.',
    position: 'bottom',
  },
  {
    target: 'milestones-goals',
    title: 'Objetivos activos',
    content: 'Los hitos estratégicos te permiten fijar metas concretas vinculadas a tus sistemas y habilidades. Al completarlos, el motor registra el progreso.',
    position: 'top',
  },
];

// ── Áreas de vida (genérico) ───────────────────────────────────────────────
const AREA_STEPS: TourStep[] = [
  {
    target: 'area-header',
    title: 'Estado del área',
    content: 'Cada área muestra su puntuación (0-100) y tendencia. Verde = óptimo, amarillo = riesgo, rojo = crítico. El valor se recalcula en tiempo real con cada registro.',
    position: 'bottom',
  },
  {
    target: 'area-variables',
    title: 'Variables del área',
    content: 'Las variables son los factores que Axiom monitoriza en este dominio. Regístralos desde el botón "+" para que el sistema recalcule tu estado.',
    position: 'top',
  },
  {
    target: 'quick-log',
    title: 'Registro rápido',
    content: 'El botón flotante "+" es tu herramienta principal para registrar cualquier dato de esta área. Puedes escribir en lenguaje natural.',
    position: 'top',
  },
];

// ── Mapa pathname → steps ──────────────────────────────────────────────────
const PAGE_STEPS: { prefix: string; steps: TourStep[] }[] = [
  { prefix: '/dashboard/profile',     steps: PROFILE_STEPS },
  { prefix: '/dashboard/finances',    steps: FINANCE_STEPS },
  { prefix: '/dashboard/milestones',  steps: MILESTONES_STEPS },
  { prefix: '/dashboard/sleep',       steps: AREA_STEPS },
  { prefix: '/dashboard/physical',    steps: AREA_STEPS },
  { prefix: '/dashboard/relations',   steps: AREA_STEPS },
  { prefix: '/dashboard/dopamine',    steps: AREA_STEPS },
  { prefix: '/dashboard/creativity',  steps: AREA_STEPS },
  { prefix: '/dashboard/studies',     steps: AREA_STEPS },
  { prefix: '/dashboard/purpose',     steps: AREA_STEPS },
  { prefix: '/dashboard/environment', steps: AREA_STEPS },
  { prefix: '/dashboard',             steps: DASHBOARD_STEPS },
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
  const pathname = usePathname();

  const steps = useMemo(() => {
    const match = PAGE_STEPS.find(p => pathname.startsWith(p.prefix));
    return match?.steps ?? DASHBOARD_STEPS;
  }, [pathname]);

  // End tour and reset step when navigating to a different page
  useEffect(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, [pathname]);

  // Auto-start tour on first dashboard visit
  useEffect(() => {
    const forceTour = sessionStorage.getItem('axiom-launch-tour');
    if (forceTour) {
      sessionStorage.removeItem('axiom-launch-tour');
      localStorage.removeItem(STORAGE_KEY);
      const t = setTimeout(() => setIsActive(true), 2500);
      return () => clearTimeout(t);
    }
    if (pathname === '/dashboard' && !localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setIsActive(true), 2500);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(s => Math.min(steps.length - 1, s + 1));
  }, [steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(0, s - 1));
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    if (pathname === '/dashboard') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }, [pathname]);

  return (
    <TourContext.Provider value={{ isActive, currentStep, steps, startTour, nextStep, prevStep, endTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}

'use client';

import { Zap, Loader2 } from 'lucide-react';
import { useUserData } from '@/hooks/use-user-data';
import ImpactSimulator from '@/components/app/impact-simulator';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import NavigationReady from '@/components/app/navigation-ready';

export default function SimulatorPage() {
  const { data: userData, isLoading } = useUserData();

  if (isLoading && !userData) return <AreaPageSkeleton />;
  if (!userData) return <AreaPageSkeleton />;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <NavigationReady />
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Simulador de Impacto
        </h1>
        <p className="text-sm text-muted-foreground">
          Proyecta el efecto biológico de cualquier acción antes de ejecutarla. Curva de decaimiento real, biomarcadores y modelo clínico V2.
        </p>
      </div>
      <ImpactSimulator userData={userData} />
    </div>
  );
}


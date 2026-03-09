'use client';

import { useState, useMemo } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DebtSnowballStrategy from '@/components/app/debt-strategy/debt-snowball-strategy';
import type { DashboardConfig } from '@/lib/types';
import DashboardLoading from '../loading';
import NavigationReady from '@/components/app/navigation-ready';

// This is the strategy we are currently implementing.
const snowballStrategy = {
    method: 'Bola de nieve',
    id: 'snowball',
    prioritizes: 'Motivación',
    idealFor: 'Bloqueo emocional',
    explanation: 'Este método se enfoca en pagar primero la deuda más pequeña, sin importar la tasa de interés. Cada vez que eliminas una deuda, ganas un impulso de motivación (una "pequeña victoria") que te anima a seguir con la siguiente. Es excelente si te sientes abrumado y necesitas ver progreso rápido para no rendirte.',
    badgeVariant: 'secondary' as const,
    component: DebtSnowballStrategy,
};

export default function DebtStrategyPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { data: userData, isLoading: isUserDataLoading } = useUserData();
  const [localStrategy, setLocalStrategy] = useState<string | null>(null);
  const configRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/dashboardConfig`) : null),
    [user, firestore]
  );
  const { data: dashboardConfig, isLoading: isConfigLoading } = useCollection<DashboardConfig>(configRef);

  const savedStrategy = useMemo(() => {
    return dashboardConfig?.find(c => c.key === 'debt_strategy')?.value;
  }, [dashboardConfig]);

  const handleSelectStrategy = (strategyId: string) => {
    if (!user || !firestore) return;
    
    const configDocRef = doc(firestore, `users/${user.uid}/dashboardConfig`, 'debt_strategy');
    setDocumentNonBlocking(configDocRef, {
      key: 'debt_strategy',
      value: strategyId
    });
    setLocalStrategy(strategyId);
  };
  
  const effectiveStrategy = localStrategy || savedStrategy;

  // The Suspense boundary in layout.tsx will handle the loading state, 
  // so we can return null while data is loading.
  if (isUserDataLoading || isConfigLoading) {
    return <DashboardLoading />;
  }

  // If a strategy is selected (either from state or Firestore), show the strategy component.
  if (effectiveStrategy === 'snowball' && userData) {
    const activeDebts = userData.debts?.filter(d => d.estado_deuda !== 'Liquidada') || [];
    const transactions = userData.transactions || [];
    return (
      <>
        <NavigationReady />
        <DebtSnowballStrategy debts={activeDebts} transactions={transactions} />
      </>
    );
  }
  
  // Otherwise, show the strategy selection card.
  return (
    <div className="space-y-8">
      <NavigationReady />
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight">Elige tu Estrategia de Deuda</h2>
        <p className="text-muted-foreground mt-2">
            Para empezar, recomendamos el método "Bola de Nieve". Está diseñado para crear momentum y darte victorias rápidas, lo que es clave para mantener la motivación.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="flex flex-col shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{snowballStrategy.method}</CardTitle>
            <CardDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={snowballStrategy.badgeVariant}>Prioriza: {snowballStrategy.prioritizes}</Badge>
                  <Badge variant="secondary">Ideal para: {snowballStrategy.idealFor}</Badge>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
             <p className="text-base">{snowballStrategy.explanation}</p>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => handleSelectStrategy(snowballStrategy.id)}
             >
              Aplicar Estrategia de Bola de Nieve
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

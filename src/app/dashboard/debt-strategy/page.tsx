'use client';

import { useState, useMemo } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DebtSnowballStrategy from '@/components/app/debt-strategy/debt-snowball-strategy';
import DebtAvalancheStrategy from '@/components/app/debt-strategy/debt-avalanche-strategy';
import DebtStrategyComparison from '@/components/app/debt-strategy/debt-strategy-comparison';
import type { DashboardConfig } from '@/lib/types';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import NavigationReady from '@/components/app/navigation-ready';
import { Snowflake, Flame, BarChart2 } from 'lucide-react';

export default function DebtStrategyPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { data: userData, isLoading: isUserDataLoading } = useUserData();
  const [localStrategy, setLocalStrategy] = useState<string | null>(null);

  const configRef = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/dashboardConfig`) : null),
    [user, firestore],
  );
  const { data: dashboardConfig, isLoading: isConfigLoading } = useCollection<DashboardConfig>(configRef);

  const savedStrategy = useMemo(
    () => dashboardConfig?.find(c => c.key === 'debt_strategy')?.value,
    [dashboardConfig],
  );

  const effectiveStrategy = localStrategy || savedStrategy;

  const handleSelectStrategy = (strategyId: 'snowball' | 'avalanche') => {
    if (!user || !firestore) return;
    const configDocRef = doc(firestore, `users/${user.uid}/dashboardConfig`, 'debt_strategy');
    setDocumentNonBlocking(configDocRef, { key: 'debt_strategy', value: strategyId });
    setLocalStrategy(strategyId);
  };

  if (isUserDataLoading || isConfigLoading) return <AreaPageSkeleton />;

  const activeDebts = userData?.debts?.filter(d => d.estado_deuda !== 'Liquidada') || [];
  const transactions = userData?.transactions || [];

  return (
    <div className="space-y-6">
      <NavigationReady />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estrategia de Deuda</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compara métodos, elige tu estrategia y sigue el plan de liquidación.
        </p>
      </div>

      <Tabs defaultValue={effectiveStrategy || 'comparison'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            Comparar
          </TabsTrigger>
          <TabsTrigger value="snowball" className="gap-2">
            <Snowflake className="h-4 w-4" />
            Bola de Nieve
          </TabsTrigger>
          <TabsTrigger value="avalanche" className="gap-2">
            <Flame className="h-4 w-4" />
            Avalanche
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <DebtStrategyComparison
            debts={activeDebts}
            onSelect={handleSelectStrategy}
            selected={effectiveStrategy}
          />
        </TabsContent>

        <TabsContent value="snowball">
          <DebtSnowballStrategy debts={activeDebts} transactions={transactions} />
        </TabsContent>

        <TabsContent value="avalanche">
          <DebtAvalancheStrategy debts={activeDebts} transactions={transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


'use client';

import React, { useState } from 'react';
import OverviewCard from '@/components/app/overview-card';
import LoggingSection from '@/components/app/logging-section';
import ProtocolRecommendations from '@/components/app/protocol-recommendations';
import AIInsights from '@/components/app/ai-insights';
import ImpactSimulator from '@/components/app/impact-simulator';
import MorningBriefing from '@/components/app/morning-briefing';
import { useUserData } from '@/hooks/use-user-data';
import ScoreByAreaChart from '@/components/app/charts/score-by-area-chart';
import DailyScoreChart from '@/components/app/charts/daily-score-chart';
import IncomeExpenseChart from '@/components/app/charts/income-expense-chart';
import RelationshipEnergyChart from '@/components/app/charts/relationship-energy-chart';
import DashboardLoading from './loading';
import CrisisProtocolDisplay from '@/components/app/crisis-protocol-display';
import NavigationReady from '@/components/app/navigation-ready';

export default function DashboardPage() {
  const { data: userData, isLoading } = useUserData();
  const [showAIProtocol, setShowAIProtocol] = useState(false);

  const isPremium = true; 

  if (isLoading && !userData) {
    return <DashboardLoading />;
  }

  if (!userData) {
    return <DashboardLoading />;
  }
  
  if (userData.overallState === 'CRITICO' && showAIProtocol) {
    return (
        <div className="container py-6">
            <NavigationReady />
            <CrisisProtocolDisplay 
                userData={userData} 
                onExit={() => setShowAIProtocol(false)} 
            />
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NavigationReady />
        {/* Fila Superior: Misión Diaria */}
        <div className="col-span-1 lg:col-span-2">
            <MorningBriefing userData={userData} />
        </div>

        {/* Fila Media: Resumen y Bitácora */}
        <OverviewCard
            overallState={userData.overallState}
            dominantVariables={userData.dominantVariables}
            onActivateProtocol={() => setShowAIProtocol(true)}
            userData={userData}
        />
        <LoggingSection 
            suggestions={[]} 
            isLoading={false}
            isPremium={isPremium}
        />

        {/* Simulador de Impacto - Dejado comentado por petición del usuario */}
        {/* 
        <div className="col-span-1 lg:col-span-2">
            <ImpactSimulator userData={userData} />
        </div> 
        */}

        {/* Fila de IA: Recomendaciones e Insights */}
        <ProtocolRecommendations 
            recommendations={[]} 
            isLoading={false}
            isPremium={isPremium}
        />
        <AIInsights 
          userData={userData}
          initialInsight={null}
          isLoadingInitialInsight={false}
          isPremium={isPremium}
        />

        {/* Analíticas */}
        <div className="col-span-1 lg:col-span-2">
            <h2 className="mb-4 text-2xl font-bold tracking-tight">Resumen Analítico</h2>
        </div>
        <ScoreByAreaChart data={userData.kpis.scoresByArea || []} />
        <DailyScoreChart data={userData.kpis.dailyScoreTrend} />
        <IncomeExpenseChart 
            income={userData.kpis.monthlyFinancials.totalIncome}
            expenses={userData.kpis.monthlyFinancials.totalExpenses}
        />
        <RelationshipEnergyChart data={userData.kpis.relationshipEnergy} />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useUserData } from '@/hooks/use-user-data';
import DashboardLoading from './loading';
import DashboardSkeleton from '@/components/app/dashboard-skeleton';
import NavigationReady from '@/components/app/navigation-ready';
import CrisisProtocolDisplay from '@/components/app/crisis-protocol-display';
import { Button } from '@/components/ui/button';

import BiostatsHudStrip from '@/components/app/biostats-hud-strip';
import OverviewCard from '@/components/app/overview-card';
import KairosLivePanel from '@/components/app/kairos-live-panel';
import HabitMomentumCard from '@/components/app/habit-momentum-card';
import ClinicalAxesCard from '@/components/app/clinical-axes-card';
import DailyScoreChart from '@/components/app/charts/daily-score-chart';
import ScoreByAreaChart from '@/components/app/charts/score-by-area-chart';
import FinancesKpiCard from '@/components/app/finances-kpi-card';
import WeeklySummaryCard from '@/components/app/weekly-summary-card';
import HormonalForecastCard from '@/components/app/hormonal-forecast-card';
import MorningBriefing from '@/components/app/morning-briefing';
import FirstEventCard from '@/components/app/first-event-card';
import { FlaskConical, MessageSquare } from 'lucide-react';
import type { UserData } from '@/lib/types';

function TodayStrip({ userData }: { userData: UserData }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const lowestArea = [...(userData.kpis?.scoresByArea ?? [])]
    .sort((a, b) => a.score - b.score)[0];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground capitalize">{dateStr}</p>
        {lowestArea && (
          <p className="text-[11px] text-muted-foreground">
            Foco sugerido:{' '}
            <span className="font-semibold text-foreground">{lowestArea.area}</span>
            <span className="ml-1 text-orange-500 font-mono">{lowestArea.score}/100</span>
          </p>
        )}
      </div>
      <Link href="/dashboard/simulator">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <FlaskConical className="h-3 w-3" />
          Simular
        </Button>
      </Link>
      <Link href="/dashboard/chat">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <MessageSquare className="h-3 w-3" />
          Preguntar IA
        </Button>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { data: userData, isLoading } = useUserData();
  const [showAIProtocol, setShowAIProtocol] = useState(false);

  if (isLoading && !userData) return <DashboardSkeleton />;
  if (!userData) return <DashboardLoading />;

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
    <div className="space-y-5 pb-10">
      <NavigationReady />

      {/* ── HUD biométrico ── */}
      <div data-tour="hud">
        <BiostatsHudStrip
          rpgStats={userData.rpg_stats}
          overallState={userData.overallState}
          scoreVelocity={userData.kpis.scoreVelocity}
        />
      </div>

      {/* ── Fecha + acceso rápido ── */}
      <TodayStrip userData={userData} />

      {/* ── Estado del sistema + Motor KAIROS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-tour="overview">
        <div className="min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:drop-shadow-lg rounded-xl">
          <OverviewCard
            overallState={userData.overallState}
            dominantVariables={userData.dominantVariables}
            onActivateProtocol={() => setShowAIProtocol(true)}
            userData={userData}
          />
        </div>
        <div className="min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:drop-shadow-lg rounded-xl">
          <KairosLivePanel userData={userData} />
        </div>
      </div>

      {/* ── Primer evento (onboarding post-wizard) ── */}
      {(userData.events ?? []).length === 0 && <FirstEventCard />}

      {/* ── Directiva del día ── */}
      <MorningBriefing userData={userData} />

      {/* ── Momentum conductual ── */}
      <HabitMomentumCard userData={userData} />

      {/* ── Ejes clínicos (solo con confianza suficiente) ── */}
      {userData.clinical_v2?.enabled && (userData.clinical_v2.confidence ?? 0) >= 0.3 && (
        <ClinicalAxesCard clinical={userData.clinical_v2} />
      )}

      {/* ── Resumen semanal + Proyección hormonal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-w-0 overflow-hidden"><WeeklySummaryCard userData={userData} /></div>
        <div className="min-w-0 overflow-hidden"><HormonalForecastCard userData={userData} /></div>
      </div>

      {/* ── Tendencia 30 días ── */}
      <DailyScoreChart data={userData.kpis.dailyScoreTrend} days={30} />

      {/* ── Áreas de vida + Finanzas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:drop-shadow-lg rounded-xl">
          <ScoreByAreaChart data={userData.kpis.scoresByArea || []} />
        </div>
        <div className="min-w-0 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:drop-shadow-lg rounded-xl">
          <FinancesKpiCard monthlyFinancials={userData.kpis.monthlyFinancials} />
        </div>
      </div>
    </div>
  );
}

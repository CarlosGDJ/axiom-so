'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useUserProfile } from '@/hooks/use-mongo-collection';
import { useUser } from '@/hooks/use-session-user';
import type {
  UserData,
  UserProfile,
  PlayerProfile,
  Area,
  Hormone,
  Variable,
  Event,
  Transaction,
  Interaction,
  ImpactMatrix,
  Skill,
  System,
  Habit,
  Protocol,
  State,
  ScoreByArea,
  DailyScore,
  Relation,
  Account,
  Debt,
  MonthlyFinancials,
  ComputedGlobalState,
  ComputedArea,
  ComputedHormone,
  ComputedDailyScore,
  Milestone,
  RPGStats,
} from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { computeScoreVelocity } from '@/lib/velocity';

function abbreviateAreaName(name: string): string {
  if (name.includes('/')) return name.split('/')[0];
  return name.substring(0, 12);
}

function deduplicate<T>(items: T[], key: keyof T): T[] {
  const seen = new Set();
  return items.filter((item) => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

// Placeholder mostrado solo antes del primer cálculo del motor. Alineado con la
// línea base que produce el motor para un usuario sin eventos (núcleo ~60-65,
// cortisol/carga bajos) para que la transición predefinido→real sea suave y no
// el salto brusco que se veía antes (75 uniforme → ~50 reales).
const DEFAULT_STATS: RPGStats = {
  dopamina: 62,
  serotonina: 62,
  cortisol: 22,
  foco: 62,
  energia: 62,
  sueno: 62,
  conexion_social: 62,
  carga_dopaminergica: 12,
  player_score: 68,
};

export function useUserDataImpl() {
  const { user, uid } = useUser();

  const active = !!uid;

  // --- RAW DATA FETCHING (SWR) ---
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile<UserProfile>(active);
  const { data: playerProfile, isLoading: isLoadingPlayerProfile } = useDoc<PlayerProfile>(active ? 'playerProfile' : null, active ? 'main-profile' : null);

  const { data: rawAreas,        isLoading: isLoadingAreas        } = useCollection<Area>(active ? 'areas' : null);
  const { data: rawHormones,     isLoading: isLoadingHormones     } = useCollection<Hormone>(active ? 'hormones' : null);
  const { data: rawVariables,    isLoading: isLoadingVariables    } = useCollection<Variable>(active ? 'variables' : null);
  const { data: rawImpactMatrix, isLoading: isLoadingImpactMatrix } = useCollection<ImpactMatrix>(active ? 'impactMatrix' : null);
  const { data: rawSkills,       isLoading: isLoadingSkills       } = useCollection<Skill>(active ? 'skills' : null);
  const { data: rawSystems,      isLoading: isLoadingSystems      } = useCollection<System>(active ? 'systems' : null);
  const { data: rawHabits,       isLoading: isLoadingHabits       } = useCollection<Habit>(active ? 'habits' : null);
  const { data: rawMilestones,   isLoading: isLoadingMilestones   } = useCollection<Milestone>(active ? 'milestones' : null);
  const { data: rawProtocols,    isLoading: isLoadingProtocols    } = useCollection<Protocol>(active ? 'protocols' : null);
  const { data: rawStates,       isLoading: isLoadingStates       } = useCollection<State>(active ? 'states' : null);
  const { data: relations,       isLoading: isLoadingRelations    } = useCollection<Relation>(active ? 'relations' : null);
  const { data: accounts,        isLoading: isLoadingAccounts     } = useCollection<Account>(active ? 'financialAccounts' : null);
  const { data: rawDebts,        isLoading: isLoadingDebts        } = useCollection<Debt>(active ? 'debts' : null);

  const { data: rawTransactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(
    active ? 'transactions' : null,
    { orderBy: 'fecha', direction: 'desc', limit: 300 }
  );
  const { data: interactions, isLoading: isLoadingInteractions } = useCollection<Interaction>(
    active ? 'interactions' : null,
    { orderBy: 'fecha', direction: 'desc', limit: 150 }
  );
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(
    active ? 'events' : null,
    { orderBy: 'fecha', direction: 'desc', limit: 300 }
  );

  // --- COMPUTED DATA FETCHING ---
  const { data: computedGlobalState, isLoading: isLoadingGlobalState, isValidating: isValidatingGlobalState } = useDoc<ComputedGlobalState>(
    active ? 'computed_global_state' : null,
    active ? 'latest' : null
  );
  const { data: computedAreas,        isLoading: isLoadingComputedAreas,       isValidating: isValidatingComputedAreas       } = useCollection<ComputedArea>(active ? 'computed_areas' : null);
  const { data: computedHormones,     isLoading: isLoadingComputedHormones,    isValidating: isValidatingComputedHormones    } = useCollection<ComputedHormone>(active ? 'computed_hormones' : null);
  const { data: computedDailyScores,  isLoading: isLoadingComputedDailyScores  } = useCollection<ComputedDailyScore>(
    active ? 'computed_daily_score' : null,
    { orderBy: 'fecha', direction: 'desc', limit: 90 }
  );

  const isLoading =
    isLoadingProfile ||
    isLoadingPlayerProfile ||
    isLoadingAreas ||
    isLoadingHormones ||
    isLoadingVariables ||
    isLoadingTransactions ||
    isLoadingInteractions ||
    isLoadingEvents ||
    isLoadingRelations ||
    isLoadingAccounts ||
    isLoadingDebts ||
    isLoadingGlobalState ||
    isLoadingComputedAreas ||
    isLoadingComputedHormones ||
    isLoadingComputedDailyScores ||
    isLoadingImpactMatrix ||
    isLoadingSkills ||
    isLoadingSystems ||
    isLoadingHabits ||
    isLoadingMilestones ||
    isLoadingProtocols ||
    isLoadingStates;

  const currentData: UserData | null = useMemo(() => {
    if (!uid || !user) return null;

    const safeUserProfile: UserProfile = userProfile || {
      id: uid,
      uid,
      email: user.email ?? '',
      displayName: user.name ?? '',
      photoURL: user.image ?? '',
      axiomAvatarDataUrl: '',
      createdAt: new Date().toISOString(),
    };

    const safeAreas             = rawAreas        || [];
    const safeHormones          = rawHormones      || [];
    const safeVariables         = rawVariables     || [];
    const safeTransactions      = rawTransactions  || [];
    const safeAllTransactions   = rawTransactions  || [];
    const safeDebtTransactions  = (rawTransactions || []).filter((t) => t.categoria === 'Deudas');
    const safeInteractions      = interactions     || [];
    const safeEvents            = events           || [];
    const safeRelations         = relations        || [];
    const safeAccounts          = accounts         || [];
    const safeDebts             = rawDebts         || [];
    const safeComputedAreas     = computedAreas    || [];
    const safeComputedHormones  = computedHormones || [];
    const safeComputedDailyScores = computedDailyScores || [];
    const safeImpactMatrix      = rawImpactMatrix  || [];
    const safeSkills            = rawSkills        || [];
    const safeSystems           = rawSystems       || [];
    const safeHabits            = rawHabits        || [];
    const safeMilestones        = rawMilestones    || [];
    const safeProtocols         = rawProtocols     || [];
    const safeStates            = rawStates        || [];

    const areas    = deduplicate(safeAreas,    'area_id');
    const hormones = deduplicate(safeHormones, 'hormone_id');
    const variables = deduplicate(safeVariables, 'var_id');
    const baseDebts = deduplicate(safeDebts,   'debt_id');

    // --- DYNAMIC DEBT CALCULATION ---
    const debts = baseDebts.map((debt) => {
      const relevantTransactions = safeDebtTransactions.filter((t) => t.deuda_id === debt.debt_id);
      const totalPaidInApp = relevantTransactions.reduce((acc, t) => acc + Math.abs(t.monto), 0);
      const principal = Math.max(1, debt.principal_inicial || 1);
      const currentBalance = Math.max(0, debt.saldo_actual || 0);
      const pendingBalance = Math.max(0, currentBalance - totalPaidInApp);
      const effectivePaid = Math.max(0, principal - pendingBalance);
      const percentage = (effectivePaid / principal) * 100;
      const isSettled = pendingBalance <= 0.01;
      return {
        ...debt,
        saldo_pendiente: pendingBalance,
        porcentaje_pagado: isSettled ? 100 : Math.min(100, Math.max(0, percentage)),
        estado_deuda: isSettled ? 'Liquidada' : percentage > 90 ? 'Casi liquidada' : 'Activa',
      } as Debt;
    });

    const dynamicallyUpdatedAreas = areas.map((area) => {
      const computed = safeComputedAreas.find((ca) => ca.area_id === area.area_id);
      return { ...area, estado: computed?.estado || area.estado };
    });

    const dynamicallyUpdatedHormones = hormones.map((hormone) => {
      const computed = safeComputedHormones.find((ch) => ch.hormone_id === hormone.hormone_id);
      return { ...hormone, current_level: computed?.current_level ?? hormone.baseline };
    });

    const scoresByArea: ScoreByArea[] = dynamicallyUpdatedAreas.map((area) => ({
      area: area.area_nombre,
      shortArea: abbreviateAreaName(area.area_nombre),
      score: safeComputedAreas.find((ca) => ca.area_id === area.area_id)?.score_7d || 0,
    }));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyFinancials: MonthlyFinancials = safeTransactions.reduce(
      (acc, t) => {
        const tDate = parseISO(t.fecha);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
          if (t.tipo === 'Ingreso') acc.totalIncome += t.monto;
          else if (t.tipo === 'Gasto') acc.totalExpenses += Math.abs(t.monto);
        }
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );

    const relationshipEnergy = [
      { outcome: 'Positiva', count: 0, fill: 'hsl(var(--chart-5))' },
      { outcome: 'Neutra', count: 0, fill: 'hsl(var(--muted-foreground))' },
      { outcome: 'Negativa', count: 0, fill: 'hsl(var(--chart-3))' },
    ];
    safeInteractions.forEach((interaction) => {
      const energy = Number(interaction.energia_resultante);
      if (energy > 0) relationshipEnergy[0].count += 1;
      else if (energy < 0) relationshipEnergy[2].count += 1;
      else relationshipEnergy[1].count += 1;
    });

    const dailyScoreTrend: DailyScore[] = [...safeComputedDailyScores]
      .sort((a, b) => parseISO(a.fecha).getTime() - parseISO(b.fecha).getTime())
      .map((score, index, arr) => {
        const windowStart = Math.max(0, index - 6);
        const window = arr.slice(windowStart, index + 1);
        const movingAverage = window.reduce((acc, curr) => acc + curr.score_total, 0) / window.length;
        return {
          date: format(parseISO(score.fecha), 'yyyy-MM-dd', { locale: es }),
          score: score.score_total,
          movingAverage: Math.round(movingAverage),
        };
      });

    const latestDailyScore =
      safeComputedDailyScores.length > 0
        ? [...safeComputedDailyScores].sort(
            (a, b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime()
          )[0]?.score_total
        : undefined;
    // Modo aprendizaje: lo decide el motor (única fuente de verdad) y lo persiste
    // en el doc. Antes de la primera escritura (doc null) también es aprendizaje.
    const isLearningMode =
      computedGlobalState == null
        ? true
        : computedGlobalState.is_learning_mode ?? ((computedGlobalState.data_quality ?? 0) < 0.2);

    const globalScore = computedGlobalState?.rpg_stats?.player_score;
    let resolvedPlayerScore =
      typeof globalScore === 'number'
        ? globalScore
        : typeof latestDailyScore === 'number'
        ? latestDailyScore
        : DEFAULT_STATS.player_score;

    // La mezcla con el score diario crudo (65%) amplifica la volatilidad cuando
    // hay poquísimos días de historial. En aprendizaje confiamos en el score
    // suavizado del motor y no la aplicamos.
    if (!isLearningMode && typeof globalScore === 'number' && typeof latestDailyScore === 'number') {
      const delta = Math.abs(globalScore - latestDailyScore);
      if (delta >= 12) {
        resolvedPlayerScore = Math.round(globalScore * 0.35 + latestDailyScore * 0.65);
      }
    }

    const rawStats = (computedGlobalState?.rpg_stats || DEFAULT_STATS) as RPGStats & Record<string, number>;
    const resolvedRpgStats: RPGStats = {
      ...rawStats,
      sueno:
        typeof rawStats.sueno === 'number'
          ? rawStats.sueno
          : typeof rawStats['sueño'] === 'number'
          ? rawStats['sueño']
          : DEFAULT_STATS.sueno,
      player_score: resolvedPlayerScore,
    };

    // En aprendizaje o sin doc, OK fijo: nunca mostramos RIESGO/CRITICO con datos
    // insuficientes. Solo derivamos estado por score cuando el motor no trae uno
    // explícito Y ya hay datos fiables.
    const resolvedOverallState =
      computedGlobalState?.estado_global ||
      (isLearningMode || computedGlobalState == null
        ? 'OK'
        : resolvedPlayerScore < 40 ? 'CRITICO' : resolvedPlayerScore < 70 ? 'RIESGO' : 'OK');

    return {
      userProfile: safeUserProfile,
      playerProfile,
      areas: dynamicallyUpdatedAreas,
      hormones: dynamicallyUpdatedHormones,
      variables,
      transactions: safeTransactions,
      allTransactions: safeAllTransactions,
      debtTransactions: safeDebtTransactions,
      interactions: safeInteractions,
      relations: safeRelations,
      accounts: safeAccounts,
      debts,
      kpis: {
        scoresByArea,
        dailyScoreTrend,
        monthlyFinancials,
        relationshipEnergy,
        // En modo calibración no calculamos velocidad: con pocos días el delta es
        // ruido y dispararía falsas "caídas aceleradas" mientras el motor aprende.
        scoreVelocity: isLearningMode ? null : computeScoreVelocity(dailyScoreTrend),
      },
      impactMatrix: safeImpactMatrix,
      skills: safeSkills,
      systems: safeSystems,
      habits: safeHabits,
      milestones: safeMilestones,
      protocols: safeProtocols,
      states: safeStates,
      events: safeEvents,
      overallState: resolvedOverallState,
      dominantVariables: computedGlobalState?.dominant_drain_vars_7d ?? [],
      explanation: computedGlobalState?.explanation || null,
      rpg_stats: resolvedRpgStats,
      is_locked: computedGlobalState?.is_locked || false,
      lock_reason: computedGlobalState?.lock_reason || '',
      estimated_unlock_time: computedGlobalState?.estimated_unlock_time || 0,
      clinical_v2: computedGlobalState?.clinical_v2 ?? null,
      isLearningMode,
    };
  }, [
    isLoading, uid, user, userProfile, playerProfile, rawAreas, rawHormones, rawVariables,
    rawTransactions, interactions, events, relations, accounts, rawDebts,
    computedGlobalState, computedAreas, computedHormones, computedDailyScores,
    rawImpactMatrix, rawSkills, rawSystems, rawHabits, rawMilestones, rawProtocols, rawStates,
  ]);


  // Raw collections for useComputedDataWriter
  const writerPrefetch = useMemo(() => {
    if (!uid || !playerProfile || !rawAreas || !rawHormones || !rawVariables) return undefined;
    return {
      playerProfile,
      areas:               rawAreas            ?? [],
      hormones:            rawHormones         ?? [],
      impactMatrix:        rawImpactMatrix      ?? [],
      variables:           rawVariables        ?? [],
      allEvents:           events              ?? [],
      allInteractions:     interactions        ?? [],
      relations:           relations           ?? [],
      allTransactions:     rawTransactions     ?? [],
      protocols:           rawProtocols        ?? [],
      milestones:          rawMilestones       ?? [],
      computedDailyScores: computedDailyScores ?? [],
      lastGlobalState:     computedGlobalState ?? null,
    };
  }, [uid, playerProfile, rawAreas, rawHormones, rawImpactMatrix, rawVariables, events, interactions, relations, rawTransactions, rawProtocols, rawMilestones, computedDailyScores, computedGlobalState]);

  const isValidating = isValidatingGlobalState || isValidatingComputedAreas || isValidatingComputedHormones;

  return { data: currentData, isLoading, isValidating, writerPrefetch };
}

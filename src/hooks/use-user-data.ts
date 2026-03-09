
'use client';

import { useMemo, useRef } from 'react';
import { useCollection, useDoc, useUser, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  query,
  limit,
  orderBy,
  where,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { DateRange } from 'react-day-picker';
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
  CalculatedKpis,
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
import { format, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function abbreviateAreaName(name: string): string {
    if (name.includes('/')) {
        return name.split('/')[0];
    }
    return name.substring(0, 12);
}

function deduplicate<T>(items: T[], key: keyof T): T[] {
    const seen = new Set();
    return items.filter(item => {
        const val = item[key];
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
    });
}

const DEFAULT_STATS: RPGStats = {
    dopamina: 50,
    serotonina: 50,
    cortisol: 20,
    foco: 50,
    energia: 50,
    sueno: 50,
    conexion_social: 50,
    carga_dopaminergica: 20,
    player_score: 50
};

export function useUserData(dateRange?: DateRange) {
  const { user, auth } = useUser();
  const effectiveUser = user || auth?.currentUser || null;
  const firestore = useFirestore();

  const getQueryConstraints = () => {
    if (!dateRange?.from) return [];
    
    const constraints = [];
    constraints.push(where('fecha', '>=', startOfDay(dateRange.from).toISOString()));
    
    if (dateRange.to) {
        const endOfDayDate = new Date(dateRange.to);
        endOfDayDate.setHours(23, 59, 59, 999);
        constraints.push(where('fecha', '<=', endOfDayDate.toISOString()));
    }
    
    return constraints;
  };


  // --- RAW DATA FETCHING ---
  const userProfileRef = useMemoFirebase(() => (effectiveUser ? doc(firestore, `users/${effectiveUser.uid}`) : null), [firestore, effectiveUser]);
  const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

  const playerProfileRef = useMemoFirebase(() => (effectiveUser ? doc(firestore, `users/${effectiveUser.uid}/playerProfile`, 'main-profile') : null), [firestore, effectiveUser]);
  const { data: playerProfile, isLoading: isLoadingPlayerProfile } = useDoc<PlayerProfile>(playerProfileRef);
  
  const areasRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/areas`) : null), [firestore, effectiveUser]);
  const { data: rawAreas, isLoading: isLoadingAreas } = useCollection<Area>(areasRef);

  const hormonesRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/hormones`) : null), [firestore, effectiveUser]);
  const { data: rawHormones, isLoading: isLoadingHormones } = useCollection<Hormone>(hormonesRef);
  
  const variablesRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/variables`) : null), [firestore, effectiveUser]);
  const { data: rawVariables, isLoading: isLoadingVariables } = useCollection<Variable>(variablesRef);

  const impactMatrixRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/impactMatrix`) : null), [firestore, effectiveUser]);
  const { data: rawImpactMatrix, isLoading: isLoadingImpactMatrix } = useCollection<ImpactMatrix>(impactMatrixRef);

  const skillsRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/skills`) : null), [firestore, effectiveUser]);
  const { data: rawSkills, isLoading: isLoadingSkills } = useCollection<Skill>(skillsRef);

  const systemsRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/systems`) : null), [firestore, effectiveUser]);
  const { data: rawSystems, isLoading: isLoadingSystems } = useCollection<System>(systemsRef);

  const habitsRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/habits`) : null), [firestore, effectiveUser]);
  const { data: rawHabits, isLoading: isLoadingHabits } = useCollection<Habit>(habitsRef);
  
  const milestonesRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/milestones`) : null), [firestore, effectiveUser]);
  const { data: rawMilestones, isLoading: isLoadingMilestones } = useCollection<Milestone>(milestonesRef);

  const protocolsRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/protocols`) : null), [firestore, effectiveUser]);
  const { data: rawProtocols, isLoading: isLoadingProtocols } = useCollection<Protocol>(protocolsRef);

  const rawStatesRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/states`) : null), [firestore, effectiveUser]);
  const { data: rawStates, isLoading: isLoadingStates } = useCollection<State>(rawStatesRef);

  const transactionsQuery = useMemoFirebase(() => (effectiveUser ? query(collection(firestore, `users/${effectiveUser.uid}/transactions`), ...getQueryConstraints()) : null), [firestore, effectiveUser, dateRange]);
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const allTransactionsQuery = useMemoFirebase(() => (effectiveUser ? query(collection(firestore, `users/${effectiveUser.uid}/transactions`)) : null), [firestore, effectiveUser]);
  const { data: allTransactions, isLoading: isLoadingAllTransactions } = useCollection<Transaction>(allTransactionsQuery);

  const debtTransactionsQuery = useMemoFirebase(() => (effectiveUser ? query(collection(firestore, `users/${effectiveUser.uid}/transactions`), where('categoria', '==', 'Deudas')) : null), [firestore, effectiveUser]);
  const { data: debtTransactions, isLoading: isLoadingDebtTransactions } = useCollection<Transaction>(debtTransactionsQuery);

  const interactionsQuery = useMemoFirebase(() => (effectiveUser ? query(collection(firestore, `users/${effectiveUser.uid}/interactions`), ...getQueryConstraints()) : null), [firestore, effectiveUser, dateRange]);
  const { data: interactions, isLoading: isLoadingInteractions } = useCollection<Interaction>(interactionsQuery);

  const eventsQuery = useMemoFirebase(() => (effectiveUser ? query(collection(firestore, `users/${effectiveUser.uid}/events`), ...getQueryConstraints()) : null), [firestore, effectiveUser, dateRange]);
  const { data: events, isLoading: isLoadingEvents } = useCollection<Event>(eventsQuery);
  
  const relationsRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/relations`) : null), [firestore, effectiveUser]);
  const { data: relations, isLoading: isLoadingRelations } = useCollection<Relation>(relationsRef);

  const accountsRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/accounts`) : null), [firestore, effectiveUser]);
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<Account>(accountsRef);

  const debtsRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/debts`) : null), [firestore, effectiveUser]);
  const { data: rawDebts, isLoading: isLoadingDebts } = useCollection<Debt>(debtsRef);
  
  // --- COMPUTED DATA FETCHING ---
  const computedGlobalStateRef = useMemoFirebase(() => (effectiveUser ? doc(firestore, `users/${effectiveUser.uid}/computed_global_state`, 'latest') : null), [firestore, effectiveUser]);
  const { data: computedGlobalState, isLoading: isLoadingGlobalState } = useDoc<ComputedGlobalState>(computedGlobalStateRef);

  const computedAreasRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/computed_areas`) : null), [firestore, effectiveUser]);
  const { data: computedAreas, isLoading: isLoadingComputedAreas } = useCollection<ComputedArea>(computedAreasRef);

  const computedHormonesRef = useMemoFirebase(() => (effectiveUser ? collection(firestore, `users/${effectiveUser.uid}/computed_hormones`) : null), [firestore, effectiveUser]);
  const { data: computedHormones, isLoading: isLoadingComputedHormones } = useCollection<ComputedHormone>(computedHormonesRef);

  const computedDailyScoresQuery = useMemoFirebase(() => {
    if (!effectiveUser) return null;
    const constraints = getQueryConstraints().length > 0
        ? getQueryConstraints()
        : [orderBy('fecha', 'desc'), limit(7)];
    return query(collection(firestore, `users/${effectiveUser.uid}/computed_daily_score`), ...constraints);
  }, [firestore, effectiveUser, dateRange]);
  const { data: computedDailyScores, isLoading: isLoadingComputedDailyScores } = useCollection<ComputedDailyScore>(computedDailyScoresQuery);


  const isLoading =
    isLoadingProfile ||
    isLoadingPlayerProfile ||
    isLoadingAreas ||
    isLoadingHormones ||
    isLoadingVariables ||
    isLoadingTransactions ||
    isLoadingAllTransactions ||
    isLoadingDebtTransactions ||
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
    if (!effectiveUser) {
      return null;
    }

    const safeUserProfile: UserProfile = userProfile || {
      id: effectiveUser.uid,
      uid: effectiveUser.uid,
      email: effectiveUser.email,
      displayName: effectiveUser.displayName,
      photoURL: effectiveUser.photoURL,
      axiomAvatarDataUrl: '',
      createdAt: new Date().toISOString(),
    };

    const safeAreas = rawAreas || [];
    const safeHormones = rawHormones || [];
    const safeVariables = rawVariables || [];
    const safeTransactions = transactions || [];
    const safeAllTransactions = allTransactions || [];
    const safeDebtTransactions = debtTransactions || [];
    const safeInteractions = interactions || [];
    const safeEvents = events || [];
    const safeRelations = relations || [];
    const safeAccounts = accounts || [];
    const safeDebts = rawDebts || [];
    const safeComputedAreas = computedAreas || [];
    const safeComputedHormones = computedHormones || [];
    const safeComputedDailyScores = computedDailyScores || [];
    const safeImpactMatrix = rawImpactMatrix || [];
    const safeSkills = rawSkills || [];
    const safeSystems = rawSystems || [];
    const safeHabits = rawHabits || [];
    const safeMilestones = rawMilestones || [];
    const safeProtocols = rawProtocols || [];
    const safeStates = rawStates || [];

    const areas = deduplicate(safeAreas, 'area_id');
    const hormones = deduplicate(safeHormones, 'hormone_id');
    const variables = deduplicate(safeVariables, 'var_id');
    const baseDebts = deduplicate(safeDebts, 'debt_id');
    
    // --- DYNAMIC DEBT CALCULATION ---
    const debts = baseDebts.map(debt => {
        const relevantTransactions = safeDebtTransactions.filter(t => t.deuda_id === debt.debt_id);
        const totalPaidInApp = relevantTransactions.reduce((acc, t) => acc + Math.abs(t.monto), 0);

        const principal = Math.max(1, debt.principal_inicial || 1);
        const currentBalance = Math.max(0, debt.saldo_actual || 0);

        // `saldo_actual` is treated as the starting tracked balance.
        // Every registered debt payment decreases this balance for UI/KPI consistency.
        const pendingBalance = Math.max(0, currentBalance - totalPaidInApp);
        const effectivePaid = Math.max(0, principal - pendingBalance);
        const percentage = (effectivePaid / principal) * 100;
        const isSettled = pendingBalance <= 0.01;

        return {
            ...debt,
            saldo_pendiente: pendingBalance,
            porcentaje_pagado: isSettled ? 100 : Math.min(100, Math.max(0, percentage)),
            estado_deuda: isSettled ? 'Liquidada' : (percentage > 90 ? 'Casi liquidada' : 'Activa')
        } as Debt;
    });

    const dynamicallyUpdatedAreas = areas.map(area => {
        const computed = safeComputedAreas.find(ca => ca.area_id === area.area_id);
        return {
            ...area,
            estado: computed?.estado || area.estado,
        };
    });

    const dynamicallyUpdatedHormones = hormones.map(hormone => {
        const computed = safeComputedHormones.find(ch => ch.hormone_id === hormone.hormone_id);
        return {
            ...hormone,
            current_level: computed?.current_level ?? hormone.baseline,
        };
    });
    
     const scoresByArea: ScoreByArea[] = dynamicallyUpdatedAreas.map((area) => ({
        area: area.area_nombre,
        shortArea: abbreviateAreaName(area.area_nombre),
        score: safeComputedAreas.find(ca => ca.area_id === area.area_id)?.score_7d || 0,
    }));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyFinancials: MonthlyFinancials = safeTransactions.reduce((acc, t) => {
        const tDate = parseISO(t.fecha);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
            if (t.tipo === 'Ingreso') acc.totalIncome += t.monto;
            else if (t.tipo === 'Gasto') acc.totalExpenses += Math.abs(t.monto);
        }
        return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

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
            const movingAverage =
                window.reduce((acc, curr) => acc + curr.score_total, 0) / window.length;
            return {
            date: format(parseISO(score.fecha), 'yyyy-MM-dd', { locale: es }),
            score: score.score_total,
            movingAverage: Math.round(movingAverage),
            };
        });

    const latestDailyScore = safeComputedDailyScores.length > 0
      ? [...safeComputedDailyScores]
          .sort((a, b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime())[0]?.score_total
      : undefined;
    const globalScore = computedGlobalState?.rpg_stats?.player_score;
    let resolvedPlayerScore =
      typeof globalScore === 'number'
        ? globalScore
        : (typeof latestDailyScore === 'number' ? latestDailyScore : DEFAULT_STATS.player_score);

    if (typeof globalScore === 'number' && typeof latestDailyScore === 'number') {
      const delta = Math.abs(globalScore - latestDailyScore);
      if (delta >= 12) {
        // Preferimos seÃ±al diaria reciente si el estado global estÃ¡ claramente desfasado.
        resolvedPlayerScore = Math.round((globalScore * 0.35) + (latestDailyScore * 0.65));
      }
    }

    const rawStats = (computedGlobalState?.rpg_stats || DEFAULT_STATS) as RPGStats & Record<string, number>;
    const resolvedRpgStats: RPGStats = {
      ...rawStats,
      sueno: typeof rawStats.sueno === 'number'
        ? rawStats.sueno
        : (typeof rawStats['sueño'] === 'number' ? rawStats['sueño'] : DEFAULT_STATS.sueno),
      player_score: resolvedPlayerScore,
    };

    const resolvedOverallState =
      computedGlobalState?.estado_global ||
      (resolvedPlayerScore < 40 ? 'CRITICO' : resolvedPlayerScore < 70 ? 'RIESGO' : 'OK');

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
      dominantVariables: [], 
      explanation: computedGlobalState?.explanation || null,
      rpg_stats: resolvedRpgStats,
      is_locked: computedGlobalState?.is_locked || false,
      lock_reason: computedGlobalState?.lock_reason || '',
      estimated_unlock_time: computedGlobalState?.estimated_unlock_time || 0,
    };
  }, [isLoading, effectiveUser, userProfile, playerProfile, rawAreas, rawHormones, rawVariables, transactions, allTransactions, debtTransactions, interactions, events, relations, accounts, rawDebts, computedGlobalState, computedAreas, computedHormones, computedDailyScores, rawImpactMatrix, rawSkills, rawSystems, rawHabits, rawMilestones, rawProtocols, rawStates]);

  return { data: currentData, isLoading };
}


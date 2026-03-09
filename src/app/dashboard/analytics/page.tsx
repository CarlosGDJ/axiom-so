'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { DateRange } from 'react-day-picker';
import { startOfWeek, isSameDay, subDays, format, parseISO, isAfter, differenceInHours, endOfDay, differenceInDays, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Compass,
  Gauge,
  Activity,
  Star,
  Milestone,
  Repeat,
  BookText,
  Shield,
  Calendar,
  DollarSign,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  Landmark,
  CreditCard,
  LineChart,
  TrendingDown,
  TrendingUp,
  BrainCircuit,
  Binary,
  Loader2,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/app/date-range-picker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';


// Import chart components
import ScoreByAreaChart from '@/components/app/charts/score-by-area-chart';
import IncomeExpenseChart from '@/components/app/charts/income-expense-chart';
import RelationshipEnergyChart from '@/components/app/charts/relationship-energy-chart';
import DailyScoreChart from '@/components/app/charts/daily-score-chart';
import HormoneLevelsChart from '@/components/app/charts/hormone-levels-chart';
import GlobalStateTimelineChart from '@/components/app/charts/global-state-timeline-chart';
import PeriodDriversChart from '@/components/app/charts/period-drivers-chart';
import StabilityScoreChart from '@/components/app/charts/stability-score-chart';
import WeeklyHeatmapChart from '@/components/app/charts/weekly-heatmap-chart';
import AreaTrendChart from '@/components/app/charts/area-trend-chart';
import AreaStatusMatrixChart from '@/components/app/charts/area-status-matrix-chart';
import AreaContributionChart from '@/components/app/charts/area-contribution-chart';
import AreaWaterfallChart from '@/components/app/charts/area-waterfall-chart';
import AreaDecayTimelineChart from '@/components/app/charts/area-decay-timeline-chart';
import HormoneCurveChart from '@/components/app/charts/hormone-curve-chart';
import HormoneTriggersChart from '@/components/app/charts/hormone-triggers-chart';
import VariableRankingChart from '@/components/app/charts/variable-ranking-chart';
import FrequencyImpactChart from '@/components/app/charts/frequency-impact-chart';
import DailyVariableDominanceChart from '@/components/app/charts/daily-variable-dominance-chart';
import ImpulsiveImpactChart from '@/components/app/charts/impulsive-impact-chart';
import CooccurrenceMatrixChart from '@/components/app/charts/cooccurrence-matrix-chart';
import ImpactMatrixHeatmap from '@/components/app/charts/impact-matrix-heatmap';
import TopConnectionsList, { type Connection } from '@/components/app/charts/top-connections-list';
import SkillProgressChart from '@/components/app/charts/skill-progress-chart';
import SkillActivityChart from '@/components/app/charts/skill-activity-chart';
import SkillConsistencyChart from '@/components/app/charts/skill-consistency-chart';
import SkillVelocityChart from '@/components/app/charts/skill-velocity-chart';
import SystemActivityChart from '@/components/app/charts/system-activity-chart';
import FailureProtocolChart from '@/components/app/charts/failure-protocol-chart';
import HabitActivityChart from '@/components/app/charts/habit-activity-chart';
import ProtocolExecutionChart from '@/components/app/charts/protocol-execution-chart';
import StateDistributionChart from '@/components/app/charts/state-distribution-chart';
import EventFrequencyChart from '@/components/app/charts/event-frequency-chart';
import AccountBalanceChart from '@/components/app/charts/account-balance-chart';
import DebtBalanceChart from '@/components/app/charts/debt-balance-chart';
import RelationMatrixChart from '@/components/app/charts/relation-matrix-chart';
import CorrelationScatterChart from '@/components/app/charts/correlation-scatter-chart';


import DashboardLoading from '../loading';
import NavigationReady from '@/components/app/navigation-ready';
import type { ScoreByArea, DailyScore } from '@/lib/types';
import { computeAreaEventContributionAtTime, computeAreaScoreAtTime } from '@/lib/area-scoring';


const tabsConfig = [
    { value: 'general', label: 'General', icon: LineChart },
    { value: 'patrones', label: 'Patrones', icon: Binary },
    { value: 'areas', label: 'Áreas', icon: Compass },
    { value: 'hormones', label: 'Hormonas', icon: Gauge },
    { value: 'variables', label: 'Variables', icon: Activity },
    { value: 'impactMatrix', label: 'Matriz de Impacto', icon: Zap },
    { value: 'skills', label: 'Habilidades', icon: Star },
    { value: 'systems', label: 'Sistemas', icon: Milestone },
    { value: 'habits', label: 'Hábitos', icon: Repeat },
    { value: 'protocols', label: 'Protocolos', icon: BookText },
    { value: 'states', label: 'Estados', icon: Shield },
    { value: 'events', label: 'Eventos', icon: Calendar },
    { value: 'transactions', label: 'Transacciones', icon: DollarSign },
    { value: 'interactions', label: 'Interacciones', icon: Users },
    { value: 'relations', label: 'Relaciones', icon: Users },
    { value: 'accounts', label: 'Cuentas', icon: Landmark },
    { value: 'debts', label: 'Deudas', icon: CreditCard },
];

const getTabsPerPage = (width: number) => {
    if (width < 768) return 4;
    if (width < 1024) return 5;
    if (width < 1280) return 6;
    if (width < 1536) return 7;
    return 8;
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { locale: es, weekStartsOn: 1 }),
    to: new Date(),
  });
  
  // Tab-specific filter states
  const [impulsiveOnlyForTransactions, setImpulsiveOnlyForTransactions] = useState(false);
  const [modeForInteractions, setModeForInteractions] = useState<'all' | 'positive' | 'negative'>('all');
  const [modeForVariables, setModeForVariables] = useState<'all' | 'positive' | 'negative'>('all');
  const [minIntensityForVariables, setMinIntensityForVariables] = useState(1);
  const [impulsiveOnlyForVariables, setImpulsiveOnlyForVariables] = useState(false);
  
  // Specific entity selections
  const [selectedAreaForCharts, setSelectedAreaForCharts] = useState<string | null>(null);
  const [selectedHormoneId, setSelectedHormoneId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const { data: userData, isLoading } = useUserData(dateRange);

  useEffect(() => {
    if (userData?.areas && userData.areas.length > 0 && !selectedAreaForCharts) {
        setSelectedAreaForCharts(userData.areas[0].area_id);
    }
    if (userData?.hormones && userData.hormones.length > 0 && !selectedHormoneId) {
        setSelectedHormoneId(userData.hormones[0].hormone_id);
    }
    if (userData?.skills && userData.skills.length > 0 && !selectedSkillId) {
        setSelectedSkillId(userData.skills[0].habilidad_id);
    }
  }, [userData, selectedAreaForCharts, selectedHormoneId, selectedSkillId]);


  // Base filtered data (only by date)
  const eventsInDateRange = useMemo(() => {
    if (!userData?.events) return [];
    return userData.events;
  }, [userData?.events]);
  
  // Cross-Correlation Data Calculation
  const correlationData = useMemo(() => {
    if (!userData) return { sleepFocus: [], stressSpending: [], dopamineDiscipline: [] };

    const { events, transactions, variables } = userData;
    const variablesById = Object.fromEntries((variables || []).map(v => [v.var_id, v]));
    const days = Array.from({ length: 31 }, (_, i) => subDays(new Date(), i));
    
    const sleepFocus: any[] = [];
    const stressSpending: any[] = [];
    const dopamineDiscipline: any[] = [];

    days.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayEvents = events.filter(e => isSameDay(parseISO(e.fecha), day));
        const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.fecha), day));
        
        // 1. Sleep vs Focus
        const sleepEvent = dayEvents.find(e => e.var_id.toUpperCase().includes('SUE'));
        const deepWorkSessions = dayEvents.filter(e => e.var_id === 'DEEP_WORK').length;
        if (sleepEvent) {
            sleepFocus.push({
                x: sleepEvent.intensidad,
                y: deepWorkSessions,
                date: dayStr,
                label: sleepEvent.contexto
            });
        }

        // 2. Stress vs Impulsive Spending
        const stressEvent = dayEvents.find(e => e.var_id === 'ESTRES' || e.var_id === 'REACTIVIDAD');
        const impulsiveSpend = dayTransactions
            .filter(t => t.impulsivo)
            .reduce((sum, t) => sum + Math.abs(t.monto), 0);
        
        if (stressEvent || impulsiveSpend > 0) {
            stressSpending.push({
                x: stressEvent?.intensidad || 0,
                y: impulsiveSpend,
                date: dayStr,
                label: stressEvent?.contexto
            });
        }

        // 3. Dopamine vs Discipline
        const dopamineEvent = dayEvents.find(e => e.var_id === 'DOPA_RAP');
        const dayImpact = dayEvents.reduce((acc, e) => {
            const variable = variablesById[e.var_id];
            if (!variable) return acc;
            return acc + (variable.polaridad * variable.impacto_base * (e.intensidad / 5));
        }, 0);
        const disciplineScore = Math.round(Math.max(0, Math.min(100, 60 + (dayImpact * 2))));
        
        if (dopamineEvent) {
            dopamineDiscipline.push({
                x: dopamineEvent.intensidad,
                y: disciplineScore,
                date: dayStr
            });
        }
    });

    return { sleepFocus, stressSpending, dopamineDiscipline };
  }, [userData]);

  // Locally filtered data for Transactions tab
  const filteredFinancials = useMemo(() => {
    if (!userData?.transactions) return { totalIncome: 0, totalExpenses: 0 };
    
    const filtered = userData.transactions.filter(t => {
      if (impulsiveOnlyForTransactions && !t.impulsivo) return false;
      return true;
    });

    return filtered.reduce((acc, t) => {
      if (t.tipo === 'Ingreso') acc.totalIncome += t.monto;
      else if (t.tipo === 'Gasto') acc.totalExpenses += Math.abs(t.monto);
      return acc;
    }, { totalIncome: 0, totalExpenses: 0 });
  }, [userData?.transactions, impulsiveOnlyForTransactions]);

  // Locally filtered data for Interactions tab
  const filteredInteractions = useMemo(() => {
    if (!userData?.interactions) return [];
    return userData.interactions.filter(interaction => {
      if (modeForInteractions === 'positive') return interaction.energia_resultante > 0;
      if (modeForInteractions === 'negative') return interaction.energia_resultante < 0;
      return true;
    });
  }, [userData?.interactions, modeForInteractions]);

  // Locally filtered data for Variables tab
  const filteredEventsForVariables = useMemo(() => {
    if (!userData?.events || !userData.variables) return [];
    const variablesById = Object.fromEntries(userData.variables.map(v => [v.var_id, v]));

    return userData.events.filter(event => {
      if (impulsiveOnlyForVariables && !event.impulsivo) return false;
      if (event.intensidad < minIntensityForVariables) return false;

      const variable = variablesById[event.var_id];
      if (!variable) return true;

      if (modeForVariables === 'positive' && variable.polaridad !== 1) return false;
      if (modeForVariables === 'negative' && variable.polaridad !== -1) return false;

      return true;
    });
  }, [userData?.events, userData?.variables, modeForVariables, minIntensityForVariables, impulsiveOnlyForVariables]);


  const scoresByArea: ScoreByArea[] = useMemo(() => {
    return userData?.kpis.scoresByArea || [];
  }, [userData?.kpis.scoresByArea]);

  const dailyScoreTrend: (DailyScore & { movingAverage?: number })[] = useMemo(() => {
    const trend = userData?.kpis.dailyScoreTrend || [];
    return trend.map((dataPoint, index, arr) => {
        const windowStart = Math.max(0, index - 6);
        const window = arr.slice(windowStart, index + 1);
        const movingAverage = window.reduce((acc, curr) => acc + curr.score, 0) / window.length;
        return {
            ...dataPoint,
            movingAverage: Math.round(movingAverage),
        };
    });
  }, [userData?.kpis.dailyScoreTrend]);

  const globalStateTimeline = useMemo(() => {
    if (!dailyScoreTrend) return [];
    return dailyScoreTrend.map(day => {
        let state: 'OK' | 'RIESGO' | 'CRITICO' = 'OK';
        if (day.score < 40) state = 'CRITICO';
        else if (day.score < 70) state = 'RIESGO';
        return {
            date: day.date,
            score: day.score,
            state: state,
        };
    });
  }, [dailyScoreTrend]);

  const periodDrivers = useMemo(() => {
    if (!eventsInDateRange || !userData?.variables) return { gains: [], drains: [] };
    
    const impactMap: { [key: string]: number } = {};

    eventsInDateRange.forEach(event => {
        const variable = userData.variables.find(v => v.var_id === event.var_id);
        if (!variable) return;

        const impact = variable.polaridad * variable.impacto_base * (event.intensidad / 5);
        impactMap[variable.var_nombre] = (impactMap[variable.var_nombre] || 0) + impact;
    });

    const allDrivers = Object.entries(impactMap).map(([name, impact]) => ({ name, impact: Math.round(impact) }));

    const gains = allDrivers.filter(d => d.impact > 0).sort((a, b) => b.impact - a.impact).slice(0, 5);
    const drains = allDrivers.filter(d => d.impact < 0).sort((a, b) => a.impact - b.impact).slice(0, 5);

    return { gains, drains };
  }, [eventsInDateRange, userData?.variables]);

  const stabilityIndex = useMemo(() => {
    if (!dailyScoreTrend || dailyScoreTrend.length < 2) return 50;

    const scores = dailyScoreTrend.map(d => d.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 100;

    const maxStdDev = 25; 
    const stability = Math.max(0, 100 - (stdDev / maxStdDev) * 100);
    
    return Math.round(stability);
  }, [dailyScoreTrend]);

  const relationshipEnergy = useMemo(() => {
    const energyData = filteredInteractions.reduce((acc, i) => {
        if (i.energia_resultante === 1) acc.positive++;
        else if (i.energia_resultante === -1) acc.negative++;
        else acc.neutral++;
        return acc;
    }, { positive: 0, neutral: 0, negative: 0 });

    return [
        { outcome: 'Positiva', count: energyData.positive, fill: 'hsl(var(--chart-5))' },
        { outcome: 'Neutra', count: energyData.neutral, fill: 'hsl(var(--muted-foreground))' },
        { outcome: 'Negativa', count: energyData.negative, fill: 'hsl(var(--chart-3))' },
    ];
  }, [filteredInteractions]);

  const weeklyHeatmapData = useMemo(() => {
    if (!eventsInDateRange || !userData?.variables) return { heatmap: [], maxCount: 0, days: [], hours: [], eventDetails: {} };

    const variablesById = Object.fromEntries(userData.variables.map(v => [v.var_id, v]));
    const heatmap: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    const eventDetails: { [key: string]: string[] } = {};

    eventsInDateRange.forEach(event => {
        const variable = variablesById[event.var_id];
        if (variable && variable.polaridad === -1) {
            const date = new Date(event.fecha);
            if (isNaN(date.getTime())) return;

            const dayOfWeek = (date.getDay() + 6) % 7; 
            const hour = date.getHours();
            
            heatmap[dayOfWeek][hour] += 1;
            
            const key = `${dayOfWeek}-${hour}`;
            if (!eventDetails[key]) {
                eventDetails[key] = [];
            }
            eventDetails[key].push(variable.var_nombre);
        }
    });

    const maxCount = Math.max(0, ...heatmap.flat());

    return {
        heatmap,
        maxCount,
        eventDetails,
        days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        hours: Array.from({ length: 24 }, (_, i) => i),
    };
  }, [eventsInDateRange, userData?.variables]);

  const areaTrendData = useMemo(() => {
    if (!userData?.variables || !userData?.areas || !selectedAreaForCharts) return [];
    const range = dateRange ?? { from: subDays(new Date(), 6), to: new Date() };
    if (!range.from) return [];

    const trend: DailyScore[] = [];
    const start = startOfDay(range.from);
    const end = range.to ? endOfDay(range.to) : endOfDay(new Date());
    const selectedArea = userData.areas.find(a => a.area_id === selectedAreaForCharts);
    if (!selectedArea) return [];

    const areaVariables = userData.variables.filter(v => v.area_id === selectedAreaForCharts);
    const areaVariableIds = new Set(areaVariables.map(v => v.var_id));
    const variableById = new Map(areaVariables.map(v => [v.var_id, v]));
    const eventsForArea = eventsInDateRange.filter(e => areaVariableIds.has(e.var_id));

    for (let d = start; d <= end; d = addDays(d, 1)) {
      const dayStr = format(d, 'yyyy-MM-dd', { locale: es });
      const areaScore = computeAreaScoreAtTime({
        area: selectedArea,
        events: eventsForArea,
        variableById,
        at: endOfDay(d),
      });
      trend.push({ date: dayStr, score: areaScore.score, movingAverage: areaScore.score });
    }
    return trend;
  }, [eventsInDateRange, userData?.variables, userData?.areas, dateRange, selectedAreaForCharts]);

  const areaStatusMatrixData = useMemo(() => {
      if (!userData?.areas || !userData.variables) return [];
      const range = dateRange ?? { from: subDays(new Date(), 6), to: new Date() };
      if (!range.from) return [];
      
      const matrix: { id: string; area: string; dailyStates: { date: string; state: 'OK' | 'RIESGO' | 'CRITICO' }[] }[] = [];
      const start = startOfDay(range.from);
      const end = range.to ? endOfDay(range.to) : endOfDay(new Date());

      userData.areas.forEach(area => {
          const areaVariables = userData.variables.filter(v => v.area_id === area.area_id);
          const areaVariableIds = new Set(areaVariables.map(v => v.var_id));
          const variableById = new Map(areaVariables.map(v => [v.var_id, v]));
          const eventsForArea = eventsInDateRange.filter(e => areaVariableIds.has(e.var_id));
          
          const dailyStates: { date: string; state: 'OK' | 'RIESGO' | 'CRITICO' }[] = [];

          for (let d = start; d <= end; d = addDays(d, 1)) {
              const dayStr = format(d, 'yyyy-MM-dd', { locale: es });
              const areaScore = computeAreaScoreAtTime({
                area,
                events: eventsForArea,
                variableById,
                at: endOfDay(d),
              });
              dailyStates.push({ date: dayStr, state: areaScore.state });
          }
          matrix.push({ id: area.area_id, area: area.area_nombre, dailyStates });
      });
      return matrix;
  }, [userData?.areas, userData?.variables, eventsInDateRange, dateRange]);

  const areaContributionData = useMemo(() => {
    if (!userData?.variables || !selectedAreaForCharts) return { positive: 0, negative: 0 };
    
    const areaVariables = userData.variables.filter(v => v.area_id === selectedAreaForCharts);
    const areaVariableIds = new Set(areaVariables.map(v => v.var_id));
    const variableById = new Map(areaVariables.map(v => [v.var_id, v]));
    const now = new Date();
    const eventsForArea = eventsInDateRange.filter(e => areaVariableIds.has(e.var_id));

    return eventsForArea.reduce((acc, event) => {
        const variable = variableById.get(event.var_id);
        if (!variable) return acc;

        const impact = computeAreaEventContributionAtTime(event, variable, now);
        if (impact > 0) {
            acc.positive += impact;
        } else {
            acc.negative += impact;
        }
        return acc;
    }, { positive: 0, negative: 0 });
  }, [eventsInDateRange, userData?.variables, selectedAreaForCharts]);

  const areaWaterfallData = useMemo(() => {
    if (!userData?.variables || !selectedAreaForCharts || !eventsInDateRange) return [];
    
    const data: { name: string, value: number, offset: number, type: 'start' | 'increase' | 'decrease' | 'total' }[] = [];
    const areaVariables = userData.variables.filter(v => v.area_id === selectedAreaForCharts);
    const areaVariableIds = new Set(areaVariables.map(v => v.var_id));
    const variableById = new Map(areaVariables.map(v => [v.var_id, v]));
    const now = new Date();
    
    const eventsForArea = eventsInDateRange
        .filter(e => areaVariableIds.has(e.var_id))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    let runningTotal = 70;

    data.push({ name: 'Partida', value: runningTotal, offset: 0, type: 'start' });

    eventsForArea.forEach((event) => {
      const variable = variableById.get(event.var_id);
      if (!variable) return;

      const impact = computeAreaEventContributionAtTime(event, variable, now);
      if (Math.abs(impact) < 0.05) return;
      
      if (impact > 0) {
        data.push({ name: `${variable.var_nombre.substring(0, 10)}...`, value: impact, offset: runningTotal, type: 'increase' });
      } else {
        data.push({ name: `${variable.var_nombre.substring(0, 10)}...`, value: Math.abs(impact), offset: runningTotal + impact, type: 'decrease' });
      }
      runningTotal += impact;
    });

    data.push({ name: 'Final', value: Math.max(0, Math.min(100, runningTotal)), offset: 0, type: 'total' });
    return data;
  }, [eventsInDateRange, userData?.variables, selectedAreaForCharts]);

  const areaDecayTimelineData = useMemo(() => {
    if (!userData?.variables || !selectedAreaForCharts) return [];
    const range = dateRange ?? { from: subDays(new Date(), 6), to: new Date() };
    if (!range.from) return [];

    const start = startOfDay(range.from);
    const end = range.to ? endOfDay(range.to) : endOfDay(new Date());
    const areaVariables = userData.variables.filter(v => v.area_id === selectedAreaForCharts);
    const variableById = new Map(areaVariables.map(v => [v.var_id, v]));
    const areaVarIds = new Set(areaVariables.map(v => v.var_id));
    const eventsForArea = eventsInDateRange.filter(e => areaVarIds.has(e.var_id));
    const rows: Array<{ date: string; net: number; positive: number; negative: number }> = [];

    for (let d = start; d <= end; d = addDays(d, 1)) {
      const at = endOfDay(d);
      let positive = 0;
      let negative = 0;

      eventsForArea.forEach((event) => {
        const variable = variableById.get(event.var_id);
        if (!variable) return;
        const impact = computeAreaEventContributionAtTime(event, variable, at);
        if (impact > 0) positive += impact;
        else negative += impact;
      });

      rows.push({
        date: format(d, 'yyyy-MM-dd', { locale: es }),
        net: Math.round((positive + negative) * 100) / 100,
        positive: Math.round(positive * 100) / 100,
        negative: Math.round(negative * 100) / 100,
      });
    }
    return rows;
  }, [userData?.variables, selectedAreaForCharts, dateRange, eventsInDateRange]);

  const hormoneAnalysisData = useMemo(() => {
    if (!selectedHormoneId || !userData || !dateRange?.from || !userData.impactMatrix) return null;

    const { hormones, impactMatrix, variables } = userData;
    const selectedHormone = hormones.find(h => h.hormone_id === selectedHormoneId);
    if (!selectedHormone) return null;

    const calculateLevelAt = (date: Date) => {
        let levelAtDate = selectedHormone.baseline;
        const relevantImpacts = impactMatrix.filter(im => im.hormone_id === selectedHormoneId);
        const relevantVarIds = new Set(relevantImpacts.map(im => im.var_id));
        
        const pastEvents = userData.events.filter(e => { 
            const eventDate = parseISO(e.fecha);
            return relevantVarIds.has(e.var_id) && !isAfter(eventDate, date);
        });

        pastEvents.forEach(event => {
            const eventImpact = relevantImpacts.find(im => im.var_id === event.var_id)!;
            const eventDate = parseISO(event.fecha);
            const hoursSinceEvent = differenceInHours(date, eventDate);

            if (hoursSinceEvent < 0) return;

            const peakEffect = eventImpact.effect_size * (event.intensidad / 5);

            if (hoursSinceEvent <= eventImpact.duration_hours) {
                levelAtDate += peakEffect;
            } else {
                const hoursAfterPeak = hoursSinceEvent - eventImpact.duration_hours;
                const decayCycles = hoursAfterPeak / selectedHormone.half_life_hours;
                const decayFactor = Math.pow(0.5, decayCycles);
                levelAtDate += peakEffect * decayFactor;
            }
        });
        return Math.round(Math.max(0, Math.min(100, levelAtDate)));
    };
    
    const curveData = [];
    const now = dateRange.to || new Date();
    const start = dateRange.from;

    for (let d = start; d <= now; d = addDays(d, 1)) {
        curveData.push({
            date: format(d, 'E', { locale: es }),
            level: calculateLevelAt(d),
        });
    }

    const currentLevel = calculateLevelAt(now);
    const level24hAgo = calculateLevelAt(subDays(now, 1));
    const level7dAgo = calculateLevelAt(subDays(now, 7));

    const triggerImpacts: { [varId: string]: number } = {};
    const eventsInRange = eventsInDateRange;

    eventsInRange.forEach(event => {
        const eventImpact = impactMatrix.find(im => im.var_id === event.var_id && im.hormone_id === selectedHormoneId);
        if (eventImpact) {
            const impactValue = eventImpact.effect_size * (event.intensidad / 5);
            triggerImpacts[event.var_id] = (triggerImpacts[event.var_id] || 0) + impactValue;
        }
    });
    
    const allTriggers = Object.entries(triggerImpacts).map(([varId, impact]) => ({
        name: variables.find(v => v.var_id === varId)?.var_nombre || varId,
        impact,
    }));
    
    const topGains = allTriggers.filter(t => t.impact > 0).sort((a,b) => b.impact - a.impact).slice(0, 3);
    const topDrains = allTriggers.filter(t => t.impact < 0).sort((a,b) => a.impact - b.impact).slice(0, 3);

    const deviation = currentLevel - selectedHormone.baseline;
    let insight = "";
    if (Math.abs(deviation) > 5) {
        const timeToHalf = selectedHormone.half_life_hours;
        if (deviation > 0) {
             insight = `Tu nivel de ${selectedHormone.name} está elevado. Sin nuevos estímulos, la desviación se reducirá a la mitad en ~${timeToHalf} horas.`;
        } else {
            insight = `Tu nivel de ${selectedHormone.name} está bajo. El sistema volverá a la línea base naturalmente.`;
        }
    }

    return {
        curveData,
        topTriggers: { gains: topGains, drains: topDrains },
        halfLifeInsight: insight,
        currentLevel: currentLevel,
        baseline: selectedHormone.baseline,
        delta24h: currentLevel - level24hAgo,
        delta7d: currentLevel - level7dAgo,
    };

}, [selectedHormoneId, userData, dateRange, eventsInDateRange]);

  const variableRankingData = useMemo(() => {
    if (!filteredEventsForVariables || !userData?.variables) return [];
    
    const impactMap: { [key: string]: { name: string, impact: number } } = {};

    filteredEventsForVariables.forEach(event => {
        const variable = userData.variables.find(v => v.var_id === event.var_id);
        if (!variable) return;

        const impact = variable.polaridad * variable.impacto_base * (event.intensidad / 5);
        
        if (!impactMap[variable.var_id]) {
            impactMap[variable.var_id] = { name: variable.var_nombre, impact: 0 };
        }
        impactMap[variable.var_id].impact += impact;
    });

    return Object.values(impactMap);
  }, [filteredEventsForVariables, userData?.variables]);

  const frequencyImpactData = useMemo(() => {
    if (!filteredEventsForVariables || !userData?.variables) return [];
    
    const statsMap: { [key: string]: { name: string, frequency: number, impact: number, totalIntensity: number } } = {};

    filteredEventsForVariables.forEach(event => {
        const variable = userData.variables.find(v => v.var_id === event.var_id);
        if (!variable) return;

        const impact = variable.polaridad * variable.impacto_base * (event.intensidad / 5);
        
        if (!statsMap[variable.var_id]) {
            statsMap[variable.var_id] = { name: variable.var_nombre, frequency: 0, impact: 0, totalIntensity: 0 };
        }
        statsMap[variable.var_id].frequency += 1;
        statsMap[variable.var_id].impact += impact;
        statsMap[variable.var_id].totalIntensity += event.intensidad;
    });

    return Object.values(statsMap).map(s => ({
        name: s.name,
        frequency: s.frequency,
        impact: s.impact,
        intensity: s.totalIntensity / s.frequency,
    }));
  }, [filteredEventsForVariables, userData?.variables]);

  const dailyDominanceData = useMemo(() => {
    if (!filteredEventsForVariables || !userData?.variables || !dateRange?.from) return [];
    const dailyData: { [date: string]: { [varName: string]: number } } = {};

    for (let d = startOfDay(dateRange.from); d <= (dateRange.to || new Date()); d = addDays(d, 1)) {
        const dayStr = format(d, 'yyyy-MM-dd', { locale: es });
        dailyData[dayStr] = {};
    }

    filteredEventsForVariables.forEach(event => {
        const eventDate = new Date(event.fecha);
        const dayStr = format(eventDate, 'yyyy-MM-dd', { locale: es });
        const variable = userData.variables.find(v => v.var_id === event.var_id);
        
        if (variable && dailyData[dayStr]) {
            const impact = variable.polaridad * variable.impacto_base * (event.intensidad / 5);
            dailyData[dayStr][variable.var_nombre] = (dailyData[dayStr][variable.var_nombre] || 0) + impact;
        }
    });

    return Object.entries(dailyData)
      .map(([date, impacts]) => ({ date, ...impacts }))
      .filter((row) => {
        const values = Object.entries(row)
          .filter(([k]) => k !== 'date')
          .map(([, v]) => Number(v) || 0);
        return values.some((v) => Math.abs(v) > 0.001);
      });
  }, [filteredEventsForVariables, userData?.variables, dateRange]);


  const impulsiveImpactData = useMemo(() => {
    if (!filteredEventsForVariables || !userData?.variables) return [];

    const impulsiveVars = ['DOPA_RAP', 'GASTO_IMP', 'ALIM_BASURA', 'REACTIVIDAD'];
    const impactMap: { [key: string]: { name: string, impulsive: number, planned: number } } = {};

    filteredEventsForVariables.forEach(event => {
      const variable = userData.variables.find(v => v.var_id === event.var_id);
      if (!variable || !impulsiveVars.includes(variable.var_id)) return;
      
      if (!impactMap[variable.var_id]) {
        impactMap[variable.var_id] = { name: variable.var_nombre, impulsive: 0, planned: 0 };
      }

      const impact = variable.polaridad * variable.impacto_base * (event.intensidad / 5);

      if (event.impulsivo) {
        impactMap[variable.var_id].impulsive += impact;
      } else {
        impactMap[variable.var_id].planned += impact;
      }
    });

    return Object.values(impactMap)
      .map(item => ({
          ...item,
          impulsive: Math.abs(item.impulsive),
          planned: Math.abs(item.planned),
      }))
      .filter(item => (item.impulsive + item.planned) > 0.001)
      .sort((a, b) => (b.impulsive + b.planned) - (a.impulsive + a.planned))
      .slice(0, 8);
  }, [filteredEventsForVariables, userData?.variables]);

  const cooccurrenceData = useMemo(() => {
    if (!filteredEventsForVariables || !userData?.variables || filteredEventsForVariables.length < 2) return { matrix: {}, labels: [], varNames: {} };
    
    const WINDOW_HOURS = 24;
    const matrix: { [key: string]: { [key: string]: number } } = {};
    const varNames: { [key: string]: string } = {};

    const negativeVarIds = new Set(userData.variables.filter(v => v.polaridad === -1).map(v => v.var_id));
    const relevantEvents = filteredEventsForVariables
      .filter(e => negativeVarIds.has(e.var_id))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    if (relevantEvents.length < 2) return { matrix: {}, labels: [], varNames: {} };

    const uniqueVarIds = [...new Set(relevantEvents.map(e => e.var_id))];
    uniqueVarIds.forEach(varId => {
        varNames[varId] = userData?.variables.find(uv => uv.var_id === varId)?.var_nombre || varId;
    });
    const labels = uniqueVarIds;

    labels.forEach(v1 => {
        matrix[v1] = {};
        labels.forEach(v2 => { matrix[v1][v2] = 0; });
    });

    for (let i = 0; i < relevantEvents.length; i++) {
        for (let j = i + 1; j < relevantEvents.length; j++) {
            const eventA = relevantEvents[i];
            const eventB = relevantEvents[j];
            const timeDiffHours = Math.abs(differenceInHours(parseISO(eventA.fecha), parseISO(eventB.fecha)));
            if (timeDiffHours > WINDOW_HOURS) break;
            if (eventA.var_id !== eventB.var_id) {
                const var1 = eventA.var_id;
                const var2 = eventB.var_id;
                if (matrix[var1] && matrix[var2]) {
                  matrix[var1][var2]++;
                  matrix[var2][var1]++;
                }
            }
        }
    }
    return { matrix, labels, varNames };
  }, [filteredEventsForVariables, userData?.variables]);
  
  const topConnectionsData: Connection[] = useMemo(() => {
    if (!userData?.impactMatrix || !userData.variables || !userData.hormones) return [];

    return userData.impactMatrix
      .map(im => ({ ...im, absEffect: Math.abs(im.effect_size) }))
      .sort((a, b) => b.absEffect - a.absEffect)
      .slice(0, 10)
      .map(im => ({
        id: im.matrix_id,
        varName: userData.variables.find(v => v.var_id === im.var_id)?.var_nombre || im.var_id,
        hormoneName: userData.hormones.find(h => h.hormone_id === im.hormone_id)?.name || im.hormone_id,
        effectSize: im.effect_size
      }));
  }, [userData]);

  const skillProgressData = useMemo(() => {
    if (!userData?.skills || !userData.systems || !userData.habits || !eventsInDateRange) return [];
    const freqMap: Record<string, number> = {};
    userData.skills.forEach(skill => {
        const systemsForSkill = userData.systems.filter(s => s.habilidad_id === skill.habilidad_id);
        const systemIds = systemsForSkill.map(s => s.sistema_id);
        const habitsForSystems = userData.habits.filter(h => systemIds.includes(h.sistema_id));
        const varIds = new Set(habitsForSystems.map(h => h.var_id));
        const count = eventsInDateRange.filter(e => varIds.has(e.var_id)).length;
        freqMap[skill.habilidad_id] = count;
    });
    return [...userData.skills].sort((a, b) => (freqMap[b.habilidad_id] || 0) - (freqMap[a.habilidad_id] || 0));
  }, [userData?.skills, userData?.systems, userData?.habits, eventsInDateRange]);
  
  const skillActivityData = useMemo(() => {
    if (!userData?.skills || !userData.systems || !userData.habits || !eventsInDateRange) return [];
    const skillsWithVarIds = userData.skills.map(skill => {
        const systemsForSkill = userData.systems.filter(s => s.habilidad_id === skill.habilidad_id);
        const systemIds = systemsForSkill.map(s => s.sistema_id);
        const habitsForSystems = userData.habits.filter(h => systemIds.includes(h.sistema_id));
        const varIds = new Set(habitsForSystems.map(h => h.var_id));
        return { ...skill, varIds };
    });
    return skillsWithVarIds.map(skill => {
        const eventCount = eventsInDateRange.filter(e => skill.varIds.has(e.var_id)).length;
        return { name: skill.nombre, count: eventCount };
    }).sort((a, b) => b.count - a.count);
  }, [userData?.skills, userData?.systems, userData?.habits, eventsInDateRange]);
  
  const skillConsistencyData = useMemo(() => {
    if (!selectedSkillId || !userData?.skills || !userData.systems || !userData.habits || !eventsInDateRange) return { activeDays: [] };
    const skill = userData.skills.find(s => s.habilidad_id === selectedSkillId);
    if (!skill) return { activeDays: [] };
    const systemsForSkill = userData.systems.filter(s => s.habilidad_id === skill.habilidad_id);
    const systemIds = systemsForSkill.map(s => s.sistema_id);
    const habitsForSystems = userData.habits.filter(h => systemIds.includes(h.sistema_id));
    const varIds = new Set(habitsForSystems.map(h => h.var_id));
    const activeDays = new Set<string>();
    eventsInDateRange.forEach(event => {
        if (varIds.has(event.var_id)) {
            activeDays.add(format(parseISO(event.fecha), 'yyyy-MM-dd'));
        }
    });
    return { activeDays: Array.from(activeDays) };
  }, [selectedSkillId, userData?.skills, userData?.systems, userData?.habits, eventsInDateRange]);

  const skillVelocityData = useMemo(() => {
    if (!userData?.skills || !userData.systems || !userData.habits || !eventsInDateRange || !dateRange?.from || !dateRange?.to) return [];
    const skillsWithVarIds = userData.skills.map(skill => {
        const systemsForSkill = userData.systems.filter(s => s.habilidad_id === skill.habilidad_id);
        const systemIds = systemsForSkill.map(s => s.sistema_id);
        const habitsForSystems = userData.habits.filter(h => systemIds.includes(h.sistema_id));
        const varIds = new Set(habitsForSystems.map(h => h.var_id));
        return { ...skill, varIds };
    });
    const numWeeks = differenceInDays(dateRange.to, dateRange.from) / 7;
    if (numWeeks < 0.5) return []; 
    return skillsWithVarIds.map(skill => {
        const relevantEvents = eventsInDateRange.filter(e => skill.varIds.has(e.var_id));
        const eventsPerWeek = relevantEvents.length / numWeeks;
        const targetEventsPerWeek = 7;
        const velocityScore = Math.min(10, (eventsPerWeek / targetEventsPerWeek) * 10);
        return { name: skill.nombre, velocity: parseFloat(velocityScore.toFixed(1)) };
    }).sort((a, b) => b.velocity - a.velocity);
  }, [userData?.skills, userData?.systems, userData?.habits, eventsInDateRange, dateRange]);

  const systemActivityData = useMemo(() => {
    if (!userData?.systems || !userData.habits || !eventsInDateRange) return [];
    return userData.systems.map(system => {
        const habitsForSystem = userData.habits.filter(h => h.sistema_id === system.sistema_id);
        const varIds = new Set(habitsForSystem.map(h => h.var_id));
        const eventCount = eventsInDateRange.filter(e => varIds.has(e.var_id)).length;
        return { name: system.objetivo, count: eventCount };
    }).sort((a, b) => b.count - a.count);
  }, [userData?.systems, userData?.habits, eventsInDateRange]);

  const failureProtocolData = useMemo(() => {
    if (!userData?.systems || !userData.protocols || !eventsInDateRange) return [];
    const failureProtocolEvents = eventsInDateRange.filter(e => e.tipo === 'Protocolo');
    const protocolCounts: { [protocolId: string]: number } = {};
    failureProtocolEvents.forEach(event => {
        const isFailureProtocol = userData.systems.some(s => s.protocolo_fallo === event.var_id);
        if (isFailureProtocol) {
            protocolCounts[event.var_id] = (protocolCounts[event.var_id] || 0) + 1;
        }
    });
    return Object.entries(protocolCounts).map(([protocolId, count]) => {
        const protocol = userData.protocols.find(p => p.protocolo_id === protocolId);
        return { name: protocol?.nombre || protocolId, count };
    }).sort((a, b) => b.count - a.count);
  }, [userData?.systems, userData?.protocols, eventsInDateRange]);

  const habitActivityData = useMemo(() => {
    if (!userData?.habits || !userData.variables || !eventsInDateRange) return [];
    const habitVarIds = new Set(userData.habits.map(h => h.var_id));
    const activity: {[varId: string]: number} = {};
    eventsInDateRange.forEach(event => {
        if (habitVarIds.has(event.var_id)) {
            activity[event.var_id] = (activity[event.var_id] || 0) + 1;
        }
    });
    return Object.entries(activity).map(([varId, count]) => {
        const variable = userData.variables.find(v => v.var_id === varId);
        return { name: variable?.var_nombre || varId, count };
    }).sort((a, b) => b.count - a.count);
  }, [userData?.habits, userData?.variables, eventsInDateRange]);

  const protocolExecutionData = useMemo(() => {
    if (!userData?.protocols || !eventsInDateRange) return [];
    const protocolEvents = eventsInDateRange.filter(e => e.tipo === 'Protocolo');
    const protocolCounts: { [protocolId: string]: number } = {};
    protocolEvents.forEach(event => {
        protocolCounts[event.var_id] = (protocolCounts[event.var_id] || 0) + 1;
    });
    return Object.entries(protocolCounts).map(([protocolId, count]) => {
        const protocol = userData.protocols.find(p => p.protocolo_id === protocolId);
        return { name: protocol?.nombre || protocolId, count };
    }).sort((a, b) => b.count - a.count);
  }, [userData?.protocols, eventsInDateRange]);

  const stateDistributionData = useMemo(() => {
    if (!globalStateTimeline) return [];
    const counts = globalStateTimeline.reduce((acc, day) => {
        acc[day.state] = (acc[day.state] || 0) + 1;
        return acc;
    }, {} as {[key in 'OK' | 'RIESGO' | 'CRITICO']: number});
    return [
        { name: 'OK' as const, value: counts.OK || 0, fill: 'hsl(var(--chart-2))' },
        { name: 'RIESGO' as const, value: counts.RIESGO || 0, fill: 'hsl(var(--chart-4))' },
        { name: 'CRITICO' as const, value: counts.CRITICO || 0, fill: 'hsl(var(--chart-3))' },
    ];
  }, [globalStateTimeline]);

  const eventFrequencyData = useMemo(() => {
    if (!eventsInDateRange || !dateRange?.from) return [];
    const counts: {[date: string]: number} = {};
    for (let d = startOfDay(dateRange.from); d <= (dateRange.to || new Date()); d = addDays(d, 1)) {
        const dayStr = format(d, 'yyyy-MM-dd', { locale: es });
        counts[dayStr] = 0;
    }
    eventsInDateRange.forEach(event => {
        const eventDate = new Date(event.fecha);
        const dayStr = format(eventDate, 'yyyy-MM-dd', { locale: es });
        if(counts[dayStr] !== undefined) counts[dayStr]++;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [eventsInDateRange, dateRange]);

  const relationMatrixData = useMemo(() => {
    if (!userData?.relations) return [];
    const frequencyToSize: { [key: string]: number } = { 'Diaria': 5, 'Semanal': 4, 'Mensual': 3, 'Ocasional': 2 };
    return userData.relations.map(r => ({
        name: r.nombre,
        energy: r.energia_neta,
        respect: r.respeto,
        size: frequencyToSize[r.frecuencia] || 1,
    }));
  }, [userData?.relations]);


  const [activeTab, setActiveTab] = useState('general');
  const [inactiveTabsStartIndex, setInactiveTabsStartIndex] = useState(0);
  const [tabsPerPage, setTabsPerPage] = useState(8);

  useEffect(() => {
    const handleResize = () => { setTabsPerPage(getTabsPerPage(window.innerWidth)); };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabChange = (newTab: string) => { setActiveTab(newTab); };
  
  const activeTabConfig = tabsConfig.find(tab => tab.value === activeTab);
  const inactiveTabs = tabsConfig.filter(tab => tab.value !== activeTab);

  const handlePrev = () => { setInactiveTabsStartIndex(prev => Math.max(0, prev - 1)); };
  const handleNext = () => {
    const newIndex = inactiveTabsStartIndex + 1;
    if (newIndex + tabsPerPage -1 <= inactiveTabs.length) setInactiveTabsStartIndex(newIndex);
  };
  
  const visibleInactiveTabs = inactiveTabs.slice(inactiveTabsStartIndex, inactiveTabsStartIndex + tabsPerPage - 1);
  const visibleTabs = activeTabConfig ? [activeTabConfig, ...visibleInactiveTabs] : visibleInactiveTabs;

  const canGoPrev = inactiveTabsStartIndex > 0;
  const canGoNext = inactiveTabsStartIndex + tabsPerPage -1 < inactiveTabs.length;

  if (isLoading && !userData) return <DashboardLoading />;

  return (
    <div className="space-y-6 px-2 sm:px-3 lg:px-4">
        <NavigationReady />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Visualiza tendencias, biomarcadores y patrones de comportamiento para optimizar tu rendimiento.</p>
                {isLoading && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
                        <Loader2 className="h-3 w-3 animate-spin" /> Actualizando motor...
                    </div>
                )}
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>

        {userData ? (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <div className="sm:hidden">
                    <Select value={activeTab} onValueChange={handleTabChange}>
                        <SelectTrigger><SelectValue placeholder="Selecciona una sección" /></SelectTrigger>
                        <SelectContent>
                            {tabsConfig.map(({ value, label, icon: Icon }) => (
                                <SelectItem key={value} value={value}>
                                    <div className="flex items-start flex-wrap">
                                        <Icon className="mr-2 h-4 w-4" />
                                        <span className="break-words whitespace-normal">{label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="hidden sm:flex items-center space-x-1">
                    <TabsList className="flex-grow justify-start h-auto">
                        {visibleTabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">
                                <tab.icon className="mr-2 h-4 w-4" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={handlePrev} disabled={!canGoPrev}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={handleNext} disabled={!canGoNext}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className='w-full'>
                    <TabsContent value="general">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <DailyScoreChart data={dailyScoreTrend} />
                            <GlobalStateTimelineChart data={globalStateTimeline} />
                            <PeriodDriversChart data={periodDrivers} />
                            <StabilityScoreChart index={stabilityIndex} />
                        </div>
                        <div className="mt-6">
                            <WeeklyHeatmapChart data={weeklyHeatmapData} />
                        </div>
                    </TabsContent>
                    <TabsContent value="patrones" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <CorrelationScatterChart 
                                title="Descanso vs. Productividad" 
                                description="¿Cómo afecta la calidad de tu sueño a tu capacidad de realizar trabajo profundo?"
                                data={correlationData.sleepFocus}
                                xLabel="Intensidad Sueño"
                                yLabel="Sesiones Deep Work"
                            />
                            <CorrelationScatterChart 
                                title="Estrés vs. Impulsividad" 
                                description="Correlación entre tus picos de estrés y el volumen de gastos no planificados."
                                data={correlationData.stressSpending}
                                xLabel="Nivel de Estrés"
                                yLabel="Gasto Impulsivo"
                                yUnit="€"
                            />
                            <CorrelationScatterChart 
                                title="Dopamina vs. Disciplina" 
                                description="El impacto del consumo de dopamina rápida en tu puntuación de disciplina diaria."
                                data={correlationData.dopamineDiscipline}
                                xLabel="Intensidad Dopa Rápida"
                                yLabel="Puntaje Disciplina"
                            />
                            <Card className="flex flex-col justify-center border-dashed border-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-primary"><BrainCircuit className="h-5 w-5" /> Motor de Correlaciones IA</CardTitle>
                                    <CardDescription>El sistema está analizando más variables en segundo plano.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        A medida que registres más interacciones sociales y transacciones, Axiom podrá detectar patrones complejos como el impacto de tu círculo social en tu salud financiera o el efecto de la dieta en tu claridad mental.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="areas" className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Filtro de Área</CardTitle><CardDescription>Selecciona un área para ver su análisis detallado.</CardDescription></CardHeader>
                            <CardContent>
                                <Select value={selectedAreaForCharts ?? ''} onValueChange={(value) => setSelectedAreaForCharts(value)}>
                                    <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Selecciona un área..." /></SelectTrigger>
                                    <SelectContent>
                                        {(userData?.areas || []).map((area, idx) => (
                                            <SelectItem key={`${area.area_id}-${idx}`} value={area.area_id}>{area.area_nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ScoreByAreaChart data={scoresByArea} />
                            <AreaTrendChart data={areaTrendData} />
                            <AreaStatusMatrixChart data={areaStatusMatrixData} />
                            <AreaContributionChart data={areaContributionData} />
                        </div>
                        <div className="mt-6">
                            <AreaWaterfallChart data={areaWaterfallData} />
                        </div>
                        <div className="mt-6">
                            <AreaDecayTimelineChart data={areaDecayTimelineData} />
                        </div>
                    </TabsContent>
                    <TabsContent value="hormones" className="space-y-6">
                        <HormoneLevelsChart data={userData.hormones || []} />
                        <Card>
                            <CardHeader><CardTitle>Análisis Detallado de Hormona</CardTitle><CardDescription>Selecciona una hormona para ver su evolución, disparadores y métricas clave.</CardDescription></CardHeader>
                            <CardContent>
                                <Select value={selectedHormoneId ?? ''} onValueChange={setSelectedHormoneId}>
                                    <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Selecciona una hormona..." /></SelectTrigger>
                                    <SelectContent>
                                        {(userData?.hormones || []).map((hormone, idx) => (
                                            <SelectItem key={`${hormone.hormone_id}-${idx}`} value={hormone.hormone_id}>{hormone.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        {selectedHormoneId && hormoneAnalysisData ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <HormoneCurveChart data={hormoneAnalysisData.curveData} hormoneName={userData.hormones.find(h => h.hormone_id === selectedHormoneId)?.name || ''} />
                                    <HormoneTriggersChart data={hormoneAnalysisData.topTriggers} hormoneName={userData.hormones.find(h => h.hormone_id === selectedHormoneId)?.name || ''} />
                                </div>
                                <Card>
                                    <CardHeader><CardTitle>Información Adicional</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        {hormoneAnalysisData.halfLifeInsight && <p className="text-sm text-muted-foreground">{hormoneAnalysisData.halfLifeInsight}</p>}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-muted/50 rounded-lg">
                                                <p className="text-sm text-muted-foreground">Delta 24h</p>
                                                <div className={`flex items-center text-lg font-bold ${hormoneAnalysisData.delta24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {hormoneAnalysisData.delta24h >= 0 ? <TrendingUp className="h-5 w-5 mr-2"/> : <TrendingDown className="h-5 w-5 mr-2"/>}
                                                    {hormoneAnalysisData.delta24h.toFixed(1)}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-muted/50 rounded-lg">
                                                <p className="text-sm text-muted-foreground">Delta 7d</p>
                                                <div className={`flex items-center text-lg font-bold ${hormoneAnalysisData.delta7d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {hormoneAnalysisData.delta7d >= 0 ? <TrendingUp className="h-5 w-5 mr-2"/> : <TrendingDown className="h-5 w-5 mr-2"/>}
                                                    {hormoneAnalysisData.delta7d.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <Card><CardContent className="h-[200px] flex items-center justify-center"><p className="text-muted-foreground">Selecciona una hormona para ver el análisis detallado.</p></CardContent></Card>
                        )}
                    </TabsContent>
                    <TabsContent value="variables" className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Filtros de Variables y Eventos</CardTitle><CardDescription>Refina los datos que se muestran en los gráficos de esta pestaña.</CardDescription></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-start">
                                <div className="space-y-2">
                                    <Label htmlFor="mode-filter-vars">Impacto de Eventos</Label>
                                    <Select value={modeForVariables} onValueChange={(v) => setModeForVariables(v as any)}>
                                        <SelectTrigger id="mode-filter-vars"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los impactos</SelectItem>
                                            <SelectItem value="positive">Solo positivos</SelectItem>
                                            <SelectItem value="negative">Solo negativos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Intensidad Mínima: {minIntensityForVariables}</Label>
                                    <Slider min={1} max={5} step={1} value={[minIntensityForVariables]} onValueChange={(v) => setMinIntensityForVariables(v[0])} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Comportamiento Impulsivo</Label>
                                    <div className="flex items-center space-x-2 pt-2">
                                        <Switch id="impulsive-filter-vars" checked={impulsiveOnlyForVariables} onCheckedChange={setImpulsiveOnlyForVariables} />
                                        <Label htmlFor="impulsive-filter-vars" className="font-normal">Mostrar solo impulsivos</Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                            <VariableRankingChart data={variableRankingData} />
                            <FrequencyImpactChart data={frequencyImpactData} />
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                            <DailyVariableDominanceChart data={dailyDominanceData} />
                            <ImpulsiveImpactChart data={impulsiveImpactData} />
                        </div>
                        <CooccurrenceMatrixChart data={cooccurrenceData} />
                    </TabsContent>
                    <TabsContent value="impactMatrix" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1"><TopConnectionsList connections={topConnectionsData} /></div>
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader><CardTitle>Efecto Acumulado por Hormona</CardTitle><CardDescription>Selecciona una hormona para ver el impacto total de las variables en el periodo.</CardDescription></CardHeader>
                                    <CardContent className="space-y-4">
                                        <Select value={selectedHormoneId ?? ''} onValueChange={setSelectedHormoneId}>
                                            <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Selecciona una hormona..." /></SelectTrigger>
                                            <SelectContent>
                                                {(userData?.hormones || []).map((hormone, idx) => (
                                                    <SelectItem key={`${hormone.hormone_id}-${idx}`} value={hormone.hormone_id}>{hormone.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedHormoneId && hormoneAnalysisData ? (
                                            <HormoneTriggersChart data={hormoneAnalysisData.topTriggers} hormoneName={userData.hormones.find(h => h.hormone_id === selectedHormoneId)?.name || ''} />
                                        ) : (
                                            <div className="h-[150px] flex items-center justify-center"><p className="text-muted-foreground">Selecciona una hormona.</p></div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                        <ImpactMatrixHeatmap impactMatrix={userData.impactMatrix || []} variables={userData.variables || []} hormones={userData.hormones || []} />
                    </TabsContent>
                    <TabsContent value="skills" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <SkillProgressChart data={skillProgressData} />
                            <SkillActivityChart data={skillActivityData} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <SkillVelocityChart data={skillVelocityData} />
                            <Card>
                            <CardHeader><CardTitle>Consistencia de Habilidad</CardTitle><CardDescription>Selecciona una habilidad para ver tu consistencia en el periodo.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                    <Select value={selectedSkillId ?? ''} onValueChange={setSelectedSkillId}>
                                    <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Selecciona una habilidad..." /></SelectTrigger>
                                    <SelectContent>
                                        {(userData?.skills || []).map((skill, idx) => (
                                            <SelectItem key={`${skill.habilidad_id}-${idx}`} value={skill.habilidad_id}>{skill.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                <SkillConsistencyChart activeDays={skillConsistencyData.activeDays} dateRange={dateRange} />
                            </CardContent>
                        </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="systems" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <SystemActivityChart data={systemActivityData} />
                            <FailureProtocolChart data={failureProtocolData} />
                        </div>
                    </TabsContent>
                    <TabsContent value="habits" className="space-y-4"><HabitActivityChart data={habitActivityData} /></TabsContent>
                    <TabsContent value="protocols" className="space-y-4"><ProtocolExecutionChart data={protocolExecutionData} /></TabsContent>
                    <TabsContent value="states" className="space-y-4"><StateDistributionChart data={stateDistributionData} /></TabsContent>
                    <TabsContent value="events" className="space-y-4"><EventFrequencyChart data={eventFrequencyData} /></TabsContent>
                    <TabsContent value="transactions" className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Filtro de Transacciones</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2">
                                    <Switch id="impulsive-transactions" checked={impulsiveOnlyForTransactions} onCheckedChange={setImpulsiveOnlyForTransactions} />
                                    <Label htmlFor="impulsive-transactions" className="font-normal">Mostrar solo gastos impulsivos</Label>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Filtra para aislar el impacto de acciones no planificadas.</p>
                            </CardContent>
                        </Card>
                        <IncomeExpenseChart income={filteredFinancials.totalIncome} expenses={filteredFinancials.totalExpenses} />
                    </TabsContent>
                    <TabsContent value="interactions" className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Filtro de Interacciones</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label htmlFor="interaction-mode-filter">Impacto Energético</Label>
                                    <Select value={modeForInteractions} onValueChange={(v) => setModeForInteractions(v as any)}>
                                        <SelectTrigger id="interaction-mode-filter"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los impactos</SelectItem>
                                            <SelectItem value="positive">Solo positivos</SelectItem>
                                            <SelectItem value="negative">Solo negativos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                        <RelationshipEnergyChart data={relationshipEnergy} />
                    </TabsContent>
                    <TabsContent value="relations" className="space-y-4"><RelationMatrixChart data={relationMatrixData} /></TabsContent>
                    <TabsContent value="accounts" className="space-y-4"><AccountBalanceChart data={userData.accounts || []} /></TabsContent>
                    <TabsContent value="debts" className="space-y-4"><DebtBalanceChart data={userData.debts || []} /></TabsContent>
                </div>
            </Tabs>
        ) : (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4 border rounded-xl bg-muted/10 animate-in fade-in duration-500">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Sincronizando Analíticas...</p>
            </div>
        )}
    </div>
  );
}




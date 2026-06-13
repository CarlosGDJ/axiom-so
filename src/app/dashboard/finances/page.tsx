
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateRange } from 'react-day-picker';
import {
    startOfMonth,
    endOfMonth,
    parseISO,
    format,
    eachMonthOfInterval,
    startOfYear,
    addDays,
    differenceInCalendarDays,
    startOfDay,
    endOfDay,
    getDay,
    getHours
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    TrendingUp, 
    TrendingDown, 
    Wallet, 
    PiggyBank, 
    Zap, 
    ArrowUpRight, 
    ArrowDownRight,
    Loader2,
    DollarSign,
    CreditCard,
    Home,
    GraduationCap,
    Utensils,
    Target,
    Activity,
    Landmark,
    ShoppingBag,
    Car,
    AlertCircle,
    Info,
    PlusCircle,
    CalendarClock,
    Receipt,
    CircleDollarSign,
    AlertTriangle,
    ArrowRightLeft,
    Percent,
    Snowflake,
    Flame,
    BarChart2,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell,
    Legend,
    BarChart,
    Bar,
    LineChart,
    Line,
    Sankey
} from 'recharts';
import { DateRangePicker } from '@/components/app/date-range-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import DebtSnowballStrategy from '@/components/app/debt-strategy/debt-snowball-strategy';
import DebtAvalancheStrategy from '@/components/app/debt-strategy/debt-avalanche-strategy';
import DebtStrategyComparison from '@/components/app/debt-strategy/debt-strategy-comparison';
import type { DashboardConfig, Transaction } from '@/lib/types';
import NavigationReady from '@/components/app/navigation-ready';
import TransactionLogForm from '@/components/app/forms/transaction-log-form';
import EditAccountForm from '@/components/app/data-table/forms/edit-account-form';
import EditDebtForm from '@/components/app/data-table/forms/edit-debt-form';
import { useUser } from '@/hooks/use-session-user';
import { setDocumentNonBlocking } from '@/lib/api-writes';
import { useCollection } from '@/hooks/use-mongo-collection';
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(value);
};

const CATEGORY_COLORS: Record<string, string> = {
    Vivienda: 'hsl(var(--chart-1))',
    'Alimentación': 'hsl(var(--chart-2))',
    Transporte: 'hsl(var(--chart-3))',
    'Salud y Bienestar': 'hsl(var(--chart-4))',
    'Ocio y Suscripciones': 'hsl(var(--chart-5))',
    'Desarrollo Personal': 'hsl(var(--primary))',
    Compras: 'hsl(var(--accent-foreground))',
    Deudas: 'hsl(var(--destructive))',
    'Otros Gastos': 'hsl(var(--muted-foreground))'
};

const CATEGORY_ICONS: Record<string, any> = {
    Vivienda: Home,
    'Alimentación': Utensils,
    Transporte: Car,
    'Salud y Bienestar': Activity,
    'Ocio y Suscripciones': Zap,
    'Desarrollo Personal': GraduationCap,
    Compras: ShoppingBag,
    Deudas: AlertCircle,
    'Otros Gastos': Info
};

// Navegación de finanzas — 5 secciones (antes 6; Ingresos se fusionó en Análisis).
const FINANCE_TABS = [
    { value: 'summary',   label: 'Resumen',     icon: Activity },
    { value: 'movements', label: 'Movimientos', icon: ArrowRightLeft },
    { value: 'pockets',   label: 'Pockets',     icon: Target },
    { value: 'evolution', label: 'Análisis',    icon: BarChart2 },
    { value: 'debt',      label: 'Deuda',       icon: CreditCard },
];

export default function FinancesPage() {
    const { user, uid } = useUser();    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    const { data: userData, isLoading: isUserDataLoading } = useUserData(dateRange);
    const [localStrategy, setLocalStrategy] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('summary');
    const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
    const [transactionPrefill, setTransactionPrefill] = useState<any>(null);
    const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'Ingreso' | 'Gasto'>('all');
    const [movementCategoryFilter, setMovementCategoryFilter] = useState<string>('all');
    const [movementAccountFilter, setMovementAccountFilter] = useState<string>('all');
    const [movementImpulsiveFilter, setMovementImpulsiveFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [movementSearch, setMovementSearch] = useState('');
    const [forecastHorizonDays, setForecastHorizonDays] = useState<30 | 90>(30);
    const [showMoreMetrics, setShowMoreMetrics] = useState(false);

    const { data: dashboardConfig, isLoading: isConfigLoading } = useCollection<DashboardConfig>(uid ? 'dashboardConfig' : null, { orderBy: 'key', direction: 'asc' });

    const savedPockets = useMemo(() => {
        const config = dashboardConfig?.find(c => c.key === 'financial_pockets')?.value;
        return config ? JSON.parse(config) : null;
    }, [dashboardConfig]);

    const defaultPockets = useMemo(() => ({
        'Deudas': 1200,
        'Vivienda': 500,
        'Desarrollo Personal': 300,
        'Alimentación': 200,
        'Transporte': 100,
        'Salud y Bienestar': 100,
        'Ocio y Suscripciones': 150,
        'Compras': 100,
    }), []);

    const [pocketsState, setPocketsState] = useState<Record<string, number>>(savedPockets || defaultPockets);

    useEffect(() => {
        if (savedPockets) {
            setPocketsState(savedPockets);
        }
    }, [savedPockets]);

    const stats = useMemo(() => {
        if (!userData) return null;

        const { accounts = [], debts = [], transactions = [], allTransactions = [] } = userData;
        
        const totalAssets = accounts.reduce((acc, a) => acc + (a.saldo || 0), 0);
        const totalDebts = debts.reduce((acc, d) => acc + (d.saldo_actual || 0), 0);
        const netWorth = totalAssets - totalDebts;

        const income = transactions.filter(t => t.tipo === 'Ingreso').reduce((acc, t) => acc + t.monto, 0);
        const expenses = transactions.filter(t => t.tipo === 'Gasto').reduce((acc, t) => acc + Math.abs(t.monto), 0);
        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;
        const periodFrom = dateRange?.from ? startOfDay(dateRange.from) : startOfMonth(new Date());
        const periodTo = dateRange?.to ? endOfDay(dateRange.to) : endOfMonth(new Date());
        const periodDays = Math.max(1, differenceInCalendarDays(periodTo, periodFrom) + 1);
        const burnRateMonthly = expenses > 0 ? (expenses / periodDays) * 30 : 0;
        const runwayMonths = burnRateMonthly > 0 ? totalAssets / burnRateMonthly : null;
        const runwayRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
            runwayMonths === null || runwayMonths >= 9 ? 'LOW' : runwayMonths >= 4 ? 'MEDIUM' : 'HIGH';
        const impulsiveExpenses = transactions
            .filter(t => t.tipo === 'Gasto' && t.impulsivo)
            .reduce((acc, t) => acc + Math.abs(t.monto), 0);
        const impulsiveShare = expenses > 0 ? (impulsiveExpenses / expenses) * 100 : 0;
        const debtPayments = transactions
            .filter(t => t.tipo === 'Gasto' && t.categoria === 'Deudas')
            .reduce((acc, t) => acc + Math.abs(t.monto), 0);
        const debtServiceRatio = income > 0 ? (debtPayments / income) * 100 : 0;
        const avgExpenseTicket = expenses > 0
            ? expenses / Math.max(1, transactions.filter(t => t.tipo === 'Gasto').length)
            : 0;

        // Históricos para recomendaciones
        const historicalAverages: Record<string, number> = {};
        const allExpenses = allTransactions.filter(t => t.tipo === 'Gasto');
        const categories = [...new Set(allExpenses.map(t => t.categoria))];
        
        categories.forEach(cat => {
            const catExpenses = allExpenses.filter(t => t.categoria === cat);
            const months = new Set(catExpenses.map(t => format(parseISO(t.fecha), 'yyyy-MM')));
            const total = catExpenses.reduce((acc, t) => acc + Math.abs(t.monto), 0);
            historicalAverages[cat] = total / (months.size || 1);
        });

        const periodExpenses = transactions.filter(t => t.tipo === 'Gasto').reduce((acc, t) => {
            acc[t.categoria] = (acc[t.categoria] || 0) + Math.abs(t.monto);
            return acc;
        }, {} as Record<string, number>);
        const periodIncomes = transactions.filter(t => t.tipo === 'Ingreso').reduce((acc, t) => {
            acc[t.categoria] = (acc[t.categoria] || 0) + Math.abs(t.monto);
            return acc;
        }, {} as Record<string, number>);

        const previousPeriodStats = (() => {
            const from = dateRange?.from ? startOfDay(dateRange.from) : startOfMonth(new Date());
            const to = dateRange?.to ? endOfDay(dateRange.to) : endOfMonth(new Date());
            const days = Math.max(1, differenceInCalendarDays(to, from) + 1);
            const prevTo = addDays(from, -1);
            const prevFrom = addDays(prevTo, -(days - 1));

            const prevTransactions = allTransactions.filter(t => {
                const d = parseISO(t.fecha);
                return d >= prevFrom && d <= prevTo;
            });

            const prevIncome = prevTransactions
                .filter(t => t.tipo === 'Ingreso')
                .reduce((acc, t) => acc + t.monto, 0);
            const prevExpenses = prevTransactions
                .filter(t => t.tipo === 'Gasto')
                .reduce((acc, t) => acc + Math.abs(t.monto), 0);
            const prevSavings = prevIncome - prevExpenses;

            return { prevIncome, prevExpenses, prevSavings };
        })();

        const monthsInYear = eachMonthOfInterval({
            start: startOfYear(new Date()),
            end: endOfMonth(new Date())
        });

        const chartData = monthsInYear.map(m => {
            const monthStr = format(m, 'MMM', { locale: es });
            const monthTrans = userData.allTransactions.filter(t => {
                const d = parseISO(t.fecha);
                return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
            });
            const inc = monthTrans.filter(t => t.tipo === 'Ingreso').reduce((acc, t) => acc + t.monto, 0);
            const exp = monthTrans.filter(t => t.tipo === 'Gasto').reduce((acc, t) => acc + Math.abs(t.monto), 0);
            const savings = Math.round((inc - exp) * 100) / 100;
            return {
                month: monthStr,
                income: inc,
                expense: exp,
                savings
            };
        });

        const savingsCohortData = monthsInYear.map((m, index) => {
            const monthStr = format(m, 'MMM', { locale: es });
            const monthTrans = allTransactions.filter((t) => {
                const d = parseISO(t.fecha);
                return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
            });
            const monthIncome = monthTrans
                .filter((t) => t.tipo === 'Ingreso')
                .reduce((acc, t) => acc + t.monto, 0);
            const monthExpense = monthTrans
                .filter((t) => t.tipo === 'Gasto')
                .reduce((acc, t) => acc + Math.abs(t.monto), 0);
            const monthSavings = monthIncome - monthExpense;
            const savingsRate = monthIncome > 0 ? (monthSavings / monthIncome) * 100 : 0;

            const rollingWindowStart = Math.max(0, index - 2);
            const rollingWindow = monthsInYear.slice(rollingWindowStart, index + 1).map((wm) => {
                const windowTrans = allTransactions.filter((t) => {
                    const d = parseISO(t.fecha);
                    return d.getMonth() === wm.getMonth() && d.getFullYear() === wm.getFullYear();
                });
                const wIncome = windowTrans
                    .filter((t) => t.tipo === 'Ingreso')
                    .reduce((acc, t) => acc + t.monto, 0);
                const wExpense = windowTrans
                    .filter((t) => t.tipo === 'Gasto')
                    .reduce((acc, t) => acc + Math.abs(t.monto), 0);
                const wSavings = wIncome - wExpense;
                return wIncome > 0 ? (wSavings / wIncome) * 100 : 0;
            });
            const movingAvg3m =
                rollingWindow.length > 0
                    ? rollingWindow.reduce((acc, v) => acc + v, 0) / rollingWindow.length
                    : 0;

            return {
                month: monthStr,
                savingsRate: Math.round(savingsRate * 10) / 10,
                movingAvg3m: Math.round(movingAvg3m * 10) / 10,
            };
        });

        // Forecast de flujo de caja (escenarios base/optimista/conservador).
        const forecastStartDate = startOfDay(new Date());
        const forecastLookbackDays = 60;
        const forecastLookbackFrom = addDays(forecastStartDate, -(forecastLookbackDays - 1));
        const lookbackTransactions = allTransactions.filter((t) => {
            const d = parseISO(t.fecha);
            return d >= forecastLookbackFrom && d <= endOfDay(forecastStartDate);
        });

        const lookbackIncome = lookbackTransactions
            .filter((t) => t.tipo === 'Ingreso')
            .reduce((acc, t) => acc + t.monto, 0);
        const lookbackExpense = lookbackTransactions
            .filter((t) => t.tipo === 'Gasto')
            .reduce((acc, t) => acc + Math.abs(t.monto), 0);

        const avgIncomePerDay = lookbackIncome / forecastLookbackDays;
        const avgExpensePerDay = lookbackExpense / forecastLookbackDays;
        const startingBalance = totalAssets;

        const buildForecast = (days: number) => {
            let base = startingBalance;
            let optimistic = startingBalance;
            let conservative = startingBalance;
            const rows: Array<{ day: string; base: number; optimistic: number; conservative: number }> = [];

            for (let i = 0; i < days; i++) {
                const date = addDays(forecastStartDate, i);
                const label = format(date, 'dd MMM', { locale: es });

                base += avgIncomePerDay - avgExpensePerDay;
                optimistic += (avgIncomePerDay * 1.08) - (avgExpensePerDay * 0.94);
                conservative += (avgIncomePerDay * 0.92) - (avgExpensePerDay * 1.08);

                rows.push({
                    day: label,
                    base: Math.round(base),
                    optimistic: Math.round(optimistic),
                    conservative: Math.round(conservative),
                });
            }

            return rows;
        };

        const forecast30 = buildForecast(30);
        const forecast90 = buildForecast(90);

        // Estacionalidad de gasto por día/hora.
        const spendHeatmap = (() => {
            const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
            const rows = transactions.filter((t) => t.tipo === 'Gasto');

            rows.forEach((t) => {
                const d = parseISO(t.fecha);
                const day = (getDay(d) + 6) % 7; // lunes=0
                const hour = getHours(d);
                matrix[day][hour] += Math.abs(t.monto);
            });

            const maxValue = Math.max(0, ...matrix.flat());
            return {
                matrix,
                maxValue,
                days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                hours: Array.from({ length: 24 }, (_, i) => i),
            };
        })();

        const moneyFlowSankey = (() => {
            const nodes: Array<{ name: string }> = [];
            const links: Array<{ source: number; target: number; value: number }> = [];
            const nodeIndex = new Map<string, number>();
            const ensureNode = (name: string) => {
                const existing = nodeIndex.get(name);
                if (typeof existing === 'number') return existing;
                const idx = nodes.length;
                nodes.push({ name });
                nodeIndex.set(name, idx);
                return idx;
            };

            const compressTop = (
                entries: Array<[string, number]>,
                topN: number,
                otherLabel: string
            ) => {
                const sorted = [...entries].sort((a, b) => b[1] - a[1]);
                const top = sorted.slice(0, topN);
                const otherValue = sorted.slice(topN).reduce((acc, [, v]) => acc + v, 0);
                if (otherValue > 0) top.push([otherLabel, otherValue]);
                return top;
            };

            const incomeEntries = compressTop(
                Object.entries(periodIncomes).filter(([, v]) => v > 0),
                3,
                'Otros ingresos'
            );
            const expenseEntries = compressTop(
                Object.entries(periodExpenses).filter(([, v]) => v > 0),
                5,
                'Otros gastos'
            );
            const totalIncomeFlow = incomeEntries.reduce((acc, [, v]) => acc + v, 0);
            const availableNode = 'Disponible';

            incomeEntries.forEach(([category, value]) => {
                const src = ensureNode(`Ingreso: ${category}`);
                const tgt = ensureNode(availableNode);
                links.push({ source: src, target: tgt, value: Math.round(value) });
            });

            expenseEntries.forEach(([category, value]) => {
                const src = ensureNode(availableNode);
                const tgt = ensureNode(`Gasto: ${category}`);
                links.push({ source: src, target: tgt, value: Math.round(value) });
            });

            const overflow = Math.max(0, expenses - totalIncomeFlow);
            if (overflow > 0) {
                const src = ensureNode('Reserva/Activos');
                const tgt = ensureNode(availableNode);
                links.push({ source: src, target: tgt, value: Math.round(overflow) });
            }

            return {
                nodes,
                links,
                hasData: links.length > 0,
                incomeBreakdown: incomeEntries.map(([name, value]) => ({ name, value: Math.round(value) })),
                expenseBreakdown: expenseEntries.map(([name, value]) => ({ name, value: Math.round(value) })),
                totalIncome: Math.round(totalIncomeFlow),
                totalExpense: Math.round(expenses),
                net: Math.round(totalIncomeFlow - expenses),
            };
        })();

        const categoryChartData = Object.entries(periodExpenses).map(([name, value]) => ({
            name,
            value,
            color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Otros Gastos']
        })).sort((a, b) => b.value - a.value);

        const topCategory = categoryChartData[0] || null;
        const concentration = topCategory && expenses > 0 ? (topCategory.value / expenses) * 100 : 0;

        const fixedCategories = new Set(['Vivienda', 'Deudas', 'Transporte', 'Salud y Bienestar']);
        const fixedCosts = Object.entries(periodExpenses).reduce((acc, [cat, val]) => {
            if (fixedCategories.has(cat)) return acc + val;
            return acc;
        }, 0);
        const variableCosts = Math.max(0, expenses - fixedCosts);

        const ruleNeedsCategories = new Set(['Vivienda', 'Alimentación', 'Transporte', 'Salud y Bienestar', 'Deudas']);
        const ruleNeeds = Object.entries(periodExpenses).reduce((acc, [cat, val]) => {
            if (ruleNeedsCategories.has(cat)) return acc + val;
            return acc;
        }, 0);
        const ruleWants = Math.max(0, expenses - ruleNeeds);
        const ruleFuture = Math.max(0, savings);
        const ruleNeedsPct = income > 0 ? (ruleNeeds / income) * 100 : 0;
        const ruleWantsPct = income > 0 ? (ruleWants / income) * 100 : 0;
        const ruleFuturePct = income > 0 ? (ruleFuture / income) * 100 : 0;

        const recentTransactions = [...transactions]
            .sort((a, b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime())
            .slice(0, 20);

        return {
            netWorth,
            totalAssets,
            totalDebts,
            income,
            expenses,
            savings,
            savingsRate,
            burnRateMonthly,
            runwayMonths,
            runwayRiskLevel,
            impulsiveExpenses,
            impulsiveShare,
            debtPayments,
            debtServiceRatio,
            avgExpenseTicket,
            chartData,
            categoryChartData,
            historicalAverages,
            periodExpenses,
            topCategory,
            concentration,
            fixedCosts,
            variableCosts,
            ruleNeeds,
            ruleWants,
            ruleFuture,
            ruleNeedsPct,
            ruleWantsPct,
            ruleFuturePct,
            previousPeriodStats,
            recentTransactions,
            forecast30,
            forecast90,
            spendHeatmap,
            savingsCohortData,
            moneyFlowSankey
        };
    }, [userData, dateRange]);

    const handlePocketChange = (name: string, value: string) => {
        const num = parseFloat(value) || 0;
        const newPockets = { ...pocketsState, [name]: num };
        setPocketsState(newPockets);
        
        // Persistir en segundo plano
        if (user) {
                        setDocumentNonBlocking('dashboardConfig', 'financial_pockets', {
                key: 'financial_pockets',
                value: JSON.stringify(newPockets)
            });
        }
    };

    const savedStrategy = dashboardConfig?.find(c => c.key === 'debt_strategy')?.value;
    const effectiveStrategy = localStrategy || savedStrategy;
    const hasAccounts = (userData?.accounts?.length || 0) > 0;

    const openTransactionDialog = (prefill: any = null) => {
        setEditingTransaction(undefined);
        setTransactionPrefill(prefill);
        setIsTransactionDialogOpen(true);
    };

    const openEditTransactionDialog = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setTransactionPrefill(null);
        setIsTransactionDialogOpen(true);
    };

    const filteredTransactions = useMemo(() => {
        if (!stats?.recentTransactions) return [];
        const search = movementSearch.trim().toLowerCase();

        return stats.recentTransactions.filter((tx) => {
            if (movementTypeFilter !== 'all' && tx.tipo !== movementTypeFilter) return false;
            if (movementCategoryFilter !== 'all' && tx.categoria !== movementCategoryFilter) return false;
            if (movementAccountFilter !== 'all' && tx.cuenta_id !== movementAccountFilter) return false;
            if (movementImpulsiveFilter === 'yes' && !tx.impulsivo) return false;
            if (movementImpulsiveFilter === 'no' && tx.impulsivo) return false;

            if (search.length > 0) {
                const notes = (tx.notas || '').toLowerCase();
                const cat = (tx.categoria || '').toLowerCase();
                const type = (tx.tipo || '').toLowerCase();
                return notes.includes(search) || cat.includes(search) || type.includes(search);
            }
            return true;
        });
    }, [
        stats?.recentTransactions,
        movementTypeFilter,
        movementCategoryFilter,
        movementAccountFilter,
        movementImpulsiveFilter,
        movementSearch
    ]);

    const budgetVsActualData = useMemo(() => {
        if (!stats) return [];

        return Object.entries(pocketsState)
            .map(([category, budget]) => {
                const actual = stats.periodExpenses[category] || 0;
                const deviationPct = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
                return {
                    category,
                    budget: Math.round(budget),
                    actual: Math.round(actual),
                    deviationPct: Math.round(deviationPct * 10) / 10,
                };
            })
            .sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
    }, [stats, pocketsState]);

    const financeAlerts = useMemo(() => {
        if (!stats) return [];
        const alerts: Array<{
            id: string;
            level: 'high' | 'medium';
            title: string;
            detail: string;
            cta: string;
            action: () => void;
        }> = [];

        if (stats.savings < 0) {
            alerts.push({
                id: 'negative_cashflow',
                level: 'high',
                title: 'Flujo de caja negativo',
                detail: `El periodo cierra en ${formatCurrency(stats.savings)}. Prioriza recorte inmediato de gastos variables.`,
                cta: 'Abrir Pockets',
                action: () => setActiveTab('pockets'),
            });
        }
        if (stats.debtServiceRatio > 35) {
            alerts.push({
                id: 'debt_service',
                level: 'high',
                title: 'Servicio de deuda elevado',
                detail: `${stats.debtServiceRatio.toFixed(1)}% de tus ingresos se va a deuda. Riesgo de tensión de liquidez.`,
                cta: 'Ir a Deuda',
                action: () => setActiveTab('debt'),
            });
        }
        if (stats.impulsiveShare > 20) {
            alerts.push({
                id: 'impulsive_spend',
                level: 'medium',
                title: 'Impulsividad financiera alta',
                detail: `${stats.impulsiveShare.toFixed(1)}% del gasto fue impulsivo. Reduce fugas de caja no planificadas.`,
                cta: 'Ver Movimientos',
                action: () => setActiveTab('movements'),
            });
        }
        if (stats.concentration > 45 && stats.topCategory) {
            alerts.push({
                id: 'category_concentration',
                level: 'medium',
                title: 'Alta concentración de gasto',
                detail: `${stats.topCategory.name} concentra ${stats.concentration.toFixed(1)}% del gasto del periodo.`,
                cta: 'Ajustar Pockets',
                action: () => setActiveTab('pockets'),
            });
        }
        if (stats.ruleWantsPct > 35) {
            alerts.push({
                id: 'rule_503020_wants',
                level: stats.ruleWantsPct > 45 ? 'high' : 'medium',
                title: 'Consumo discrecional elevado',
                detail: `El bloque de deseos está en ${stats.ruleWantsPct.toFixed(1)}% de ingresos (objetivo: <=30%).`,
                cta: 'Ajustar Pockets',
                action: () => setActiveTab('pockets'),
            });
        }

        if (stats.runwayMonths !== null && stats.runwayMonths < 6) {
            alerts.push({
                id: 'runway_low',
                level: stats.runwayMonths < 4 ? 'high' : 'medium',
                title: 'Runway de liquidez reducido',
                detail: `Tu liquidez cubre ${stats.runwayMonths.toFixed(1)} meses al ritmo actual de gasto.`,
                cta: 'Revisar Evolución',
                action: () => setActiveTab('evolution'),
            });
        }

        // Alertas de desvío presupuesto vs real por categoría (pockets).
        Object.entries(pocketsState).forEach(([category, budget]) => {
            if (!budget || budget <= 0) return;
            const actual = stats.periodExpenses[category] || 0;
            const deviationPct = ((actual - budget) / budget) * 100;
            if (deviationPct < 10) return;

            const overAmount = actual - budget;
            const isHigh = deviationPct >= 25;
            alerts.push({
                id: `budget_deviation_${category}`,
                level: isHigh ? 'high' : 'medium',
                title: `Desvío en ${category}`,
                detail: `${deviationPct.toFixed(1)}% por encima del presupuesto (${formatCurrency(overAmount)} de exceso).`,
                cta: 'Ver movimientos',
                action: () => {
                    setMovementTypeFilter('Gasto');
                    setMovementCategoryFilter(category);
                    setMovementImpulsiveFilter('all');
                    setMovementSearch('');
                    setActiveTab('movements');
                },
            });
        });

        return alerts
            .sort((a, b) => (a.level === b.level ? 0 : a.level === 'high' ? -1 : 1))
            .slice(0, 6);
    }, [stats, pocketsState]);

    if (!userData) return <AreaPageSkeleton />;

    return (
        <div className="space-y-8 pb-20">
            <NavigationReady />
            <p className="text-muted-foreground text-sm">
                Inteligencia financiera operativa: flujo de caja, control de gasto, deuda y patrimonio neto en tiempo real.
            </p>

            {/* Hub de acciones — filtro de periodo + acciones, agrupado y responsive */}
            <div className="rounded-xl border bg-card/60 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsAccountDialogOpen(true)}
                        className="gap-2 h-10 w-full sm:w-auto"
                    >
                        <Wallet size={16} />
                        <span className="truncate">Nueva cuenta</span>
                    </Button>
                    <Button
                        data-tour="finances-add"
                        onClick={() => openTransactionDialog()}
                        disabled={!hasAccounts}
                        className="gap-2 h-10 w-full sm:w-auto"
                    >
                        <PlusCircle size={16} />
                        <span className="truncate">Nuevo movimiento</span>
                    </Button>
                </div>
            </div>

            {!hasAccounts && (
                <Card className="border-orange-500/30 bg-orange-500/5">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-sm">
                            <AlertTriangle className="text-orange-600 shrink-0" size={18} />
                            <p>Crea una cuenta para empezar a registrar movimientos.</p>
                        </div>
                        <Button size="sm" onClick={() => setIsAccountDialogOpen(true)} className="shrink-0 gap-1.5">
                            <Wallet size={14} />
                            Nueva cuenta
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                {/* Móvil: selector compacto. Escritorio: pestañas. */}
                <div className="sm:hidden">
                    <Select value={activeTab} onValueChange={setActiveTab}>
                        <SelectTrigger data-tour="finances-tabs" className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {FINANCE_TABS.map(({ value, label, icon: Icon }) => (
                                <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <TabsList className="hidden sm:inline-flex bg-muted/50 p-1">
                    {FINANCE_TABS.map(({ value, label, icon: Icon }) => (
                        <TabsTrigger key={value} value={value} className="gap-1.5"><Icon size={14} /><span>{label}</span></TabsTrigger>
                    ))}
                </TabsList>

                {!stats ? (
                    <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-xl opacity-50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <TabsContent value="summary" className="space-y-6">
                            {financeAlerts.length > 0 && (
                                <Card className="border-primary/20">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Alertas Proactivas</CardTitle>
                                        <CardDescription>Riesgos detectados automáticamente para el periodo activo.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {financeAlerts.map((alert) => (
                                            <div
                                                key={alert.id}
                                                className={cn(
                                                    "rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                                                    alert.level === 'high' ? "border-destructive/30 bg-destructive/5" : "border-orange-500/30 bg-orange-500/5"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={alert.level === 'high' ? 'destructive' : 'secondary'}>
                                                            {alert.level === 'high' ? 'Alto riesgo' : 'Atención'}
                                                        </Badge>
                                                        <p className="text-sm font-semibold">{alert.title}</p>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">{alert.detail}</p>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={alert.action}>
                                                    {alert.cta}
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <StatCard title="Balance Periodo" value={formatCurrency(stats.savings)} subtext="Ahorro Neto" trend={stats.savings >= 0 ? 'up' : 'down'} icon={Wallet} />
                                <StatCard title="Tasa de Ahorro" value={`${stats.savingsRate.toFixed(1)}%`} subtext="Capacidad de Retención" trend={stats.savingsRate >= 20 ? 'up' : 'down'} icon={PiggyBank} />
                                <StatCard title="Patrimonio Neto" value={formatCurrency(stats.netWorth)} subtext="Activos - Deudas" trend="up" icon={Landmark} />
                                <StatCard title="Gasto en Periodo" value={formatCurrency(stats.expenses)} subtext="Salidas Totales" trend="down" icon={Zap} />
                            </div>

                            <Collapsible open={showMoreMetrics} onOpenChange={setShowMoreMetrics} className="space-y-4">
                              <CollapsibleTrigger asChild>
                                <button type="button" className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                                  <span className="font-medium">Más métricas</span>
                                  <ChevronDown className={cn('h-4 w-4 transition-transform', showMoreMetrics && 'rotate-180')} />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <StatCard
                                    title="Gasto Impulsivo"
                                    value={formatCurrency(stats.impulsiveExpenses)}
                                    subtext={`${stats.impulsiveShare.toFixed(1)}% del gasto`}
                                    trend={stats.impulsiveShare > 20 ? 'down' : 'up'}
                                    icon={CircleDollarSign}
                                />
                                <StatCard
                                    title="Servicio de Deuda"
                                    value={`${stats.debtServiceRatio.toFixed(1)}%`}
                                    subtext={formatCurrency(stats.debtPayments)}
                                    trend={stats.debtServiceRatio > 35 ? 'down' : 'up'}
                                    icon={CreditCard}
                                />
                                <StatCard
                                    title="Ticket Medio"
                                    value={formatCurrency(stats.avgExpenseTicket)}
                                    subtext="Por transacción de gasto"
                                    trend="down"
                                    icon={Receipt}
                                />
                                <StatCard
                                    title="Concentración"
                                    value={`${stats.concentration.toFixed(1)}%`}
                                    subtext={stats.topCategory ? stats.topCategory.name : 'Sin categoría dominante'}
                                    trend={stats.concentration > 45 ? 'down' : 'up'}
                                    icon={Percent}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Burn Rate mensual</p>
                                        <p className="text-2xl font-semibold mt-2">{formatCurrency(stats.burnRateMonthly)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Estimado por ritmo de gasto del periodo</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Runway de liquidez</p>
                                        <p className="text-2xl font-semibold mt-2">
                                            {stats.runwayMonths === null ? '∞' : `${stats.runwayMonths.toFixed(1)} meses`}
                                        </p>
                                        <p className={cn(
                                            "text-xs mt-1",
                                            stats.runwayRiskLevel === 'HIGH'
                                                ? 'text-destructive'
                                                : stats.runwayRiskLevel === 'MEDIUM'
                                                    ? 'text-orange-600'
                                                    : 'text-muted-foreground'
                                        )}>
                                            {stats.runwayRiskLevel === 'HIGH'
                                                ? 'Riesgo alto de liquidez'
                                                : stats.runwayRiskLevel === 'MEDIUM'
                                                    ? 'Atención: margen ajustado'
                                                    : 'Margen de liquidez estable'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                              </CollapsibleContent>
                            </Collapsible>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Regla 50/30/20</CardTitle>
                                    <CardDescription>Control de necesidades, deseos y ahorro sobre ingresos del periodo.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="rounded-xl border p-3 bg-muted/20">
                                            <p className="text-xs text-muted-foreground">Necesidades (objetivo 50%)</p>
                                            <p className="text-sm font-semibold mt-1">{formatCurrency(stats.ruleNeeds)}</p>
                                            <p className="text-xs text-muted-foreground">{stats.ruleNeedsPct.toFixed(1)}%</p>
                                        </div>
                                        <div className="rounded-xl border p-3 bg-muted/20">
                                            <p className="text-xs text-muted-foreground">Deseos (objetivo 30%)</p>
                                            <p className="text-sm font-semibold mt-1">{formatCurrency(stats.ruleWants)}</p>
                                            <p className="text-xs text-muted-foreground">{stats.ruleWantsPct.toFixed(1)}%</p>
                                        </div>
                                        <div className="rounded-xl border p-3 bg-muted/20">
                                            <p className="text-xs text-muted-foreground">Ahorro (objetivo 20%)</p>
                                            <p className="text-sm font-semibold mt-1">{formatCurrency(stats.ruleFuture)}</p>
                                            <p className="text-xs text-muted-foreground">{stats.ruleFuturePct.toFixed(1)}%</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span>Necesidades</span>
                                                <span>{stats.ruleNeedsPct.toFixed(1)}% / 50%</span>
                                            </div>
                                            <Progress value={Math.min(100, (stats.ruleNeedsPct / 50) * 100)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span>Deseos</span>
                                                <span>{stats.ruleWantsPct.toFixed(1)}% / 30%</span>
                                            </div>
                                            <Progress value={Math.min(100, (stats.ruleWantsPct / 30) * 100)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span>Ahorro</span>
                                                <span>{stats.ruleFuturePct.toFixed(1)}% / 20%</span>
                                            </div>
                                            <Progress value={Math.min(100, (stats.ruleFuturePct / 20) * 100)} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CalendarClock size={18} className="text-primary" />
                                        Diagnóstico del Periodo
                                    </CardTitle>
                                    <CardDescription>Comparativa contra periodo anterior y composición de costes.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <DiagnosticItem
                                        label="Ingresos vs periodo anterior"
                                        current={stats.income}
                                        previous={stats.previousPeriodStats.prevIncome}
                                    />
                                    <DiagnosticItem
                                        label="Gastos vs periodo anterior"
                                        current={stats.expenses}
                                        previous={stats.previousPeriodStats.prevExpenses}
                                        inverted
                                    />
                                    <DiagnosticItem
                                        label="Ahorro vs periodo anterior"
                                        current={stats.savings}
                                        previous={stats.previousPeriodStats.prevSavings}
                                    />
                                    <div className="rounded-xl border p-4 bg-muted/20">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Mix de costes</p>
                                        <p className="text-sm mt-2">Fijos: <span className="font-semibold">{formatCurrency(stats.fixedCosts)}</span></p>
                                        <p className="text-sm">Variables: <span className="font-semibold">{formatCurrency(stats.variableCosts)}</span></p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <TrendingUp className="text-primary" size={18} />
                                            Evolución de Flujo de Caja
                                        </CardTitle>
                                        <CardDescription>Visualización de la salud financiera acumulada este año.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats.chartData}>
                                                <defs>
                                                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                                <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                                                <YAxis hide />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area type="monotone" dataKey="savings" name="Flujo" stroke="hsl(var(--chart-5))" fillOpacity={1} fill="url(#colorSavings)" strokeWidth={2} />
                                                <Line type="monotone" dataKey="expense" name="Gasto" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Distribución por Categoría</CardTitle>
                                        <CardDescription>Uso del capital en el periodo seleccionado.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[340px]">
                                        <div className="h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.categoryChartData}
                                                        innerRadius={58}
                                                        outerRadius={82}
                                                        paddingAngle={2}
                                                        minAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {stats.categoryChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                                            {stats.categoryChartData.map((entry) => (
                                                <div key={entry.name} className="inline-flex items-center gap-1.5 min-w-0">
                                                    <span
                                                        className="inline-block h-3 w-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span className="text-foreground/90 leading-none">{entry.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="pockets" className="space-y-6">
                            <Card className="shadow-sm border-primary/10">
                                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 text-foreground"><Target className="text-primary" /> Simulador de Optimización</h3>
                                        <p className="text-muted-foreground text-sm max-w-lg">
                                            Ajusta tus bolsillos (Pockets) en base a tus gastos medios. El sistema calcula automáticamente el flujo que podrías liberar al mes.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Margen de Ahorro Teórico</p>
                                        <p className="text-4xl font-semibold text-primary">
                                            {formatCurrency(Math.max(0, stats.income - Object.values(pocketsState).reduce((a, b) => a + b, 0)))}
                                        </p>
                                        <p className="text-muted-foreground text-xs">liberable si cumples objetivos</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Presupuesto vs Real por Categoría</CardTitle>
                                    <CardDescription>Compara tus bolsillos definidos contra el gasto ejecutado del periodo.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[290px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={budgetVsActualData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                                            <YAxis tickFormatter={(v) => formatCurrency(Number(v || 0))} />
                                            <Tooltip
                                                formatter={(value: number | string, name: string) => [formatCurrency(Number(value) || 0), name === 'budget' ? 'Presupuesto' : 'Real']}
                                            />
                                            <Legend />
                                            <Bar dataKey="budget" name="Presupuesto" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="actual" name="Real" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                                <CardFooter className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                    {budgetVsActualData.slice(0, 4).map((row) => (
                                        <div key={row.category} className="rounded-lg border p-2 flex items-center justify-between">
                                            <span className="text-muted-foreground truncate pr-2">{row.category}</span>
                                            <span className={cn("font-semibold", row.deviationPct > 0 ? "text-destructive" : "text-primary")}>
                                                {row.deviationPct > 0 ? '+' : ''}{row.deviationPct.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </CardFooter>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(CATEGORY_COLORS).map(([name, color]) => {
                                    const pocketBudget = pocketsState[name] || 0;
                                    const realSpend = stats.periodExpenses[name] || 0;
                                    const historicalAvg = stats.historicalAverages[name] || 0;
                                    const progress = pocketBudget > 0 ? (realSpend / pocketBudget) * 100 : 0;
                                    const Icon = CATEGORY_ICONS[name] || Info;

                                    // Recomendaciones dinámicas
                                    let recommendation = null;
                                    if (pocketBudget < historicalAvg * 0.8) {
                                        recommendation = { label: "Ajuste sugerido", variant: "secondary" as const, text: "Presupuesto muy bajo vs media real." };
                                    } else if (realSpend > pocketBudget) {
                                        recommendation = { label: "Límite excedido", variant: "destructive" as const, text: "Has superado el bolsillo este mes." };
                                    } else if (progress > 80) {
                                        recommendation = { label: "En riesgo", variant: "secondary" as const, text: "Te queda poco margen." };
                                    } else if (pocketBudget > 0) {
                                        recommendation = { label: "Optimizado", variant: "default" as const, text: "Gasto bajo control." };
                                    }

                                    return (
                                        <Card key={name} className="hover:shadow-md transition-all duration-300 border-border">
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-xl shadow-sm" style={{ backgroundColor: `${color}15`, color }}>
                                                            <Icon size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-foreground">{name}</h4>
                                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-widest">Bolsillo Mensual</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-32">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">€</span>
                                                            <Input
                                                                type="number"
                                                                inputMode="decimal"
                                                                className="pl-6 h-10 font-medium text-right"
                                                                value={pocketBudget}
                                                                onChange={(e) => handlePocketChange(name, e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Media Histórica</p>
                                                            <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(historicalAvg)}</p>
                                                        </div>
                                                        <div className="text-right space-y-1">
                                                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Consumo Actual</p>
                                                            <p className={cn("text-xl font-semibold", realSpend > pocketBudget ? "text-destructive" : "text-foreground")}>
                                                                {formatCurrency(realSpend)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[9px] font-semibold uppercase tracking-tighter">
                                                            <span className="text-muted-foreground">Progreso del bolsillo</span>
                                                            <span className={cn(progress > 100 ? "text-destructive" : "text-primary")}>{progress.toFixed(0)}%</span>
                                                        </div>
                                                        <Progress 
                                                            value={Math.min(100, progress)} 
                                                            className={cn("h-1.5", progress > 100 ? "[&>div]:bg-destructive" : "")} 
                                                        />
                                                    </div>

                                                    {recommendation && (
                                                        <div className={cn(
                                                            "mt-4 p-2 rounded-lg flex items-start gap-2 border",
                                                            recommendation.variant === 'destructive' ? "bg-destructive/10 border-destructive/20 text-destructive" :
                                                            recommendation.variant === 'secondary' ? "bg-muted border-border text-foreground" :
                                                            "bg-primary/10 border-primary/20 text-primary"
                                                        )}>
                                                            <Badge variant={recommendation.variant} className="mt-0.5 h-4 text-[8px] uppercase font-semibold px-1.5">
                                                                {recommendation.label}
                                                            </Badge>
                                                            <p className="text-[10px] font-medium leading-tight">{recommendation.text}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="evolution" className="space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Patrimonio neto</p>
                                        <p className="text-2xl font-semibold mt-2">{formatCurrency(stats.netWorth)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Activos</p>
                                        <p className="text-2xl font-semibold mt-2">{formatCurrency(stats.totalAssets)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Deuda total</p>
                                        <p className="text-2xl font-semibold mt-2">{formatCurrency(stats.totalDebts)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Ingresos periodo</p>
                                        <p className="text-2xl font-semibold mt-2">{formatCurrency(stats.income)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Ingresos mensuales</CardTitle>
                                    <CardDescription>Ingresos acumulados por mes este año.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[240px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.chartData}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(Number(v || 0))} />
                                            <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                            <Legend />
                                            <Bar dataKey="income" name="Ingresos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="max-w-5xl">
                                <CardHeader>
                                    <CardTitle className="text-lg">Evolución de Patrimonio</CardTitle>
                                    <CardDescription>Tendencia anual simplificada del resultado neto mensual.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[240px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.chartData}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip
                                                formatter={(value: number | string) => [formatCurrency(Number(value) || 0), 'Ahorro neto']}
                                            />
                                            <Area type="monotone" dataKey="savings" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.1} strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="max-w-5xl">
                                <CardHeader className="flex flex-row items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">Forecast de Cashflow</CardTitle>
                                        <CardDescription>Proyección de saldo diario por escenarios (base, optimista y conservador).</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={forecastHorizonDays === 30 ? 'default' : 'outline'}
                                            onClick={() => setForecastHorizonDays(30)}
                                        >
                                            30d
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={forecastHorizonDays === 90 ? 'default' : 'outline'}
                                            onClick={() => setForecastHorizonDays(90)}
                                        >
                                            90d
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={forecastHorizonDays === 90 ? stats.forecast90 : stats.forecast30}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="day" minTickGap={24} />
                                            <YAxis tickFormatter={(v) => formatCurrency(Number(v || 0))} />
                                            <Tooltip formatter={(value: number | string) => formatCurrency(Number(value) || 0)} />
                                            <Legend />
                                            <Line type="monotone" dataKey="base" name="Base" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="optimistic" name="Optimista" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="conservative" name="Conservador" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="max-w-5xl">
                                <CardHeader>
                                    <CardTitle className="text-lg">Cohortes de Ahorro</CardTitle>
                                    <CardDescription>Tasa de ahorro mensual frente a media móvil de 3 meses.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={stats.savingsCohortData}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="month" />
                                            <YAxis tickFormatter={(v) => `${v}%`} />
                                            <Tooltip formatter={(value: number | string) => `${Number(value).toFixed(1)}%`} />
                                            <Legend />
                                            <Line type="monotone" dataKey="savingsRate" name="Tasa mensual" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="movingAvg3m" name="Media móvil 3M" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="max-w-5xl">
                                <CardHeader>
                                    <CardTitle className="text-lg">Flujo de Dinero</CardTitle>
                                    <CardDescription>Resumen rapido de entradas, salidas y balance del periodo.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {stats.moneyFlowSankey.hasData ? (
                                        <>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="rounded-lg border bg-muted/20 p-3">
                                                    <p className="text-xs text-muted-foreground">Entradas</p>
                                                    <p className="text-base font-semibold text-emerald-600">
                                                        {formatCurrency(stats.moneyFlowSankey.totalIncome)}
                                                    </p>
                                                </div>
                                                <div className="rounded-lg border bg-muted/20 p-3">
                                                    <p className="text-xs text-muted-foreground">Salidas</p>
                                                    <p className="text-base font-semibold text-rose-600">
                                                        {formatCurrency(stats.moneyFlowSankey.totalExpense)}
                                                    </p>
                                                </div>
                                                <div className="rounded-lg border bg-muted/20 p-3">
                                                    <p className="text-xs text-muted-foreground">Balance neto</p>
                                                    <p
                                                        className={cn(
                                                            'text-base font-semibold',
                                                            stats.moneyFlowSankey.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                                        )}
                                                    >
                                                        {formatCurrency(stats.moneyFlowSankey.net)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid gap-4 lg:grid-cols-3">
                                                <div className="h-[320px] rounded-lg border bg-muted/10 p-2 lg:col-span-2">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <Sankey
                                                            data={stats.moneyFlowSankey as any}
                                                            nodePadding={30}
                                                            nodeWidth={16}
                                                            margin={{ left: 14, right: 14, top: 10, bottom: 10 }}
                                                            linkCurvature={0.45}
                                                        >
                                                            <Tooltip formatter={(value: number | string) => formatCurrency(Number(value) || 0)} />
                                                        </Sankey>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="rounded-lg border p-3">
                                                        <p className="mb-2 text-sm font-medium">Entradas principales</p>
                                                        <div className="space-y-1.5">
                                                            {stats.moneyFlowSankey.incomeBreakdown.map((item: { name: string; value: number }) => (
                                                                <div key={`income-${item.name}`} className="flex items-center justify-between gap-2 text-sm">
                                                                    <span className="truncate text-muted-foreground">{item.name}</span>
                                                                    <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-lg border p-3">
                                                        <p className="mb-2 text-sm font-medium">Salidas principales</p>
                                                        <div className="space-y-1.5">
                                                            {stats.moneyFlowSankey.expenseBreakdown.map((item: { name: string; value: number }) => (
                                                                <div key={`expense-${item.name}`} className="flex items-center justify-between gap-2 text-sm">
                                                                    <span className="truncate text-muted-foreground">{item.name}</span>
                                                                    <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-[200px] w-full flex items-center justify-center text-sm text-muted-foreground">
                                            No hay flujo suficiente para construir el Sankey en este periodo.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="max-w-5xl">
                                <CardHeader>
                                    <CardTitle className="text-lg">Estacionalidad de Gasto</CardTitle>
                                    <CardDescription>Mapa de calor por día y hora para detectar ventanas de mayor consumo.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[920px]">
                                            <div className="grid grid-cols-[80px_repeat(24,minmax(24px,1fr))] gap-1 text-[10px] text-muted-foreground mb-1">
                                                <div />
                                                {stats.spendHeatmap.hours.map((h: number) => (
                                                    <div key={`hour-${h}`} className="text-center">{String(h).padStart(2, '0')}</div>
                                                ))}
                                            </div>
                                            {stats.spendHeatmap.days.map((day: string, dayIndex: number) => (
                                                <div key={`row-${day}`} className="grid grid-cols-[80px_repeat(24,minmax(24px,1fr))] gap-1 mb-1">
                                                    <div className="text-xs text-muted-foreground flex items-center">{day}</div>
                                                    {stats.spendHeatmap.hours.map((hour: number) => {
                                                        const value = stats.spendHeatmap.matrix[dayIndex][hour];
                                                        const intensity = stats.spendHeatmap.maxValue > 0 ? value / stats.spendHeatmap.maxValue : 0;
                                                        return (
                                                            <div
                                                                key={`cell-${dayIndex}-${hour}`}
                                                                className="h-6 rounded-sm border border-border/30"
                                                                title={`${day} ${String(hour).padStart(2, '0')}:00 · ${formatCurrency(value)}`}
                                                                style={{
                                                                    backgroundColor: value === 0
                                                                        ? 'hsl(var(--muted) / 0.2)'
                                                                        : `hsl(var(--chart-3) / ${0.18 + intensity * 0.72})`,
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="movements" className="space-y-6">
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <CardTitle>Registro de Movimientos</CardTitle>
                                        <CardDescription>Alta rápida y trazabilidad de los últimos movimientos del periodo.</CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" onClick={() => openTransactionDialog({ tipo: 'Ingreso' })} disabled={!hasAccounts}>
                                            + Ingreso
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openTransactionDialog({ tipo: 'Gasto' })} disabled={!hasAccounts}>
                                            + Gasto
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openTransactionDialog({ tipo: 'Gasto', categoria: 'Deudas' })} disabled={!hasAccounts}>
                                            + Pago Deuda
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => openTransactionDialog({ tipo: 'Gasto', impulsivo: true })} disabled={!hasAccounts}>
                                            + Gasto Impulsivo
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo</p>
                                            <Select value={movementTypeFilter} onValueChange={(v) => setMovementTypeFilter(v as 'all' | 'Ingreso' | 'Gasto')}>
                                                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="Ingreso">Ingreso</SelectItem>
                                                    <SelectItem value="Gasto">Gasto</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Categoría</p>
                                            <Select value={movementCategoryFilter} onValueChange={setMovementCategoryFilter}>
                                                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas</SelectItem>
                                                    {Object.keys(CATEGORY_COLORS).map((cat) => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Cuenta</p>
                                            <Select value={movementAccountFilter} onValueChange={setMovementAccountFilter}>
                                                <SelectTrigger><SelectValue placeholder="Cuenta" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todas</SelectItem>
                                                    {(userData?.accounts || []).map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.cuenta_id}>
                                                            {acc.cuenta_id}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Impulsivo</p>
                                            <Select value={movementImpulsiveFilter} onValueChange={(v) => setMovementImpulsiveFilter(v as 'all' | 'yes' | 'no')}>
                                                <SelectTrigger><SelectValue placeholder="Impulsivo" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="yes">Solo impulsivos</SelectItem>
                                                    <SelectItem value="no">Solo planificados</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Buscar</p>
                                            <Input
                                                placeholder="Notas/categoría..."
                                                value={movementSearch}
                                                onChange={(e) => setMovementSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        Mostrando {filteredTransactions.length} movimientos.
                                    </div>

                                    {filteredTransactions.length === 0 ? (
                                        <div className="border-2 border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground">
                                            No hay movimientos con los filtros actuales.
                                        </div>
                                    ) : (
                                        filteredTransactions.map((tx) => {
                                            const isExpense = tx.tipo === 'Gasto';
                                            const amount = Math.abs(tx.monto);
                                            return (
                                                <div key={tx.id} className="rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant={isExpense ? 'destructive' : 'default'}>
                                                                {tx.tipo}
                                                            </Badge>
                                                            <Badge variant="outline">{tx.categoria}</Badge>
                                                            {tx.impulsivo && <Badge variant="secondary">Impulsivo</Badge>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {format(parseISO(tx.fecha), "d MMM yyyy, HH:mm", { locale: es })}
                                                            {tx.notas ? ` · ${tx.notas}` : ''}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("text-lg font-semibold", isExpense ? "text-destructive" : "text-primary")}>
                                                            {isExpense ? '-' : '+'}{formatCurrency(amount)}
                                                        </div>
                                                        <Button size="sm" variant="outline" onClick={() => openEditTransactionDialog(tx)}>
                                                            Editar
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="debt" className="space-y-6">
                            <div className="flex justify-end">
                                <Button size="sm" variant="outline" onClick={() => setIsDebtDialogOpen(true)} className="gap-1.5">
                                    <CreditCard size={14} />
                                    Nueva deuda
                                </Button>
                            </div>
                            <Tabs defaultValue={effectiveStrategy || 'comparison'} className="space-y-4">
                                <TabsList className="grid w-full grid-cols-3 max-w-sm">
                                    <TabsTrigger value="comparison" className="gap-1.5 text-xs">
                                        <BarChart2 className="h-3.5 w-3.5" /> Comparar
                                    </TabsTrigger>
                                    <TabsTrigger value="snowball" className="gap-1.5 text-xs">
                                        <Snowflake className="h-3.5 w-3.5" /> Snowball
                                    </TabsTrigger>
                                    <TabsTrigger value="avalanche" className="gap-1.5 text-xs">
                                        <Flame className="h-3.5 w-3.5" /> Avalanche
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="comparison">
                                    <DebtStrategyComparison
                                        debts={userData?.debts?.filter(d => d.estado_deuda !== 'Liquidada') || []}
                                        onSelect={(s: 'snowball' | 'avalanche') => {
                                            if (user) {
                                                                                                setDocumentNonBlocking('dashboardConfig', 'debt_strategy', { key: 'debt_strategy', value: s });
                                                setLocalStrategy(s);
                                            }
                                        }}
                                        selected={effectiveStrategy ?? null}
                                    />
                                </TabsContent>
                                <TabsContent value="snowball">
                                    <DebtSnowballStrategy
                                        debts={userData?.debts?.filter(d => d.estado_deuda !== 'Liquidada') || []}
                                        transactions={userData?.debtTransactions || []}
                                    />
                                </TabsContent>
                                <TabsContent value="avalanche">
                                    <DebtAvalancheStrategy
                                        debts={userData?.debts?.filter(d => d.estado_deuda !== 'Liquidada') || []}
                                        transactions={userData?.debtTransactions || []}
                                    />
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                    </>
                )}
            </Tabs>

            <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Editar Movimiento' : 'Nuevo Movimiento'}</DialogTitle>
                        <DialogDescription>
                            {editingTransaction
                                ? 'Actualiza el movimiento seleccionado sin salir de Finanzas.'
                                : 'Registra ingresos y gastos sin salir de la pestaña de Finanzas.'}
                        </DialogDescription>
                    </DialogHeader>
                    <TransactionLogForm
                        entity={editingTransaction}
                        closeDialog={() => {
                            setIsTransactionDialogOpen(false);
                            setEditingTransaction(undefined);
                        }}
                        prefill={transactionPrefill}
                        accounts={userData?.accounts || []}
                        debts={userData?.debts || []}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva deuda</DialogTitle>
                        <DialogDescription>Registra un préstamo, hipoteca o tarjeta de crédito para hacer seguimiento.</DialogDescription>
                    </DialogHeader>
                    <EditDebtForm closeDialog={() => setIsDebtDialogOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva cuenta</DialogTitle>
                        <DialogDescription>Añade una cuenta bancaria, de efectivo o de inversión.</DialogDescription>
                    </DialogHeader>
                    <EditAccountForm closeDialog={() => setIsAccountDialogOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- SUBCOMPONENTES ---

function StatCard({ title, value, subtext, trend, icon: Icon }: any) {
    return (
        <Card className="shadow-sm border-primary/10">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
                        <h3 className="text-xl sm:text-2xl font-semibold tabular-nums">{value}</h3>
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold uppercase min-w-0",
                            trend === 'up' ? 'text-primary' : 'text-destructive'
                        )}>
                            {trend === 'up' ? <ArrowUpRight size={12} className="shrink-0" /> : <ArrowDownRight size={12} className="shrink-0" />}
                            <span className="truncate">{subtext}</span>
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted text-primary shrink-0">
                        <Icon size={18} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-lg shadow-lg text-xs font-medium space-y-2">
                <p className="border-b pb-1 mb-1 text-muted-foreground">{label}</p>
                <div className="flex justify-between items-center gap-4">
                    <span className="text-primary">Ahorro:</span>
                    <span>{formatCurrency(payload[0].value)}</span>
                </div>
                {payload[1] && (
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-destructive">Salidas:</span>
                        <span>{formatCurrency(payload[1].value)}</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

function DiagnosticItem({ label, current, previous, inverted = false }: { label: string; current: number; previous: number; inverted?: boolean }) {
    const delta = current - previous;
    const pct = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;
    const isPositive = inverted ? delta <= 0 : delta >= 0;

    return (
        <div className="rounded-xl border p-4 bg-muted/20">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
            <p className="text-xl font-semibold mt-2">{formatCurrency(current)}</p>
            <p className={cn("text-xs mt-1 font-semibold", isPositive ? "text-primary" : "text-destructive")}>
                {delta >= 0 ? '+' : '-'}{formatCurrency(Math.abs(delta))} ({pct.toFixed(1)}%)
            </p>
        </div>
    );
}







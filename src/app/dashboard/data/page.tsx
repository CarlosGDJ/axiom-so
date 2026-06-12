
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { DateRange } from 'react-day-picker';
import { startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Compass,
  Gauge,
  Activity,
  Star,
  Milestone as MilestoneIcon,
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
  Loader2,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/app/date-range-picker';
import { columns as areaColumns } from '@/components/app/data-table/columns-area';
import { columns as hormoneColumns } from '@/components/app/data-table/columns-hormone';
import { getSkillColumns } from '@/components/app/data-table/columns-skill';
import { getSystemColumns } from '@/components/app/data-table/columns-system';
import { getHabitColumns } from '@/components/app/data-table/columns-habit';
import { columns as protocolColumns } from '@/components/app/data-table/columns-protocol';
import { columns as stateColumns } from '@/components/app/data-table/columns-state';
import { getVariableColumns } from '@/components/app/data-table/columns-variable';
import { getEventColumns } from '@/components/app/data-table/columns-event';
import { getTransactionColumns } from '@/components/app/data-table/columns-transaction';
import { getInteractionColumns } from '@/components/app/data-table/columns-interaction';
import { getImpactMatrixColumns } from '@/components/app/data-table/columns-impact-matrix';
import { columns as relationColumns } from '@/components/app/data-table/columns-relation';
import { columns as accountColumns } from '@/components/app/data-table/columns-account';
import { columns as debtColumns } from '@/components/app/data-table/columns-debt';
import { DataTable } from '@/components/app/data-table/data-table';
import AreaPageSkeleton from '@/components/app/area-page-skeleton';
import NavigationReady from '@/components/app/navigation-ready';

const tabsConfig = [
    { value: 'areas', label: 'Áreas', icon: Compass },
    { value: 'hormones', label: 'Hormonas', icon: Gauge },
    { value: 'variables', label: 'Variables', icon: Activity },
    { value: 'impactMatrix', label: 'Matriz de Impacto', icon: Zap },
    { value: 'skills', label: 'Habilidades', icon: Star },
    { value: 'systems', label: 'Sistemas', icon: MilestoneIcon },
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

export default function DataManagementPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfWeek(new Date(), { locale: es, weekStartsOn: 1 }),
    to: new Date(),
  });
  
  const { data: userData, isLoading } = useUserData(dateRange);

  const [activeTab, setActiveTab] = useState('areas');
  const [inactiveTabsStartIndex, setInactiveTabsStartIndex] = useState(0);
  const [tabsPerPage, setTabsPerPage] = useState(8);

  useEffect(() => {
    const handleResize = () => {
      setTabsPerPage(getTabsPerPage(window.innerWidth));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };
  
  const { areas, hormones, variables, impactMatrix, events, transactions, interactions, skills, systems, habits, protocols, states, relations, accounts, debts, milestones } = userData || {};
  
  const habitColumns = useMemo(() => getHabitColumns(areas || [], systems || [], variables || []), [areas, systems, variables]);
  const skillColumns = useMemo(() => getSkillColumns(areas || []), [areas]);
  const systemColumns = useMemo(() => getSystemColumns(skills || []), [skills]);
  const variableColumnsWithAreas = useMemo(() => getVariableColumns(areas || []), [areas]);
  const eventColumns = useMemo(() => getEventColumns(variables || []), [variables]);
  const transactionColumns = useMemo(() => getTransactionColumns(accounts || [], debts || []), [accounts, debts]);
  const interactionColumns = useMemo(() => getInteractionColumns(relations || []), [relations]);
  const impactMatrixColumns = useMemo(() => getImpactMatrixColumns(variables || [], hormones || []), [variables, hormones]);

  const activeTabConfig = tabsConfig.find(tab => tab.value === activeTab);
  const inactiveTabs = tabsConfig.filter(tab => tab.value !== activeTab);

  const handlePrev = () => {
    setInactiveTabsStartIndex(prev => Math.max(0, prev - 1));
  };
  const handleNext = () => {
    const newIndex = inactiveTabsStartIndex + 1;
    if (newIndex + tabsPerPage -1 <= inactiveTabs.length) {
       setInactiveTabsStartIndex(newIndex);
    }
  };
  
  const visibleInactiveTabs = inactiveTabs.slice(inactiveTabsStartIndex, inactiveTabsStartIndex + tabsPerPage - 1);
  const visibleTabs = activeTabConfig ? [activeTabConfig, ...visibleInactiveTabs] : visibleInactiveTabs;

  const canGoPrev = inactiveTabsStartIndex > 0;
  const canGoNext = inactiveTabsStartIndex + tabsPerPage -1 < inactiveTabs.length;
  
  if (isLoading && !userData) {
    return <AreaPageSkeleton />;
  }

  return (
    <div className="space-y-6">
        <NavigationReady />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Administra la configuración base de tus áreas, variables y protocolos del sistema Axiom.</p>
                {isLoading && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
                        <Loader2 className="h-3 w-3 animate-spin" /> Sincronizando registros...
                    </div>
                )}
            </div>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>

        {userData ? (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <div className="sm:hidden">
                    <Select value={activeTab} onValueChange={handleTabChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una sección" />
                        </SelectTrigger>
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
                        <Button variant="ghost" size="icon" onClick={handlePrev} disabled={!canGoPrev}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNext} disabled={!canGoNext}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className='w-full overflow-hidden'>
                    <TabsContent value="areas" className="space-y-4">
                        <DataTable columns={areaColumns} data={areas || []} filterColumnId='area_nombre' entityName='Área' />
                    </TabsContent>
                    <TabsContent value="hormones" className="space-y-4">
                        <DataTable columns={hormoneColumns} data={hormones || []} filterColumnId='name' entityName='Hormona'/>
                    </TabsContent>
                    <TabsContent value="variables" className="space-y-4">
                        <DataTable columns={variableColumnsWithAreas} data={variables || []} filterColumnId='var_nombre' entityName='Variable' areas={areas || []} />
                    </TabsContent>
                    <TabsContent value="impactMatrix" className="space-y-4">
                        <DataTable columns={impactMatrixColumns} data={impactMatrix || []} filterColumnId='var_id' entityName='Impacto' variables={variables || []} hormones={hormones || []} />
                    </TabsContent>
                    <TabsContent value="skills" className="space-y-4">
                        <DataTable columns={skillColumns} data={skills || []} filterColumnId='nombre' entityName='Habilidad' areas={areas || []} />
                    </TabsContent>
                    <TabsContent value="systems" className="space-y-4">
                        <DataTable columns={systemColumns} data={systems || []} filterColumnId='objetivo' entityName='Sistema' skills={skills || []} variables={variables || []} />
                    </TabsContent>
                    <TabsContent value="habits" className="space-y-4">
                        <DataTable columns={habitColumns} data={habits || []} filterColumnId='sistema_id' entityName='Hábito' systems={systems || []} variables={variables || []} />
                    </TabsContent>
                    <TabsContent value="protocols" className="space-y-4">
                        <DataTable columns={protocolColumns} data={protocols || []} filterColumnId='nombre' entityName='Protocolo'/>
                    </TabsContent>
                    <TabsContent value="states" className="space-y-4">
                        <DataTable columns={stateColumns} data={states || []} filterColumnId='estado_id' entityName='Estado'/>
                    </TabsContent>
                    <TabsContent value="events" className="space-y-4">
                    <DataTable columns={eventColumns} data={events || []} filterColumnId='var_id' entityName='Evento' variables={variables || []} milestones={milestones || []} />
                    </TabsContent>
                    <TabsContent value="transactions" className="space-y-4">
                    <DataTable columns={transactionColumns} data={transactions || []} filterColumnId='categoria' entityName='Transacción' accounts={accounts || []} debts={debts || []}/>
                    </TabsContent>
                    <TabsContent value="interactions" className="space-y-4">
                    <DataTable columns={interactionColumns} data={interactions || []} filterColumnId='persona_id' entityName='Interacción' relations={relations || []} />
                    </TabsContent>
                    <TabsContent value="relations" className="space-y-4">
                    <DataTable columns={relationColumns} data={relations || []} filterColumnId='nombre' entityName='Relación' />
                    </TabsContent>
                    <TabsContent value="accounts" className="space-y-4">
                    <DataTable columns={accountColumns} data={accounts || []} filterColumnId='tipo' entityName='Cuenta' />
                    </TabsContent>
                    <TabsContent value="debts" className="space-y-4">
                    <DataTable columns={debtColumns} data={debts || []} filterColumnId='nombre' entityName='Deuda' />
                    </TabsContent>
                </div>
            </Tabs>
        ) : (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4 border rounded-xl bg-muted/10 animate-in fade-in duration-500">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Cargando registros del periodo...</p>
            </div>
        )}
    </div>
  );
}


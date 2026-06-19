'use client';

import {
  BrainCircuit, LayoutDashboard, LineChart, Database, User, Settings,
  Repeat, ShieldAlert, AlertCircle, Wallet, MessageSquare, Zap, Flame,
  Compass, LayoutGrid, Moon, Palette, GraduationCap, Dumbbell, Users, SunMoon, HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';
import { useUserData } from '@/hooks/use-user-data';
import { useTour } from '@/components/app/tour/tour-context';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboardNavigationLoading } from '@/components/app/dashboard-navigation-loading';
export function AppSidebarNav() {
  const pathname = usePathname();
  const { data: userData } = useUserData();
  const { setOpenMobile } = useSidebar();
  const { startTour } = useTour();
  const { startNavigation } = useDashboardNavigationLoading();
  const isCriticalMode = userData?.overallState === 'CRITICO';

  const handleLinkClick = (e: React.MouseEvent, disabled: boolean, href?: string) => {
    if (disabled) { e.preventDefault(); return; }
    setOpenMobile(false);
    // Don't show the loading overlay when clicking the section we're already on —
    // the page won't remount, so stopNavigation() would only fire on the 4s fallback.
    if (href && href === pathname) return;
    startNavigation();
  };

  const NavItem = ({
    href, icon: Icon, label, disabled, restrictedReason,
  }: {
    href: string; icon: any; label: string; disabled?: boolean; restrictedReason?: string;
  }) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    const content = (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild={!disabled}
          isActive={isActive}
          disabled={disabled}
          className={cn(
            disabled && 'opacity-50 grayscale cursor-not-allowed',
            disabled && isActive && 'bg-muted',
          )}
        >
          {disabled ? (
            <div className="flex items-center gap-2 w-full px-2 py-1.5 text-sm">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {isCriticalMode && <ShieldAlert className="ml-auto h-3 w-3 text-destructive" />}
            </div>
          ) : (
            <Link href={href} onClick={e => handleLinkClick(e, !!disabled, href)}>
              <Icon />
              <span>{label}</span>
            </Link>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );

    if (disabled && restrictedReason) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs font-semibold text-destructive mb-1">Sección Restringida</p>
              <p className="text-[10px] leading-tight">{restrictedReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return content;
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <SidebarMenuButton className="!h-10 !w-10 rounded-full" asChild>
            <Link href="/dashboard" onClick={e => handleLinkClick(e, false, '/dashboard')}>
              <BrainCircuit />
            </Link>
          </SidebarMenuButton>
          <div className="flex flex-col">
            <p className="font-headline text-lg font-semibold tracking-tight">Axiom</p>
            <p className="text-xs text-muted-foreground">por Ti</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>

        {/* ── Principal ── */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem href="/dashboard" icon={LayoutDashboard} label="Panel de Control" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Áreas de vida ── */}
        <SidebarGroup data-tour="areas-nav">
          <SidebarGroupLabel>Áreas de vida</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem href="/dashboard/sleep"      icon={Moon}          label="Sueño" />
              <NavItem href="/dashboard/physical"   icon={Dumbbell}      label="Salud física" />
              <NavItem href="/dashboard/relations"  icon={Users}         label="Relaciones" />
              <NavItem href="/dashboard/dopamine"   icon={Zap}           label="Dopamina & Ocio" />
              <NavItem href="/dashboard/creativity" icon={Palette}       label="Creatividad" />
              <NavItem href="/dashboard/studies"    icon={GraduationCap} label="Estudios" />
              <NavItem href="/dashboard/purpose"    icon={Compass}       label="Propósito" />
              <NavItem href="/dashboard/environment" icon={LayoutGrid}   label="Entorno" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Gestión ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem href="/dashboard/milestones"     icon={Repeat}  label="Habit Tracker" />
              <NavItem href="/dashboard/finances"       icon={Wallet}  label="Finanzas" />
              <NavItem
                href="/dashboard/debt-strategy"
                icon={Flame}
                label="Estrategia Deuda"
                disabled={isCriticalMode}
                restrictedReason="Acceso restringido en Modo Estabilización."
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Herramientas ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Herramientas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <div data-tour="analytics-nav"><NavItem href="/dashboard/analytics" icon={LineChart} label="Analíticas" /></div>
              <NavItem href="/dashboard/simulator" icon={Zap} label="Simulador" />
              <NavItem href="/dashboard/checkins" icon={Moon} label="Cierres del día" />
              <NavItem href="/dashboard/meditation" icon={SunMoon} label="Meditación" />
              <div data-tour="chat-nav"><NavItem href="/dashboard/chat" icon={MessageSquare} label="Chat con IA" /></div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Sistema ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                href="/dashboard/data"
                icon={Database}
                label="Gestión de Datos"
                disabled={isCriticalMode}
                restrictedReason="Acceso restringido por estado CRÍTICO."
              />
              <NavItem href="/dashboard/profile" icon={User} label="Perfil" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="hidden [@media(min-height:760px)]:block rounded-lg bg-muted/50 p-3 text-[10px] leading-relaxed text-muted-foreground border border-border/50">
          <div className="flex items-center gap-1.5 mb-1 text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
            <AlertCircle size={12} />
            <span>Aviso Importante</span>
          </div>
          Axiom es una herramienta de organización personal. <strong>No es un servicio médico ni psicológico.</strong> No sustituye la terapia profesional, el diagnóstico ni el tratamiento clínico.
        </div>
        <Separator className="my-2 hidden [@media(min-height:760px)]:block" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard/settings'}>
              <Link href="/dashboard/settings" onClick={e => handleLinkClick(e, false, '/dashboard/settings')}>
                <Settings />
                <span>Ajustes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => { setOpenMobile(false); startTour(); }}>
              <HelpCircle />
              <span>Guía de la app</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

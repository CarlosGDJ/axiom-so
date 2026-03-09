'use client';

import { BrainCircuit, LayoutDashboard, LineChart, Database, User, Settings, PiggyBank, Repeat, ShieldAlert, AlertCircle, Wallet } from 'lucide-react';
import Link from 'next/link';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';
import { useUserData } from '@/hooks/use-user-data';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDashboardNavigationLoading } from '@/components/app/dashboard-navigation-loading';

export function AppSidebarNav() {
  const pathname = usePathname();
  const { data: userData } = useUserData();
  const { setOpenMobile } = useSidebar();
  const { startNavigation } = useDashboardNavigationLoading();
  const isCriticalMode = userData?.overallState === 'CRITICO';

  const handleLinkClick = (e: React.MouseEvent, disabled: boolean, href?: string) => {
    if (disabled) {
        e.preventDefault();
        return;
    }
    if (href && href.startsWith('/') && href !== pathname) {
      startNavigation();
    }
    setOpenMobile(false);
  };

  const NavItem = ({ href, icon: Icon, label, disabled, restrictedReason }: { href: string, icon: any, label: string, disabled?: boolean, restrictedReason?: string }) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    
    const content = (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild={!disabled}
                isActive={isActive}
                disabled={disabled}
                className={cn(
                    disabled && "opacity-50 grayscale cursor-not-allowed",
                    disabled && isActive && "bg-muted"
                )}
            >
                {disabled ? (
                    <div className="flex items-center gap-2 w-full px-2 py-1.5 text-sm">
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        {isCriticalMode && <ShieldAlert className="ml-auto h-3 w-3 text-destructive" />}
                    </div>
                ) : (
                    <Link href={href} onClick={(e) => handleLinkClick(e, !!disabled, href)}>
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
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
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
                <Link href="/dashboard" onClick={(e) => handleLinkClick(e, false, '/dashboard')}>
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
        <SidebarMenu>
          <NavItem 
            href="/dashboard" 
            icon={LayoutDashboard} 
            label="Panel de Control" 
          />
          
          <NavItem 
            href="/dashboard/analytics" 
            icon={LineChart} 
            label="Analíticas" 
            disabled={isCriticalMode}
            restrictedReason="El sistema está en Modo Estabilización. Prioriza los protocolos de recuperación en el Panel de Control."
          />

          <NavItem 
            href="/dashboard/finances" 
            icon={Wallet} 
            label="Finanzas" 
          />

          <NavItem 
            href="/dashboard/milestones" 
            icon={Repeat} 
            label="Habit Tracker" 
          />

          <NavItem 
            href="/dashboard/data" 
            icon={Database} 
            label="Gestión de Datos" 
            disabled={isCriticalMode}
            restrictedReason="Acceso restringido por estado CRÍTICO. Evita modificar la base del sistema hasta que tus niveles se estabilicen."
          />

          <NavItem 
            href="/dashboard/profile" 
            icon={User} 
            label="Perfil" 
          />
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="rounded-lg bg-muted/50 p-3 text-[10px] leading-relaxed text-muted-foreground border border-border/50">
            <div className="flex items-center gap-1.5 mb-1 text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                <AlertCircle size={12} />
                <span>Aviso Importante</span>
            </div>
            Axiom es una herramienta de organización personal. <strong>No es un servicio médico ni psicológico.</strong> No sustituye la terapia profesional, el diagnóstico ni el tratamiento clínico. Si estás en crisis, busca ayuda profesional de inmediato.
        </div>
        <Separator className="my-2" />
         <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="#" onClick={(e) => handleLinkClick(e, false, '#')}>
                <Settings />
                <span>Ajustes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

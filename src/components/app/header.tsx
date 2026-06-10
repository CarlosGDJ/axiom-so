'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import { usePathname } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/use-user-data';
import NotificationCenter from './notification-center';
import { Flame, Zap } from 'lucide-react';
import { computeProgression } from '@/lib/progression';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function AppHeader() {
  const { user, auth } = useUser();
  const { data: userData, isLoading: isUserDataLoading } = useUserData();
  const router = useRouter();
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname.startsWith('/dashboard/data')) {
      return 'Gestión de Datos';
    }
    if (pathname.startsWith('/dashboard/analytics')) {
      return 'Analíticas';
    }
    if (pathname.startsWith('/dashboard/debt-strategy')) {
      return 'Estrategia Deuda';
    }
    if (pathname.startsWith('/dashboard/finances')) {
      return 'Finanzas';
    }
    if (pathname.startsWith('/dashboard/milestones')) {
      return 'Habit Tracker';
    }
    if (pathname.startsWith('/dashboard/profile')) {
      return 'Perfil';
    }
    if (pathname.startsWith('/dashboard/sleep')) {
      return 'Sueño';
    }
    if (pathname.startsWith('/dashboard/physical')) {
      return 'Salud Física';
    }
    if (pathname.startsWith('/dashboard/relations')) {
      return 'Relaciones';
    }
    if (pathname.startsWith('/dashboard/dopamine')) {
      return 'Dopamina & Ocio';
    }
    if (pathname.startsWith('/dashboard/creativity')) {
      return 'Creatividad';
    }
    if (pathname.startsWith('/dashboard/studies')) {
      return 'Estudios';
    }
    if (pathname.startsWith('/dashboard/purpose')) {
      return 'Propósito';
    }
    if (pathname.startsWith('/dashboard/environment')) {
      return 'Entorno';
    }
    if (pathname.startsWith('/dashboard/simulator')) {
      return 'Simulador';
    }
    if (pathname.startsWith('/dashboard/meditation')) {
      return 'Meditación';
    }
    if (pathname.startsWith('/dashboard/chat')) {
      return 'Chat con IA';
    }
    if (pathname.startsWith('/dashboard/settings')) {
      return 'Ajustes';
    }
    if (pathname === '/dashboard') {
      return 'Panel de Control';
    }
    return 'Panel de Control';
  };


  const handleSignOut = async () => {
    if (auth) {
      await auth.signOut();
      router.push('/login');
    }
  };

  const avatarSrc = userData?.userProfile?.axiomAvatarDataUrl || userData?.userProfile?.photoURL || user?.photoURL;

  // Global Progression Logic
  const streak = useMemo(() => {
    const events = userData?.events;
    if (!events || events.length === 0) return 0;

    const dateSet = new Set<string>();
    events.forEach(e => {
      if (e.fecha) dateSet.add(e.fecha.split('T')[0]);
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOffset = dateSet.has(todayStr) ? 0 : 1;
    let count = 0;

    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (dateSet.has(d.toISOString().split('T')[0])) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [userData?.events]);

  const progressionData = useMemo(() => {
    if (isUserDataLoading || !userData) return null;
    return computeProgression(
      userData.skills || [],
      userData.events || [],
      userData.kpis?.dailyScoreTrend || [],
    );
  }, [userData, isUserDataLoading]);

  return (
    <header className="relative sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold md:text-2xl">{getTitle()}</h1>
      </div>
      
      <div className="ml-auto flex items-center gap-3 md:gap-4">
        {/* Rank Badge */}
        {progressionData && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  'hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border cursor-default select-none',
                  progressionData.rank.bgClass,
                  progressionData.rank.borderClass,
                )}>
                  <Zap size={11} className={cn(progressionData.rank.colorClass, 'shrink-0')} />
                  <span className={cn('text-[10px] font-black uppercase tracking-tighter', progressionData.rank.colorClass)}>
                    {progressionData.rank.name}
                  </span>
                  {progressionData.streakMultiplier > 1 && (
                    <span className="text-[9px] font-bold text-amber-500">×{progressionData.streakMultiplier}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="space-y-1.5 p-3 min-w-[160px]">
                <p className="font-bold text-xs">{progressionData.totalXP.toLocaleString()} XP total</p>
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p>Habilidades: {progressionData.xpBreakdown.skills} XP</p>
                  <p>Hábitos: {progressionData.xpBreakdown.habits} XP</p>
                  <p>Rendimiento: {progressionData.xpBreakdown.score} XP</p>
                </div>
                {progressionData.nextRank && (
                  <p className="text-[10px] text-muted-foreground pt-1 border-t">
                    {progressionData.xpToNext.toLocaleString()} XP → {progressionData.nextRank.name}
                  </p>
                )}
                {progressionData.streakMultiplier > 1 && (
                  <p className="text-[10px] font-bold text-amber-500">
                    Racha activa ×{progressionData.streakMultiplier} ({progressionData.activeStreakDays}d)
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Streak counter */}
        {streak > 0 && (
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border ${
            streak >= 7
              ? 'bg-yellow-50 border-yellow-300/60 dark:bg-yellow-950/30 dark:border-yellow-500/30'
              : 'bg-orange-50 border-orange-300/60 dark:bg-orange-950/30 dark:border-orange-500/30'
          }`}>
            <Flame
              size={12}
              className={streak >= 7 ? 'text-yellow-500' : 'text-orange-500'}
            />
            <span className={`text-[10px] font-black uppercase tracking-tighter ${
              streak >= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'
            }`}>
              {streak}d
            </span>
          </div>
        )}

        <NotificationCenter />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                {avatarSrc && (
                    <AvatarImage src={avatarSrc} alt={user?.displayName || 'Usuario'} />
                )}
                <AvatarFallback>
                  {user?.displayName ? user.displayName.charAt(0) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Menú de usuario</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Ajustes</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rank Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/30 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-in-out"
          style={{ width: `${progressionData?.progressToNext ?? 0}%` }}
        />
      </div>
    </header>
  );
}

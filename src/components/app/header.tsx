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
import { Zap } from 'lucide-react';

export function AppHeader() {
  const { user, auth } = useUser();
  const { data: userData } = useUserData();
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
      return 'Estrategias de Deuda';
    }
    if (pathname.startsWith('/dashboard/finances')) {
      return 'Finanzas';
    }
    if (pathname.startsWith('/dashboard/milestones')) {
      return 'Habit Tracker';
    }
    if (pathname.startsWith('/dashboard/profile')) {
      return 'Perfil del Jugador';
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

  const avatarSrc = userData?.userProfile?.axiomAvatarDataUrl || user?.photoURL;

  // Global Progression Logic
  const { systemLevel, globalProgress } = useMemo(() => {
    const skills = userData?.skills || [];
    if (skills.length === 0) return { systemLevel: 0, globalProgress: 0 };

    const level = skills.reduce((acc, s) => acc + s.nivel_actual, 0);
    const totalProgress = skills.reduce((acc, s) => {
        const xpNeeded = s.nivel_actual * 200;
        return acc + ((s.xp || 0) / xpNeeded);
    }, 0);
    
    return {
        systemLevel: level,
        globalProgress: (totalProgress / skills.length) * 100
    };
  }, [userData?.skills]);

  return (
    <header className="relative sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold md:text-2xl">{getTitle()}</h1>
      </div>
      
      <div className="ml-auto flex items-center gap-3 md:gap-4">
        {/* Minimalist System Level Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
            <Zap size={12} className="text-primary fill-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">LVL {systemLevel}</span>
        </div>

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

      {/* Global XP Progress Bar - Super Minimalist */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/30 overflow-hidden">
        <div 
            className="h-full bg-primary transition-all duration-1000 ease-in-out" 
            style={{ width: `${globalProgress}%` }} 
        />
      </div>
    </header>
  );
}


'use client';

import { Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardLayout as DashboardLayoutComponent } from '@/components/app/dashboard-layout';
import DashboardClientLogic from '@/components/app/dashboard-client-logic';
import DashboardLoading from './loading';
import { useComputedDataWriter } from '@/hooks/use-computed-data-writer';
import { useSmartNotifications } from '@/hooks/use-smart-notifications';
import { useUserData } from '@/hooks/use-user-data';
import { DashboardNavigationLoadingProvider } from '@/components/app/dashboard-navigation-loading';
import { GdprGate } from '@/components/app/gdpr-gate';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldX, Unlock, Loader2, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DemoBanner } from '@/components/app/demo-banner';
import { PwaInit } from '@/components/app/pwa-init';
import { QuickLogFab } from '@/components/app/quick-log-fab';
import { NotificationPrompt } from '@/components/app/notification-prompt';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser, addDocumentNonBlocking, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import { UserDataProvider } from '@/contexts/user-data-context';
import { TourProvider } from '@/components/app/tour/tour-context';
import { TourOverlay } from '@/components/app/tour/tour-overlay';
import { collection, doc, query, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { PlayerProfile, Area } from '@/lib/types';

function GlobalCrisisBanner() {
  const { data: userData } = useUserData();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  
  if (userData?.overallState !== 'CRITICO') return null;

  const handleManualOverride = () => {
    if (!user || !firestore) return;
    setIsResetting(true);

    // Inyectamos un "evento maestro" de resolución que garantiza +30 puntos
    const eventCollectionRef = collection(firestore, `users/${user.uid}/events`);
    addDocumentNonBlocking(eventCollectionRef, {
        fecha: new Date().toISOString(),
        evento_id: `EVT_OVERRIDE_${Date.now()}`,
        var_id: 'AI_CRISIS_RESOLVE',
        intensidad: 5,
        contexto: 'Calibración manual de emergencia activada por el usuario.',
        tipo: 'Protocolo',
    });

    toast({
        title: "Calibración Manual Iniciada",
        description: "Forzando reinicio de biomarcadores...",
    });
  };

  return (
    <div className="px-4 lg:px-6 pt-4 mb-6">
        <Alert variant="destructive" className="bg-destructive text-destructive-foreground border-none py-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <ShieldX className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-xs font-bold uppercase tracking-wider">
                    Sistema en Modo Estabilización — Navegación restringida para proteger tu foco.
                </AlertDescription>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold"
                onClick={handleManualOverride}
                disabled={isResetting}
            >
                {isResetting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                FORZAR CALIBRACIÓN
            </Button>
        </Alert>
    </div>
  );
}

// Checks for an existing profile AFTER GDPR consent — only mounted inside GdprGate children.
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const playerProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/playerProfile`, 'main-profile') : null),
    [user, firestore]
  );
  const { data: playerProfile, isLoading: isProfileLoading, error: profileError } = useDoc<PlayerProfile>(playerProfileRef);
  const areasProbeRef = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/areas`), limit(1)) : null),
    [user, firestore]
  );
  const { data: areasProbe, isLoading: isAreasProbeLoading, error: areasProbeError } = useCollection<Area>(areasProbeRef);

  useEffect(() => {
    if (isUserLoading || !user || isProfileLoading || isAreasProbeLoading) return;
    if (profileError || areasProbeError) return;
    const hasAnyArea = (areasProbe?.length || 0) > 0;
    if (!playerProfile && !hasAnyArea) {
      router.replace('/onboarding');
    }
  }, [user, isUserLoading, isProfileLoading, isAreasProbeLoading, playerProfile, areasProbe, profileError, areasProbeError, router]);

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserDataProvider>
      <DashboardLayoutInner2>{children}</DashboardLayoutInner2>
    </UserDataProvider>
  );
}

// Separated so hooks that need UserDataProvider run inside it.
function DashboardLayoutInner2({ children }: { children: React.ReactNode }) {
  const { writerPrefetch } = useUserData();
  useComputedDataWriter(writerPrefetch);
  useSmartNotifications();

  return (
    <TourProvider>
      <GdprGate>
        <OnboardingGuard>
          <DashboardNavigationLoadingProvider>
            <DashboardLayoutInner>{children}</DashboardLayoutInner>
          </DashboardNavigationLoadingProvider>
        </OnboardingGuard>
      </GdprGate>
      <TourOverlay />
    </TourProvider>
  );
}

function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Sin conexión — tus registros se guardarán al reconectarte</span>
    </div>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [entering, setEntering] = useState(false);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Page-enter animation on route change — useLayoutEffect avoids flash
  useLayoutEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setEntering(true);
      const t = setTimeout(() => setEntering(false), 300);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <DashboardClientLogic>
      <DashboardLayoutComponent>
        <PwaInit />
        <OfflineBanner />
        <DemoBanner />
        <NotificationPrompt />
        <GlobalCrisisBanner />
        <div className={entering ? 'animate-in fade-in slide-in-from-bottom-3 duration-300 fill-mode-both' : ''}>
          <Suspense fallback={<DashboardLoading />}>
            {children}
          </Suspense>
        </div>
      </DashboardLayoutComponent>
      <QuickLogFab />
    </DashboardClientLogic>
  );
}

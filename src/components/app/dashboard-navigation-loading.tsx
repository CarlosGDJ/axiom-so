'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface DashboardNavigationLoadingContextValue {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
}

const DashboardNavigationLoadingContext = createContext<DashboardNavigationLoadingContextValue | undefined>(undefined);

export function DashboardNavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const startNavigation = useCallback(() => {
    clearFallbackTimer();
    setIsNavigating(true);
    // Fallback safety: clear overlay if destination page never mounts (e.g. fetch failure).
    fallbackTimerRef.current = setTimeout(() => {
      setIsNavigating(false);
      fallbackTimerRef.current = null;
    }, 4000);
  }, [clearFallbackTimer]);

  const stopNavigation = useCallback(() => {
    clearFallbackTimer();
    setIsNavigating(false);
  }, [clearFallbackTimer]);

  const value = useMemo(
    () => ({ isNavigating, startNavigation, stopNavigation }),
    [isNavigating, startNavigation, stopNavigation]
  );

  return (
    <DashboardNavigationLoadingContext.Provider value={value}>
      {children}
    </DashboardNavigationLoadingContext.Provider>
  );
}

export function useDashboardNavigationLoading() {
  const context = useContext(DashboardNavigationLoadingContext);
  if (!context) {
    throw new Error('useDashboardNavigationLoading must be used within DashboardNavigationLoadingProvider');
  }
  return context;
}


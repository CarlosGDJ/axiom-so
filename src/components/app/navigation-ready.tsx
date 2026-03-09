'use client';

import { useEffect } from 'react';
import { useDashboardNavigationLoading } from '@/components/app/dashboard-navigation-loading';

export default function NavigationReady() {
  const { stopNavigation } = useDashboardNavigationLoading();

  useEffect(() => {
    stopNavigation();
  }, [stopNavigation]);

  return null;
}


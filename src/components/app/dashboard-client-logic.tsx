'use client';

import React, { useEffect } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

interface DashboardClientLogicProps {
  children: React.ReactNode;
}

export default function DashboardClientLogic({ children }: DashboardClientLogicProps) {
  const { user, isUserLoading, auth } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;
    if (user) return;

    // Grace period to avoid false redirects on transient auth hiccups.
    const timeout = setTimeout(() => {
      const currentUser = auth?.currentUser || null;
      if (!currentUser) {
        router.replace('/login');
      }
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, [isUserLoading, user, auth, router]);

  // Do not block the whole dashboard while auth is rehydrating on refresh/login.
  if (!user && !isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

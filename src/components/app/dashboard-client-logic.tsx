'use client';

import React, { useEffect } from 'react';
import { useUser } from '@/hooks/use-session-user';
import { useRouter } from 'next/navigation';

interface DashboardClientLogicProps {
  children: React.ReactNode;
}

export default function DashboardClientLogic({ children }: DashboardClientLogicProps) {
  const { uid, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;
    if (uid) return;

    const timeout = setTimeout(() => {
      if (!uid) router.replace('/login');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isUserLoading, uid, router]);

  if (!uid && !isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

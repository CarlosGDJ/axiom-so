'use client';

import React, { useEffect } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

interface DashboardClientLogicProps {
  children: React.ReactNode;
}

export default function DashboardClientLogic({
  children
}: DashboardClientLogicProps) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
    // Show a minimal loading state while checking for user
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
  }

  return <>{children}</>;
}

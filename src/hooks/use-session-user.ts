'use client';

import { useSession } from 'next-auth/react';

export interface SessionUserResult {
  user: { id: string; email?: string | null; name?: string | null; image?: string | null } | null;
  uid: string | null;
  isUserLoading: boolean;
  userError: null;
  auth: null;
}

export function useUser(): SessionUserResult {
  const { data: session, status } = useSession();
  return {
    user: session?.user ?? null,
    uid: session?.user?.id ?? null,
    isUserLoading: status === 'loading',
    userError: null,
    auth: null,
  };
}

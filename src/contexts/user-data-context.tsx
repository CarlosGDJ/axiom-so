'use client';

import { createContext, useContext } from 'react';
import { useUserDataImpl } from '@/hooks/use-user-data-impl';
import type { UserData } from '@/lib/types';

interface UserDataContextValue {
  data: UserData | null;
  isLoading: boolean;
  isValidating: boolean;
  writerPrefetch: ReturnType<typeof useUserDataImpl>['writerPrefetch'];
}

export const UserDataContext = createContext<UserDataContextValue | null>(null);

export function useUserDataContext(): UserDataContextValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserDataContext must be used inside UserDataProvider');
  return ctx;
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const value = useUserDataImpl();
  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

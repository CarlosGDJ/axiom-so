'use client';

import type { ReactNode } from 'react';

// Stub — Firebase provider replaced by NextAuth + MongoDB
export const FirebaseContext = undefined;

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useFirebase() { return {}; }
export function useAuth() { return null; }
export function useFirestore() { return null; }
export function useFirebaseApp() { return null; }
export function useUser() { return { user: null, isUserLoading: false, userError: null, auth: null }; }

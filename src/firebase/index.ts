'use client';

// Barrel shim — all Firebase imports now resolve to their new locations
export { useUser } from '@/hooks/use-session-user';
export { useCollection, useDoc, revalidateCollection } from '@/hooks/use-mongo-collection';
export {
  addDocumentNonBlocking,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/lib/api-writes';
export { SessionProvider as FirebaseClientProvider } from 'next-auth/react';

// No-op stubs for patterns that no longer apply
export function useFirestore() { return null; }
export function useAuth() { return null; }
export function useMemoFirebase<T>(factory: () => T, _deps: unknown[]): T { return factory(); }
export function initializeFirebase() { return {}; }
export function getSdks() { return {}; }

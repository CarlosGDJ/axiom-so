'use client';

import { useState, useEffect, useRef } from 'react';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener,
  auth: Auth | null;
}

/**
 * Hook specifically for accessing the authenticated user's state from a given Auth instance.
 * This provides the User object, loading status, and any auth errors.
 * @param {Auth | null} auth - The Firebase Auth service instance.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useAuthUser = (auth: Auth | null): UserHookResult => {
  const [userAuthState, setUserAuthState] = useState<Omit<UserHookResult, 'auth'>>({
    user: null,
    isUserLoading: true,
    userError: null,
  });
  const pendingNullCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!auth) {
      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: new Error('Auth service not provided to useAuthUser hook.'),
      });
      return;
    }

    // Immediate rehydration from Auth cache/session before async listener emits.
    const cachedUser = auth.currentUser || null;
    if (cachedUser) {
      setUserAuthState({
        user: cachedUser,
        isUserLoading: false,
        userError: null,
      });
    }

    // Keep previous user while refreshing auth state to avoid transient UI drops.
    setUserAuthState((prev) => ({ ...prev, isUserLoading: true, userError: null }));

    if (pendingNullCommitRef.current) {
      clearTimeout(pendingNullCommitRef.current);
      pendingNullCommitRef.current = null;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      (firebaseUser) => {
        if (pendingNullCommitRef.current) {
          clearTimeout(pendingNullCommitRef.current);
          pendingNullCommitRef.current = null;
        }

        const resolvedUser = firebaseUser || auth.currentUser || null;

        if (resolvedUser) {
          setUserAuthState({
            user: resolvedUser,
            isUserLoading: false,
            userError: null,
          });
          return;
        }

        // If null arrives after having a user, treat it as potentially transient (token/network hiccup).
        setUserAuthState((prev) => {
          if (!prev.user) {
            return { user: null, isUserLoading: false, userError: null };
          }
          return { ...prev, isUserLoading: true, userError: null };
        });

        pendingNullCommitRef.current = setTimeout(() => {
          const currentUser = auth.currentUser || null;
          if (currentUser) {
            setUserAuthState({
              user: currentUser,
              isUserLoading: false,
              userError: null,
            });
            return;
          }
          setUserAuthState({
            user: null,
            isUserLoading: false,
            userError: null,
          });
        }, 15000);
      },
      (error) => {
        console.error("useAuthUser: onIdTokenChanged error:", error);

        // Try to recover using current cached user before declaring session loss.
        const currentUser = auth.currentUser || null;
        if (currentUser) {
          setUserAuthState({ user: currentUser, isUserLoading: false, userError: error });
          return;
        }

        // Preserve last known user when auth listener errors are transient.
        setUserAuthState((prev) => ({ user: prev.user, isUserLoading: false, userError: error }));
      }
    );

    return () => {
      if (pendingNullCommitRef.current) {
        clearTimeout(pendingNullCommitRef.current);
        pendingNullCommitRef.current = null;
      }
      unsubscribe();
    };
  }, [auth]); // Dependency on the auth instance

  return { ...userAuthState, auth };
};

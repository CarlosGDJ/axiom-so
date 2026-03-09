'use client';

import { useState, useEffect } from 'react';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';

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

  useEffect(() => {
    if (!auth) {
      setUserAuthState({
        user: null,
        isUserLoading: false,
        userError: new Error('Auth service not provided to useAuthUser hook.'),
      });
      return;
    }

    // Start with a loading state
    setUserAuthState({ user: null, isUserLoading: true, userError: null });

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({
          user: firebaseUser,
          isUserLoading: false,
          userError: null,
        });
      },
      (error) => {
        console.error("useAuthUser: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );

    return () => unsubscribe();
  }, [auth]); // Dependency on the auth instance

  return { ...userAuthState, auth };
};

'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Always initialize with explicit config so auth persistence key is stable across reloads.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth =
    typeof window !== 'undefined'
      ? (() => {
          try {
            // Initialize auth with explicit persistence chain before first use.
            return initializeAuth(firebaseApp, {
              persistence: [
                indexedDBLocalPersistence,
                browserLocalPersistence,
                browserSessionPersistence,
              ],
              popupRedirectResolver: browserPopupRedirectResolver,
            });
          } catch {
            // If auth was already initialized, reuse existing instance.
            return getAuth(firebaseApp);
          }
        })()
      : getAuth(firebaseApp);

  // Auth emulator only in full local-emulator mode (NEXT_PUBLIC_USE_EMULATOR=true).
  // In tunnel/production mode (NEXT_PUBLIC_USE_EMULATOR unset or false), auth goes to
  // real Firebase so Google sign-in works. The fake apiKey in emulatorConfig would block it.
  const useAuthEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

  // Firestore emulator: local mode OR explicit remote host set by the tunnel script.
  const explicitFsHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  const useFirestoreEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' || !!explicitFsHost;
  const fsHost = explicitFsHost ?? '127.0.0.1';
  const fsPort = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT ?? '8080');

  // Remote tunnel: non-localhost host needs ssl:true — use initializeFirestore instead of
  // connectFirestoreEmulator (which forces http). Must be called before any getFirestore call.
  const isRemoteFirestore = !!explicitFsHost && !['127.0.0.1', 'localhost'].includes(fsHost);
  const firestore = isRemoteFirestore
    ? initializeFirestore(firebaseApp, { host: fsHost, ssl: true })
    : getFirestore(firebaseApp);

  const _globalThis = globalThis as any;
  if (!_globalThis.emulatorsStarted) {
    _globalThis.emulatorsStarted = true;
    if (useAuthEmulator) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
    if (useFirestoreEmulator && !isRemoteFirestore) {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    }
    const authMode = useAuthEmulator ? 'emulador' : 'producción';
    const fsMode = isRemoteFirestore ? `túnel (${fsHost})` : useFirestoreEmulator ? 'emulador local' : 'producción';
    console.log(`🔥 Firebase — Auth: ${authMode} | Firestore: ${fsMode}`);
  }

  return {
    firebaseApp,
    auth,
    firestore,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore/use-memo-firebase';
export * from './non-blocking-updates';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';

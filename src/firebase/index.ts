'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          'Automatic initialization failed. Falling back to firebase config object.',
          e,
        );
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  }
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  if (process.env.NODE_ENV === 'development') {
    const _globalThis = globalThis as any;
    if (!_globalThis.emulatorsStarted) {
      _globalThis.emulatorsStarted = true;
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      console.log('🔥 Entorno Local: Conectado a Emuladores Firebase');
    }
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

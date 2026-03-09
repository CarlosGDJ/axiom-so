import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Configuración genérica para el emulador.
// Cuando se despliegue a producción, el CLI inyectará la de producción automáticamente 
// gracias a Firebase Web Frameworks, pero aquí ponemos la base para desarrollo.
const firebaseConfig = {
    projectId: "demo-sandbox",
    apiKey: "fake-api-key",
    authDomain: "demo-sandbox.firebaseapp.com",
    storageBucket: "demo-sandbox.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456",
};

// Inicializar la app solo si no existe ya (útil para el Hot Reloading de Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Conectar a emuladores locales si estamos en desarrollo
if (process.env.NODE_ENV === "development") {
    // Asegurarnos de que no mostramos advertencias por re-conectar emuladores
    // en el Hot-Reload de Next.js
    const globalAny = global as any;
    if (!globalAny.emulatorsStarted) {
        globalAny.emulatorsStarted = true;
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, "localhost", 8080);
        connectStorageEmulator(storage, "localhost", 9199);
        connectFunctionsEmulator(functions, "localhost", 5001);
        console.log("🔥 Entorno Local: Conectado a Emuladores Firebase");
    }
}

export { app, auth, db, storage, functions };

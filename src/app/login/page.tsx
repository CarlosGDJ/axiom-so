'use client';

import { useUser, useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, AlertTriangle, ShieldAlert, FlaskConical, Loader2 } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DEMO_EMAIL    = 'demo@axiom.app';
const DEMO_PASSWORD = 'axiom-demo-2024';
const IS_AUTH_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStatus, setDemoStatus] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  // Prevents the auto-redirect from racing with handleGoogleSignIn's profile check
  const isHandlingSignIn = useRef(false);

  useEffect(() => {
    // Only auto-redirect if we're not actively handling a sign-in —
    // otherwise the handler itself will navigate once Firestore ops finish.
    if (!isUserLoading && user && !isHandlingSignIn.current) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleDemoSignIn = async () => {
    if (!auth || !firestore || demoLoading) return;
    setError(null);
    setDemoLoading(true);
    setDemoStatus('Conectando...');
    try {
      await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        // First-time setup: create user + seed data
        try {
          setDemoStatus('Creando cuenta demo...');
          const result = await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
          setDemoStatus('Generando 60 días de datos...');
          const { seedDemoUserFirestore } = await import('@/lib/demo-seed-client');
          await seedDemoUserFirestore(result.user.uid, firestore);
          setDemoStatus('¡Listo!');
          router.push('/dashboard');
        } catch (seedErr: any) {
          setError('Error inicializando la demo. Asegúrate de que el emulador Firebase está activo.');
          console.error('Demo seed error:', seedErr);
        }
      } else {
        setError('Error al entrar en la demo. Comprueba que el emulador Firebase está corriendo.');
        console.error('Demo sign-in error:', err);
      }
    } finally {
      setDemoLoading(false);
      setDemoStatus('');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore || isSigningIn) return;
    setError(null);
    setIsSigningIn(true);
    isHandlingSignIn.current = true;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Fire-and-forget — don't block navigation on Firestore writes.
      // OnboardingGuard in the dashboard layout handles the /onboarding redirect for new users.
      setDoc(doc(firestore, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(err => console.warn('[login] user doc write failed:', err));

      router.push('/dashboard');

    } catch (error: any) {
      isHandlingSignIn.current = false;
      setIsSigningIn(false);
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (error.code === 'auth/operation-not-allowed') {
        setError('El inicio de sesión con Google no está habilitado para este proyecto. Por favor, habilítalo en la consola de Firebase.');
      } else {
        setError('Ocurrió un error inesperado durante el inicio de sesión. Por favor, inténtalo de nuevo.');
        console.error('Error during Google sign-in:', error);
      }
    }
  };

  // Show blank screen during initial auth check or when redirecting an existing session.
  // Do NOT block the UI when we're actively handling a new sign-in — errors must be visible.
  if (isUserLoading || (user && !isSigningIn)) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <BrainCircuit className="h-16 w-16 text-primary mb-2" />
          <h1 className="text-4xl font-bold tracking-tighter">Axiom</h1>
          <p className="text-muted-foreground text-lg">Tu sistema operativo de vida.</p>
        </div>

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error de Autenticación</AlertTitle>
                <AlertDescription>
                {error}
                </AlertDescription>
            </Alert>
        )}

        <div className="w-full space-y-4">
            <Button onClick={handleGoogleSignIn} disabled={isSigningIn} className="w-full h-12 text-lg shadow-lg" size="lg">
                {isSigningIn
                  ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Iniciando sesión...</>
                  : 'Iniciar sesión con Google'
                }
            </Button>

            {IS_AUTH_EMULATOR && (
              <Button
                onClick={handleDemoSignIn}
                disabled={demoLoading}
                variant="outline"
                className="w-full h-11 text-base border-dashed border-2"
                size="lg"
              >
                {demoLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{demoStatus || 'Iniciando...'}</>
                  : <><FlaskConical className="mr-2 h-4 w-4" />Explorar con cuenta demo</>
                }
              </Button>
            )}

            <div className="bg-muted/40 rounded-xl p-4 border border-border text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest">
                    <ShieldAlert size={14} />
                    Aviso de Seguridad
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Al entrar, aceptas que Axiom es una herramienta experimental de productividad. <strong>No proporciona asesoramiento médico, psicológico ni psiquiátrico.</strong> Si estás experimentando una emergencia de salud mental, por favor contacta con los servicios de emergencia de tu país.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}


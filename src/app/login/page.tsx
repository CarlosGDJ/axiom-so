'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrainCircuit, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {
      setError('Ocurrió un error inesperado durante el inicio de sesión. Por favor, inténtalo de nuevo.');
      setIsSigningIn(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="w-full space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full h-12 text-lg shadow-lg"
            size="lg"
          >
            {isSigningIn
              ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Iniciando sesión...</>
              : 'Iniciar sesión con Google'
            }
          </Button>

          <div className="bg-muted/40 rounded-xl p-4 border border-border text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-widest">
              <ShieldAlert size={14} />
              Aviso de Seguridad
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Al entrar, aceptas que Axiom es una herramienta experimental de productividad.{' '}
              <strong>No proporciona asesoramiento médico, psicológico ni psiquiátrico.</strong>{' '}
              Si estás experimentando una emergencia de salud mental, por favor contacta con los servicios de emergencia de tu país.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

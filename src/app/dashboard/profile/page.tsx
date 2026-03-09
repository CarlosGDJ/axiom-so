
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { DashboardConfig, PlayerProfile, UserProfile } from '@/lib/types';
import EditPlayerProfileForm from '@/components/app/data-table/forms/edit-player-profile-form';
import ProfilePhotoEditor from '@/components/app/profile-photo-editor';
import { useRouter } from 'next/navigation';
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import NavigationReady from '@/components/app/navigation-ready';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, auth } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const playerProfileDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/playerProfile`, 'main-profile') : null),
    [user, firestore]
  );
  
  const userProfileDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );

  const { data: playerProfile } = useDoc<PlayerProfile>(playerProfileDocRef);
  const { data: userProfile } = useDoc<UserProfile>(userProfileDocRef);

  const calibrationDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}/dashboardConfig`, 'bio_auto_calibration') : null),
    [user, firestore]
  );
  const { data: calibrationDoc } = useDoc<DashboardConfig>(calibrationDocRef);

  const calibrationInfo = useMemo(() => {
    if (!calibrationDoc?.value) return null;
    try {
      const parsed = JSON.parse(calibrationDoc.value) as {
        last_calibrated_at?: string;
        confidence?: number;
        transitions?: number;
      };
      return {
        lastCalibratedAt: parsed.last_calibrated_at || null,
        confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0)),
        transitions: Math.max(0, parsed.transitions ?? 0),
      };
    } catch {
      return null;
    }
  }, [calibrationDoc?.value]);

  const sensitivityRows = useMemo(() => {
    if (!playerProfile) return [];
    return [
      { label: 'Estrés', value: playerProfile.sensitivity_stress, key: 'stress' },
      { label: 'Dopamina', value: playerProfile.sensitivity_dopamine, key: 'dopamine' },
      { label: 'Sueño', value: playerProfile.sensitivity_sleep, key: 'sleep' },
      { label: 'Emocional', value: playerProfile.sensitivity_emotional, key: 'emotional' },
      { label: 'Entorno', value: playerProfile.sensitivity_environmental, key: 'environmental' },
      { label: 'Presión', value: playerProfile.sensitivity_pressure, key: 'pressure' },
    ];
  }, [playerProfile]);

  const confidencePct = Math.round((calibrationInfo?.confidence ?? 0) * 100);
  const confidenceVariant =
    confidencePct >= 70 ? 'default' :
    confidencePct >= 40 ? 'secondary' :
    'outline';

  const handleRecalibrate = async () => {
    if (!user || !firestore) return;
    setIsResetting(true);
    
    try {
        const profileRef = doc(firestore, `users/${user.uid}/playerProfile`, 'main-profile');
        deleteDocumentNonBlocking(profileRef);
        
        toast({
            title: "Sistema Reseteado",
            description: "Iniciando proceso de bio-calibración...",
        });
        
        // El layout detectará que no hay perfil y redirigirá a /onboarding
        router.push('/onboarding');
    } catch (error) {
        toast({
            variant: 'destructive',
            title: "Error",
            description: "No se pudo reiniciar el perfil.",
        });
    } finally {
        setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth) return;

    try {
        await deleteUser(user);
        toast({ title: "Cuenta eliminada", description: "Tu cuenta de autenticación ha sido eliminada." });
        router.push('/login');
    } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
            toast({
                variant: 'destructive',
                title: "Se requiere reautenticación",
                description: "Por seguridad, debes volver a iniciar sesión antes de eliminar tu cuenta.",
            });
            const provider = new GoogleAuthProvider();
            try {
                await reauthenticateWithPopup(user, provider);
                await deleteUser(user);
                toast({ title: "Cuenta eliminada", description: "Tu cuenta ha sido eliminada con éxito." });
                await auth.signOut();
                router.push('/login');
            } catch (reauthError: any) {
                console.error("Re-authentication failed:", reauthError);
                toast({
                    variant: 'destructive',
                    title: "Falló la reautenticación",
                    description: "No se pudo eliminar la cuenta. Por favor, inténtalo de nuevo.",
                });
            }
        } else {
            console.error("Error deleting user:", error);
            toast({
                variant: 'destructive',
                title: "Error al eliminar la cuenta",
                description: error.message || "Ocurrió un error inesperado.",
            });
        }
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <NavigationReady />
      <div className="max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <EditPlayerProfileForm playerProfile={playerProfile} />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span>Calibración Automática</span>
                    <Badge variant={confidenceVariant}>
                      {calibrationInfo ? `${confidencePct}% confianza` : 'Sin calibrar'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Ajuste continuo del motor biométrico con tu histórico real. El sistema se actualiza con evidencia suficiente para evitar sobreajuste.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Confianza del modelo</span>
                      <span className="font-semibold">{confidencePct}%</span>
                    </div>
                    <Progress value={confidencePct} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Última calibración:{' '}
                        {calibrationInfo?.lastCalibratedAt
                          ? formatDistanceToNow(new Date(calibrationInfo.lastCalibratedAt), { addSuffix: true, locale: es })
                          : 'pendiente'}
                      </span>
                      <span>
                        Transiciones usadas: <span className="font-medium text-foreground">{calibrationInfo?.transitions ?? 0}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sensitivityRows.map((row) => {
                      const delta = row.value - 1;
                      const trendClass =
                        delta > 0.05 ? 'text-destructive' :
                        delta < -0.05 ? 'text-primary' :
                        'text-muted-foreground';
                      const trendText =
                        delta > 0.05 ? 'Más sensible' :
                        delta < -0.05 ? 'Más resiliente' :
                        'Estable';

                      return (
                        <div key={row.key} className="rounded-lg border p-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{row.label}</p>
                            <p className="text-sm font-semibold">{row.value.toFixed(2)}</p>
                          </div>
                          <p className={cn('text-xs mt-1', trendClass)}>
                            {trendText} ({delta >= 0 ? '+' : ''}{delta.toFixed(2)} vs base 1.00)
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle />
                    Zona de Peligro
                  </CardTitle>
                  <CardDescription>
                    Acciones críticas que afectan a la integridad de tu bioperfil.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reiniciar Calibración (Onboarding)
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Quieres recalibrar tu sistema?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esto eliminará tu perfil biológico actual y te llevará de nuevo al asistente de IA. Tus eventos y transacciones se mantendrán, pero tus áreas y habilidades se volverán a generar.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRecalibrate} className="bg-destructive hover:bg-destructive/90">
                          Sí, recalibrar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Eliminar mi cuenta</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta de autenticación. Tus datos quedarán inaccesibles.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Sí, eliminar mi cuenta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>

            </div>
            <div className="lg:col-span-1">
              <ProfilePhotoEditor userProfile={userProfile} />
            </div>
          </div>
      </div>
    </div>
  );
}

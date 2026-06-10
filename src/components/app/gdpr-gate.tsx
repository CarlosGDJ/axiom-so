'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, ShieldCheck, Heart, Wallet, Users, Activity, AlertTriangle } from 'lucide-react';
import { PrivacyPolicyDialog, PRIVACY_POLICY_VERSION } from './privacy-policy-dialog';
import { cn } from '@/lib/utils';

interface GdprConsentRecord {
  accepted: boolean;
  timestamp: string;
  version: string;
}

const DATA_CATEGORIES = [
  { icon: Activity,  label: 'Datos biométricos y de salud', color: 'text-blue-500',   description: 'Sueño, energía, estrés, cortisol y biomarcadores estimados.' },
  { icon: Heart,     label: 'Datos conductuales',           color: 'text-rose-500',   description: 'Hábitos, ejercicio, consumo de sustancias y comportamiento diario.' },
  { icon: Wallet,    label: 'Datos financieros',            color: 'text-green-500',  description: 'Ingresos, gastos, deudas y transacciones económicas.' },
  { icon: Users,     label: 'Datos relacionales',           color: 'text-violet-500', description: 'Relaciones personales e interacciones sociales.' },
];

function GdprConsentModal({ onAccept }: { onAccept: () => void }) {
  const auth = useAuth();
  const [checked, setChecked] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const handleAccept = () => {
    if (!checked) return;
    onAccept();
  };

  const handleReject = async () => {
    setIsLeaving(true);
    if (auth) await auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-auto rounded-2xl border bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-primary/5 border-b px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <BrainCircuit className="h-7 w-7 text-primary shrink-0" />
            <div>
              <h1 className="text-lg font-bold">Axiom — Consentimiento de datos</h1>
              <p className="text-xs text-muted-foreground">Reglamento (UE) 2016/679 — RGPD</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Intro */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Axiom procesa datos personales de <strong className="text-foreground">categoría especial</strong> (salud,
            comportamiento) que requieren tu consentimiento <strong className="text-foreground">explícito e informado</strong>{' '}
            antes de comenzar, conforme al Art. 9.2.a del RGPD.
          </p>

          {/* Data categories */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Datos que se procesarán</p>
            <div className="rounded-lg border bg-muted/30 divide-y">
              {DATA_CATEGORIES.map(({ icon: Icon, label, color, description }) => (
                <div key={label} className="flex items-start gap-3 px-3 py-2.5">
                  <Icon size={14} className={cn('mt-0.5 shrink-0', color)} />
                  <div>
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key points */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <ShieldCheck size={13} />
              <span>Resumen de tus derechos</span>
            </div>
            <ul className="space-y-1 text-muted-foreground pl-1">
              <li>· Tus datos se almacenan <strong className="text-foreground">solo en tu cuenta de Firebase</strong> — nadie más tiene acceso.</li>
              <li>· Puedes <strong className="text-foreground">exportar</strong> todos tus datos en CSV desde Ajustes.</li>
              <li>· Puedes <strong className="text-foreground">eliminar tu cuenta</strong> y todos tus datos en cualquier momento desde Perfil.</li>
              <li>· Puedes <strong className="text-foreground">retirar este consentimiento</strong> en cualquier momento desde Ajustes → RGPD.</li>
              <li>· No se usan tus datos con fines comerciales ni publicitarios.</li>
            </ul>
          </div>

          {/* Legal note on special category */}
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>
              Los datos de salud y comportamiento son <strong>datos de categoría especial</strong> bajo el RGPD.
              Su tratamiento requiere consentimiento explícito, libre, específico e informado, que puedes retirar en cualquier momento.
            </span>
          </div>

          <Separator />

          {/* Checkbox consent */}
          <div className={cn(
            'flex items-start gap-3 rounded-lg border p-3 transition-colors',
            checked ? 'border-primary bg-primary/5' : 'border-border',
          )}>
            <Checkbox
              id="gdpr-check"
              checked={checked}
              onCheckedChange={(v) => setChecked(!!v)}
              className="mt-0.5"
            />
            <Label htmlFor="gdpr-check" className="text-xs leading-relaxed cursor-pointer">
              He leído y comprendo la{' '}
              <PrivacyPolicyDialog
                trigger={
                  <span className="underline text-primary cursor-pointer font-semibold" onClick={e => e.stopPropagation()}>
                    Política de Privacidad de Axiom
                  </span>
                }
              />{' '}
              y consiento de forma <strong>libre, específica, informada e inequívoca</strong> el tratamiento de mis datos
              personales, incluyendo los de categoría especial, para los fines descritos.
            </Label>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={!checked}
              onClick={handleAccept}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />Acepto y quiero continuar
            </Button>
            <button
              onClick={handleReject}
              disabled={isLeaving}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors text-center py-1"
            >
              {isLeaving ? 'Cerrando sesión...' : 'No acepto — cerrar sesión y salir'}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Versión de la política: v{PRIVACY_POLICY_VERSION} · Contacto: c.gutierrez.con@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}

type ConsentStatus = 'loading' | 'accepted' | 'required';

function localKey(uid: string) { return `axiom_gdpr_${uid}_v${PRIVACY_POLICY_VERSION}`; }

export function GdprGate({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [status, setStatus] = useState<ConsentStatus>('loading');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setStatus('accepted'); // Let downstream components handle the auth redirect
      return;
    }

    // Fast-path: localStorage avoids a Firestore round-trip on every page load
    // and keeps the modal from reappearing when Firestore is temporarily unreachable.
    if (localStorage.getItem(localKey(user.uid)) === 'accepted') {
      setStatus('accepted');
      return;
    }

    getDoc(doc(firestore, `users/${user.uid}/settings/gdpr_consent`)).then((snap) => {
      const data = snap.data() as GdprConsentRecord | undefined;
      if (data?.accepted && data?.version === PRIVACY_POLICY_VERSION) {
        localStorage.setItem(localKey(user.uid), 'accepted');
        setStatus('accepted');
      } else {
        setStatus('required');
      }
    }).catch(() => {
      // Firestore unreachable — don't force the modal if the user has no local record.
      // They'll see it again only after clearing storage or on a new device.
      setStatus('required');
    });
  }, [user, isUserLoading, firestore]);

  const handleAccept = () => {
    if (!user) return;
    const record: GdprConsentRecord = {
      accepted: true,
      timestamp: new Date().toISOString(),
      version: PRIVACY_POLICY_VERSION,
    };
    setStatus('accepted');
    localStorage.setItem(localKey(user.uid), 'accepted');
    setDoc(doc(firestore, `users/${user.uid}/settings/gdpr_consent`), record)
      .catch(err => console.warn('[GdprGate] Failed to persist consent to Firestore:', err));
  };

  // SSR: render nothing (same as before — avoids hydration mismatch with Toaster/Radix portals).
  // Client: show a spinner after mount while the consent check resolves.
  if (status === 'loading') {
    if (!mounted) return null;
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Do not mount children until consent is confirmed — otherwise dashboard hooks
  // run while the modal is blocking and the onboarding redirect fires at the wrong time.
  return (
    <>
      {status === 'accepted' && children}
      {mounted && status === 'required' && createPortal(
        <GdprConsentModal onAccept={handleAccept} />,
        document.body,
      )}
    </>
  );
}

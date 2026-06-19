'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-session-user';
import { useUserData } from '@/hooks/use-user-data';
import { useCollection, revalidateCollection } from '@/hooks/use-mongo-collection';
import { setDocumentNonBlocking } from '@/lib/api-writes';
import { useToast } from '@/hooks/use-toast';
import { calibrateFromCheckinAction } from '@/lib/actions';
import { scoreLevel, stateLevel, STATE_TEXT, STATE_BADGE } from '@/lib/state-colors';
import { Loader2 } from 'lucide-react';

// Cierre del día: al entrar al sistema por la noche, un momento de reflexión donde
// el usuario verifica si está de acuerdo con cómo lo ve Axiom. Se guarda en BD
// (colección dailyCheckins, un doc por día) y sirve como señal de calibración.

const CHECKIN_HOUR = 20; // a partir de las 20:00 se considera "final del día"

const FACES = [
  { value: 1, emoji: '😞', label: 'Nada' },
  { value: 2, emoji: '🙁', label: 'Poco' },
  { value: 3, emoji: '😐', label: 'Algo' },
  { value: 4, emoji: '🙂', label: 'Bastante' },
  { value: 5, emoji: '😄', label: 'Totalmente' },
] as const;

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface CheckinDoc { id: string; fecha: string; agreement: number; perceived?: number }

export default function DailyCheckinModal() {
  const { user, uid } = useUser();
  const { data: userData } = useUserData();
  const { toast } = useToast();
  const { data: checkins } = useCollection<CheckinDoc>(uid ? 'dailyCheckins' : null, { orderBy: 'fecha', direction: 'desc', limit: 14 });

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false); // "ahora no" durante esta sesión
  const [agreement, setAgreement] = useState<number | null>(null);
  const [perceived, setPerceived] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const today = dayKey(new Date());
  const doneToday = useMemo(() => (checkins ?? []).some(c => c.fecha === today), [checkins, today]);

  // Decide si mostrar: noche + no hecho hoy + datos cargados + no descartado.
  useEffect(() => {
    if (dismissed || !user || !userData || checkins === null) return;
    const hour = new Date().getHours();
    if (hour >= CHECKIN_HOUR && !doneToday) setOpen(true);
  }, [dismissed, user, userData, checkins, doneToday]);

  const stats = userData?.rpg_stats;
  const score = Math.round(stats?.player_score ?? 0);
  const state = (userData?.overallState ?? 'OK') as 'OK' | 'RIESGO' | 'CRITICO';
  const sLevel = userData?.isLearningMode ? 'none' : scoreLevel(score);
  const stateLabel = state === 'CRITICO' ? 'Crítico' : state === 'RIESGO' ? 'Riesgo' : 'Estable';

  const mini = [
    { label: 'Foco', value: Math.round(stats?.foco ?? 0) },
    { label: 'Energía', value: Math.round(stats?.energia ?? 0) },
    { label: 'Sueño', value: Math.round(stats?.sueno ?? 0) },
  ];

  const handleSave = async () => {
    if (!user || agreement == null || perceived == null) return;
    setSaving(true);

    // 1) Guarda el cierre.
    setDocumentNonBlocking('dailyCheckins', today, {
      checkin_id: today,
      fecha: today,
      date: new Date().toISOString(),
      agreement,
      perceived,
      note: note.trim().slice(0, 500),
      snapshot: {
        player_score: score,
        overallState: state,
        foco: Math.round(stats?.foco ?? 0),
        energia: Math.round(stats?.energia ?? 0),
        sueno: Math.round(stats?.sueno ?? 0),
      },
    });
    revalidateCollection('dailyCheckins');

    // 2) Calibra el sistema con tu feedback (ajusta sensibilidades del perfil).
    try {
      const p = userData?.playerProfile;
      const current = {
        stress: p?.sensitivity_stress ?? 1,
        dopamine: p?.sensitivity_dopamine ?? 1,
        sleep: p?.sensitivity_sleep ?? 1,
        emotional: p?.sensitivity_emotional ?? 1,
        environmental: p?.sensitivity_environmental ?? 1,
        pressure: p?.sensitivity_pressure ?? 1,
      };
      const res = await calibrateFromCheckinAction({
        appScore: score,
        appState: state,
        biomarkers: JSON.stringify({ foco: Math.round(stats?.foco ?? 0), energia: Math.round(stats?.energia ?? 0), sueno: Math.round(stats?.sueno ?? 0), cortisol: Math.round(stats?.cortisol ?? 0) }),
        agreement, perceived, note: note.trim().slice(0, 500),
        recent: JSON.stringify((checkins ?? []).slice(0, 7).map(c => ({ fecha: c.fecha, agreement: c.agreement, perceived: c.perceived }))),
        current,
      });
      const s = res.sensitivities;
      setDocumentNonBlocking('playerProfile', 'main-profile', {
        sensitivity_stress: s.stress,
        sensitivity_dopamine: s.dopamine,
        sensitivity_sleep: s.sleep,
        sensitivity_emotional: s.emotional,
        sensitivity_environmental: s.environmental,
        sensitivity_pressure: s.pressure,
      }, { merge: true });
      revalidateCollection('playerProfile');
      // Guarda las sensibilidades resultantes en el cierre → permite ver la evolución.
      setDocumentNonBlocking('dailyCheckins', today, { sensitivities: s }, { merge: true });
      revalidateCollection('dailyCheckins');
      toast({ title: 'Cierre guardado · Axiom se ha ajustado', description: res.summary });
    } catch {
      toast({ title: 'Cierre guardado', description: 'Gracias por tu reflexión de hoy.' });
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  if (!userData) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setDismissed(true); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            Cierre del día
          </DialogTitle>
          <DialogDescription>
            Un momento de reflexión. Esto es lo que Axiom ve ahora mismo — dinos si encaja contigo.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen del estado */}
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score global</p>
              <p className={cn('text-3xl font-black tabular-nums leading-none', STATE_TEXT[sLevel])}>{score}<span className="text-base text-muted-foreground">/100</span></p>
            </div>
            <span className={cn('text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border', userData.isLearningMode ? STATE_BADGE.none : STATE_BADGE[stateLevel(state)])}>
              {userData.isLearningMode ? 'Calibrando' : stateLabel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {mini.map(m => (
              <div key={m.label} className="rounded-lg bg-background/60 border border-border/50 p-2 text-center">
                <p className="text-sm font-bold tabular-nums">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Caritas de acuerdo */}
        <div className="space-y-2">
          <p className="text-sm font-medium">¿Refleja esto cómo te has sentido hoy?</p>
          <div className="flex justify-between gap-1.5">
            {FACES.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setAgreement(f.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all active:scale-95',
                  agreement === f.value ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/40 hover:border-primary/30',
                )}
                aria-label={f.label}
              >
                <span className="text-2xl leading-none">{f.emoji}</span>
                <span className="text-[9px] font-medium text-muted-foreground leading-tight text-center">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Caritas de cómo se siente realmente (calibra el sistema) */}
        <div className="space-y-2">
          <p className="text-sm font-medium">¿Y cómo dirías que te sientes tú?</p>
          <div className="flex justify-between gap-1.5">
            {FACES.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setPerceived(f.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all active:scale-95',
                  perceived === f.value ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/40 hover:border-primary/30',
                )}
                aria-label={f.label}
              >
                <span className="text-2xl leading-none">{f.emoji}</span>
                <span className="text-[9px] font-medium text-muted-foreground leading-tight text-center">{f.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Comparamos esto con lo que ve Axiom para afinar el sistema a ti.</p>
        </div>

        {/* Reflexión opcional */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Reflexión <span className="text-muted-foreground font-normal">(opcional)</span></p>
          <Textarea
            placeholder="¿Qué ha marcado tu día? ¿Algo que el sistema no esté captando?"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="resize-none h-20 text-sm"
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => { setOpen(false); setDismissed(true); }} disabled={saving}>Ahora no</Button>
          <Button onClick={handleSave} disabled={agreement == null || perceived == null || saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando…</> : 'Guardar cierre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

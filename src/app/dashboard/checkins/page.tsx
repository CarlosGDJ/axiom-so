'use client';

import { useMemo } from 'react';
import { useUser } from '@/hooks/use-session-user';
import { useCollection } from '@/hooks/use-mongo-collection';
import { Card, CardContent } from '@/components/ui/card';
import { Moon, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import NavigationReady from '@/components/app/navigation-ready';

const FACE = ['', '😞', '🙁', '😐', '🙂', '😄'];

interface Checkin {
  id: string;
  fecha: string;
  date?: string;
  agreement: number;
  perceived?: number;
  note?: string;
  snapshot?: { player_score?: number; overallState?: string };
}

export default function CheckinsPage() {
  const { uid } = useUser();
  const { data, isLoading } = useCollection<Checkin>(uid ? 'dailyCheckins' : null, { orderBy: 'fecha', direction: 'desc', limit: 90 });

  const checkins = useMemo(() => (data ?? []).filter(c => c.fecha), [data]);
  const avgAgreement = useMemo(() => {
    if (!checkins.length) return 0;
    return checkins.reduce((a, c) => a + (c.agreement || 0), 0) / checkins.length;
  }, [checkins]);

  return (
    <div className="space-y-6 pb-16">
      <NavigationReady />

      <div className="flex items-center gap-2">
        <Moon className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Cierres del día</h2>
          <p className="text-sm text-muted-foreground">Tu reflexión diaria y cómo de acuerdo estás con cómo te ve Axiom.</p>
        </div>
      </div>

      {checkins.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cierres</p>
            <p className="text-2xl font-black tabular-nums">{checkins.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Acuerdo medio</p>
            <p className="text-2xl font-black tabular-nums flex items-center gap-1">{avgAgreement.toFixed(1)}<span className="text-base">{FACE[Math.round(avgAgreement)] || ''}</span></p>
          </CardContent></Card>
          <Card className="col-span-2 sm:col-span-1"><CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Último</p>
            <p className="text-sm font-semibold">{checkins[0] ? format(parseISO(checkins[0].fecha), "d 'de' MMM", { locale: es }) : '—'}</p>
          </CardContent></Card>
        </div>
      )}

      {isLoading && !data ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : checkins.length === 0 ? (
        <div className="text-center p-10 border-2 border-dashed rounded-xl bg-muted/20">
          <Moon className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-20" />
          <p className="text-foreground font-medium">Aún no hay cierres</p>
          <p className="text-sm text-muted-foreground">Por la noche, al entrar, podrás hacer tu cierre del día.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkins.map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="text-2xl leading-none shrink-0 pt-0.5">{FACE[c.agreement] || '·'}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold capitalize">{format(parseISO(c.fecha), "EEEE d 'de' MMMM", { locale: es })}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Acuerdo {FACE[c.agreement] || '·'}</span>
                      {c.perceived ? <span>Te sentías {FACE[c.perceived]}</span> : null}
                      {typeof c.snapshot?.player_score === 'number' && (
                        <span className="font-mono">Score {c.snapshot.player_score}</span>
                      )}
                    </div>
                  </div>
                  {c.note && <p className="text-xs text-muted-foreground leading-snug italic">"{c.note}"</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

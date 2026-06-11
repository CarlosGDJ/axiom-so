
'use client';

import { useMemo, useState } from 'react';
import type { DashboardConfig, PlayerProfile, UserProfile } from '@/lib/types';
import EditPlayerProfileForm from '@/components/app/data-table/forms/edit-player-profile-form';
import ProfilePhotoEditor from '@/components/app/profile-photo-editor';
import { useRouter } from 'next/navigation';
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
import { AlertTriangle, RefreshCcw, CalendarDays, Zap, BookOpen, CheckCircle2, FileDown } from 'lucide-react';
import NavigationReady from '@/components/app/navigation-ready';
import PersonalityRadarCard from '@/components/app/personality-radar-card';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUserData } from '@/hooks/use-user-data';
import { computeProgression } from '@/lib/progression';
import ProfileProgressionCard from '@/components/app/profile-progression-card';
import XpTimelineChart from '@/components/app/charts/xp-timeline-chart';
import ExportPdfButton from '@/components/app/export-pdf-button';
import { useUser } from '@/hooks/use-session-user';
import { useDoc } from '@/hooks/use-mongo-collection';
import { signOut } from 'next-auth/react';
import { clearGdprConsent } from '@/components/app/gdpr-gate';
export default function ProfilePage() {
  const { user, uid } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { data: userData } = useUserData();

  const { data: playerProfile } = useDoc<PlayerProfile>('playerProfile', uid ? 'main-profile' : null);
  const { data: userProfile } = useDoc<UserProfile>('userProfile', uid ? uid : null);
  const { data: calibrationDoc } = useDoc<DashboardConfig>('dashboardConfig', uid ? 'bio_auto_calibration' : null);

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

  const progressionData = useMemo(() => {
    if (!userData) return null;
    return computeProgression(
      userData.skills || [],
      userData.events || [],
      userData.kpis?.dailyScoreTrend || [],
    );
  }, [userData]);

  const xpChartData = useMemo(() => {
    if (!userData) return [];
    const events = userData.events || [];
    const scores = userData.kpis?.dailyScoreTrend || [];

    const eventsByDay: Record<string, number> = {};
    events.forEach(e => {
      if (e.fecha) {
        const day = e.fecha.split('T')[0];
        eventsByDay[day] = (eventsByDay[day] || 0) + 1;
      }
    });

    return scores.slice(-30).map(d => {
      const scoreXP = d.score >= 85 ? 20 : d.score >= 70 ? 10 : 0;
      const count = eventsByDay[d.date] || 0;
      const habitXP = count > 0 ? Math.min(40, 10 + Math.max(0, count - 1) * 3) : 0;
      return { date: d.date, scoreXP, habitXP };
    });
  }, [userData]);

  const profileStats = useMemo(() => {
    if (!userData) return null;
    const events = userData.events || [];
    const areas = userData.areas || [];
    const skills = userData.skills || [];
    const milestones = userData.milestones || [];

    const dateSet = new Set<string>();
    events.forEach(e => { if (e.fecha) dateSet.add(e.fecha.split('T')[0]); });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOffset = dateSet.has(todayStr) ? 0 : 1;
    let currentStreak = 0;
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (dateSet.has(d.toISOString().split('T')[0])) currentStreak++;
      else break;
    }

    const completedMilestones = milestones
      .filter(m => m.estado === 'Completado' && m.fecha_completado)
      .sort((a, b) => b.fecha_completado!.localeCompare(a.fecha_completado!))
      .slice(0, 5);

    return {
      totalEvents: events.length,
      currentStreak,
      areasOK: areas.filter(a => a.estado === 'OK').length,
      totalAreas: areas.length,
      totalSkills: skills.length,
      completedMilestones,
    };
  }, [userData]);

  const computedBadges = useMemo(() => {
    if (!userData) return [];
    const badges: { icon: string; label: string; desc: string }[] = [];
    const stats = userData.rpg_stats;
    const events = userData.events ?? [];
    const milestones = userData.milestones ?? [];

    if (events.length >= 100) badges.push({ icon: '📊', label: 'Analista', desc: `${events.length} eventos registrados` });
    else if (events.length >= 20) badges.push({ icon: '📝', label: 'Constante', desc: `${events.length} eventos registrados` });

    if (profileStats?.currentStreak && profileStats.currentStreak >= 7) {
      badges.push({ icon: '🔥', label: `Racha ${profileStats.currentStreak}d`, desc: 'Días consecutivos de registro' });
    }

    if ((stats?.player_score ?? 0) >= 80) badges.push({ icon: '⭐', label: 'Alto rendimiento', desc: `Score ${Math.round(stats?.player_score ?? 0)}/100` });
    if ((stats?.sueno ?? 0) >= 80) badges.push({ icon: '😴', label: 'Maestro del sueño', desc: 'Sueño ≥ 80/100' });
    if ((stats?.dopamina ?? 0) >= 80) badges.push({ icon: '⚡', label: 'Dopamina óptima', desc: 'Dopamina ≥ 80/100' });

    const completed = milestones.filter(m => m.estado === 'Completado').length;
    if (completed >= 5) badges.push({ icon: '🏆', label: `${completed} hitos`, desc: 'Hitos completados' });
    else if (completed >= 1) badges.push({ icon: '✅', label: `${completed} hito${completed > 1 ? 's' : ''}`, desc: 'Completado' });

    if (profileStats?.areasOK === profileStats?.totalAreas && (profileStats?.totalAreas ?? 0) > 0) {
      badges.push({ icon: '🌟', label: 'Todas en verde', desc: 'Todas las áreas OK' });
    }

    return badges;
  }, [userData, profileStats]);

  const handleRecalibrate = async () => {
    if (!uid) return;
    setIsResetting(true);
    try {
      await fetch('/api/user/reset', { method: 'POST' });
      clearGdprConsent(uid);
      toast({ title: "Sistema Reseteado", description: "Iniciando proceso de bio-calibración..." });
      window.location.href = '/onboarding';
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo reiniciar el perfil." });
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await fetch('/api/user', { method: 'DELETE' });
      if (uid) clearGdprConsent(uid);
      toast({ title: "Cuenta eliminada", description: "Tu cuenta ha sido eliminada." });
      await signOut({ callbackUrl: '/login' });
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        variant: 'destructive',
        title: "Error al eliminar la cuenta",
        description: error.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };
  
  return (
    <div className="space-y-8 pb-10">
      <NavigationReady />

      {/* ── Stats row ── */}
      {profileStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Eventos registrados', value: profileStats.totalEvents.toLocaleString(), icon: BookOpen, color: 'text-primary' },
            { label: 'Racha actual', value: `${profileStats.currentStreak}d`, icon: CalendarDays, color: profileStats.currentStreak >= 7 ? 'text-yellow-500' : 'text-orange-500' },
            { label: 'Áreas estables', value: `${profileStats.areasOK}/${profileStats.totalAreas}`, icon: CheckCircle2, color: 'text-green-500' },
            { label: 'Habilidades', value: profileStats.totalSkills.toString(), icon: Zap, color: 'text-violet-500' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="shadow-sm border-primary/10">
                <CardContent className="pt-4 pb-3 flex flex-col gap-1">
                  <Icon size={14} className={cn(stat.color)} />
                  <p className="text-2xl font-black tabular-nums">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">

              {/* ── Progression ── */}
              {progressionData && <ProfileProgressionCard data={progressionData} />}

              {/* ── XP Timeline ── */}
              {xpChartData.length > 0 && <XpTimelineChart data={xpChartData} />}

              <Card data-tour="profile-params">
                <CardHeader>
                  <CardTitle>Parámetros de perfil</CardTitle>
                </CardHeader>
                <CardContent>
                  <EditPlayerProfileForm playerProfile={playerProfile} />
                </CardContent>
              </Card>

              <Card data-tour="profile-calibration">
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
            <div className="lg:col-span-1 space-y-6">
              <div data-tour="profile-photo">
                <ProfilePhotoEditor userProfile={userProfile} />
              </div>
              {playerProfile && <PersonalityRadarCard playerProfile={playerProfile} />}

              {/* ── Achievements ── */}
              {(computedBadges.length > 0 || (profileStats?.completedMilestones.length ?? 0) > 0) && (
                <Card className="shadow-sm border-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-green-500" />
                      Logros
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {computedBadges.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {computedBadges.map((b, i) => (
                          <div key={i} className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1" title={b.desc}>
                            <span className="text-sm leading-none">{b.icon}</span>
                            <span className="text-[11px] font-medium">{b.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(profileStats?.completedMilestones.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hitos completados</p>
                        {profileStats!.completedMilestones.map(m => (
                          <div key={m.id} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 size={11} className="text-green-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{m.nombre}</p>
                              {m.fecha_completado && (
                                <p className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(m.fecha_completado), { addSuffix: true, locale: es })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── Export ── */}
              {userData && (
                <Card className="shadow-sm border-primary/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileDown size={13} className="text-primary" />
                      Exportar datos
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Descarga un resumen semanal de tu estado del sistema en PDF.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ExportPdfButton userData={userData} className="w-full" />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}

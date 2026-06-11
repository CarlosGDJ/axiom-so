'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Moon, Sun, Monitor, Bell, BellOff, Info, CheckCircle2,
  Download, SlidersHorizontal, Database, Clock, Upload, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import NavigationReady from '@/components/app/navigation-ready';
import { useUserData } from '@/hooks/use-user-data';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PrivacyPolicyDialog, PRIVACY_POLICY_VERSION } from '@/components/app/privacy-policy-dialog';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useUser } from '@/hooks/use-session-user';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/lib/api-writes';
import { signOut } from 'next-auth/react';
interface NotificationPrefs {
  finance: boolean;
  habits: boolean;
  milestones: boolean;
  system: boolean;
  morning_briefing: boolean;
}

interface EngineSettings {
  lookback_days: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  finance: true,
  habits: true,
  milestones: true,
  system: true,
  morning_briefing: true,
};

const DEFAULT_ENGINE: EngineSettings = { lookback_days: 90 };

const NOTIFICATION_LABELS: Record<keyof NotificationPrefs, { label: string; description: string }> = {
  finance: { label: 'Finanzas', description: 'Alertas de flujo negativo, gasto impulsivo y deuda elevada.' },
  habits: { label: 'Hábitos', description: 'Recordatorios de hábitos vencidos y rachas por romper.' },
  milestones: { label: 'Milestones', description: 'Aviso cuando un objetivo está retrasado o próximo a cumplirse.' },
  system: { label: 'Sistema', description: 'Cambios de estado global (RIESGO/CRÍTICO) y recalibraciones.' },
  morning_briefing: { label: 'Misión diaria', description: 'Notificación matutina con el objetivo del día.' },
};

const LOOKBACK_OPTIONS = [
  { value: 30,  label: '30 días',  description: 'Corto plazo — foco en la semana reciente.' },
  { value: 60,  label: '60 días',  description: 'Plazo medio — equilibrio entre precisión y tendencia.' },
  { value: 90,  label: '90 días',  description: 'Largo plazo — recomendado. Más datos, modelo más estable.' },
  { value: 180, label: '6 meses',  description: 'Histórico amplio — ideal con 6+ meses de uso.' },
];

function ThemeOption({ value, label, icon: Icon, currentTheme, onClick }: {
  value: string; label: string; icon: React.ElementType; currentTheme?: string; onClick: () => void;
}) {
  const isActive = currentTheme === value;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-all',
        isActive
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function exportEventsCSV(events: any[]) {
  const header = ['fecha', 'var_id', 'intensidad', 'tipo', 'contexto', 'impulsivo', 'duracion_min'];
  const rows = events.map(e => [
    e.fecha ?? '',
    e.var_id ?? '',
    e.intensidad ?? '',
    e.tipo ?? '',
    `"${(e.contexto ?? '').replace(/"/g, '""')}"`,
    e.impulsivo ? 'sí' : 'no',
    e.duracion_min ?? '',
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `axiom-eventos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, uid } = useUser();
  const { toast } = useToast();
  const { data: userData } = useUserData();
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [engine, setEngine] = useState<EngineSettings>(DEFAULT_ENGINE);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [engineSaved, setEngineSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [gdprRecord, setGdprRecord] = useState<{ accepted: boolean; timestamp: string; version: string } | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user || !uid) return;
    fetch(`/api/data/settings?docId=notifications`)
      .then(r => r.json())
      .then(data => { if (data) setPrefs({ ...DEFAULT_PREFS, ...data }); })
      .catch(() => {});
    fetch(`/api/data/settings?docId=engine`)
      .then(r => r.json())
      .then(data => { if (data) setEngine({ ...DEFAULT_ENGINE, ...data }); })
      .catch(() => {});
    fetch(`/api/data/settings?docId=gdpr_consent`)
      .then(r => r.json())
      .then(data => { if (data) setGdprRecord(data); })
      .catch(() => {});
  }, [user, uid]);

  function togglePref(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setPrefsSaved(false);
  }

  function savePrefs() {
    if (!user) return;
    setDocumentNonBlocking('settings', 'notifications', prefs as unknown as Record<string, unknown>);
    setPrefsSaved(true);
    toast({ title: 'Preferencias guardadas', description: 'Tus ajustes de notificación están actualizados.' });
  }

  function saveEngine() {
    if (!user) return;
    setDocumentNonBlocking('settings', 'engine', engine as unknown as Record<string, unknown>);
    setEngineSaved(true);
    toast({ title: 'Motor actualizado', description: `Horizonte de análisis: ${engine.lookback_days} días.` });
  }

  const allEnabled = Object.values(prefs).every(Boolean);
  function toggleAll() {
    const next = !allEnabled;
    setPrefs(Object.fromEntries(Object.keys(DEFAULT_PREFS).map((k) => [k, next])) as unknown as NotificationPrefs);
    setPrefsSaved(false);
  }

  const dataStats = useMemo(() => {
    const events = userData?.events ?? [];
    if (!events.length) return null;
    const sorted = [...events].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const firstDate = sorted[0]?.fecha?.split('T')[0];
    const lastDate = sorted[sorted.length - 1]?.fecha?.split('T')[0];
    return { total: events.length, firstDate, lastDate };
  }, [userData?.events]);

  return (
    <div className="container max-w-2xl py-6 space-y-6 pb-16">
      <NavigationReady />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground text-sm mt-1">Personaliza la apariencia, las alertas y el motor de análisis.</p>
      </div>

      {/* ── Apariencia ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Apariencia
          </CardTitle>
          <CardDescription>Elige cómo se ve Axiom en tu dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="grid grid-cols-3 gap-3">
              <ThemeOption value="light" label="Claro" icon={Sun} currentTheme={theme} onClick={() => setTheme('light')} />
              <ThemeOption value="dark" label="Oscuro" icon={Moon} currentTheme={theme} onClick={() => setTheme('dark')} />
              <ThemeOption value="system" label="Sistema" icon={Monitor} currentTheme={theme} onClick={() => setTheme('system')} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {['Claro', 'Oscuro', 'Sistema'].map((l) => (
                <div key={l} className="h-[72px] rounded-lg border bg-muted animate-pulse" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Motor de análisis ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Motor de análisis
          </CardTitle>
          <CardDescription>
            Controla cuántos días de histórico usa el motor para calcular correlaciones, tendencias y estado del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={String(engine.lookback_days)}
            onValueChange={(v) => { setEngine({ lookback_days: Number(v) }); setEngineSaved(false); }}
            className="space-y-2"
          >
            {LOOKBACK_OPTIONS.map(opt => (
              <div key={opt.value} className={cn(
                'flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer',
                engine.lookback_days === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40',
              )}>
                <RadioGroupItem value={String(opt.value)} id={`lb-${opt.value}`} className="mt-0.5" />
                <Label htmlFor={`lb-${opt.value}`} className="cursor-pointer flex-1">
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button onClick={saveEngine} disabled={engineSaved} size="sm">
            {engineSaved ? <><CheckCircle2 className="h-4 w-4 mr-2" />Guardado</> : 'Aplicar horizonte'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Notificaciones ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Notificaciones
              </CardTitle>
              <CardDescription>Controla qué alertas genera Axiom automáticamente.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs shrink-0 mt-1">
              {allEnabled
                ? <><BellOff className="h-3.5 w-3.5 mr-1" /> Silenciar todas</>
                : <><Bell className="h-3.5 w-3.5 mr-1" /> Activar todas</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {(Object.keys(DEFAULT_PREFS) as (keyof NotificationPrefs)[]).map((key, i, arr) => (
            <div key={key}>
              <div className="flex items-start justify-between gap-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor={`pref-${key}`} className="text-sm font-medium cursor-pointer">
                    {NOTIFICATION_LABELS[key].label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{NOTIFICATION_LABELS[key].description}</p>
                </div>
                <Switch
                  id={`pref-${key}`}
                  checked={prefs[key]}
                  onCheckedChange={() => togglePref(key)}
                />
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
          {/* Push permission */}
          {mounted && typeof window !== 'undefined' && 'Notification' in window && (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Notificaciones del sistema (OS)</p>
                  <p className="text-xs text-muted-foreground">
                    {pushPermission === 'granted'
                      ? 'Activadas — el sistema enviará alertas urgentes aunque la app esté en segundo plano.'
                      : pushPermission === 'denied'
                      ? 'Bloqueadas por el navegador. Actívalas desde la configuración del navegador.'
                      : 'Permite que Axiom envíe alertas críticas del sistema a tu escritorio.'}
                  </p>
                </div>
                {pushPermission === 'granted' ? (
                  <span className="text-xs font-semibold text-green-500 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Activas
                  </span>
                ) : pushPermission !== 'denied' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      Notification.requestPermission().then(p => {
                        setPushPermission(p);
                        if (p === 'granted') toast({ title: 'Notificaciones activadas', description: 'Recibirás alertas críticas del sistema.' });
                      });
                    }}
                  >
                    <Bell className="h-3.5 w-3.5 mr-1.5" />
                    Activar
                  </Button>
                ) : null}
              </div>
            </>
          )}

          <div className="pt-4">
            <Button onClick={savePrefs} disabled={prefsSaved} className="w-full sm:w-auto">
              {prefsSaved
                ? <><CheckCircle2 className="h-4 w-4 mr-2" />Guardado</>
                : 'Guardar preferencias'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Exportar datos ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Tus datos
          </CardTitle>
          <CardDescription>Descarga una copia de tus eventos registrados en formato CSV.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataStats ? (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de eventos</span>
                <span className="font-semibold tabular-nums">{dataStats.total.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primer registro</span>
                <span className="font-mono text-xs">{dataStats.firstDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último registro</span>
                <span className="font-mono text-xs">{dataStats.lastDate}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay eventos registrados aún.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!dataStats}
            onClick={() => {
              if (userData?.events) {
                exportEventsCSV(userData.events);
                toast({ title: 'CSV descargado', description: `${dataStats?.total} eventos exportados.` });
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar eventos (.csv)
          </Button>
        </CardContent>
      </Card>

      {/* ── RGPD / Privacidad ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Privacidad y RGPD
          </CardTitle>
          <CardDescription>Estado de tu consentimiento y derechos sobre tus datos personales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Consent status */}
          <div className={cn(
            'rounded-lg border p-3 flex items-start gap-3',
            gdprRecord?.accepted ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5',
          )}>
            {gdprRecord?.accepted
              ? <ShieldCheck size={16} className="text-green-500 mt-0.5 shrink-0" />
              : <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
            }
            <div className="space-y-0.5 text-sm">
              <p className="font-semibold">
                {gdprRecord?.accepted ? 'Consentimiento activo' : 'Sin consentimiento registrado'}
              </p>
              {gdprRecord?.timestamp && (
                <p className="text-xs text-muted-foreground">
                  Aceptado el {format(new Date(gdprRecord.timestamp), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: require('date-fns/locale/es').es })}
                  {' · '}Política v{gdprRecord.version}
                  {gdprRecord.version !== PRIVACY_POLICY_VERSION && (
                    <span className="text-amber-500 font-semibold"> · Versión desactualizada</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Rights summary */}
          <div className="text-xs text-muted-foreground space-y-1 pl-1">
            <p>· Puedes <strong className="text-foreground">exportar</strong> todos tus eventos desde "Tus datos" (arriba).</p>
            <p>· Puedes <strong className="text-foreground">eliminar tu cuenta</strong> desde Perfil → Zona de Peligro.</p>
            <p>· Puedes ejercer tus derechos RGPD contactando a <span className="font-mono">c.gutierrez.con@gmail.com</span>.</p>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2">
            <PrivacyPolicyDialog
              trigger={
                <Button variant="outline" size="sm">
                  Ver Política de Privacidad completa
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (!user) return;
                // Clear consent record → GdprGate will show modal again on next load
                setDocumentNonBlocking('settings', 'gdpr_consent', { accepted: false, timestamp: new Date().toISOString(), version: PRIVACY_POLICY_VERSION });
                await signOut({ callbackUrl: '/login' });
              }}
            >
              Retirar consentimiento y cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Acerca de ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Acerca de Axiom
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Versión del motor</span>
            <span className="font-mono text-foreground">clinical-v2.1</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span>Variables activas</span>
            <span className="font-mono text-foreground">44</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span>Hormonas monitorizadas</span>
            <span className="font-mono text-foreground">15</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span>Horizonte activo</span>
            <span className="font-mono text-foreground">{engine.lookback_days} días</span>
          </div>
          <Separator />
          <p className="text-xs leading-relaxed pt-1">
            Axiom es un Trabajo de Fin de Título (TFT) de Diseño de Sistemas Personales.
            No sustituye diagnóstico médico ni atención psicológica profesional.
          </p>
        </CardContent>
      </Card>

      {/* ── Importación CSV ── */}
      <CsvImportCard />

    </div>
  );
}

function CsvImportCard() {
  const { user, uid } = useUser();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    }).filter(r => Object.values(r).some(v => v));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
      setPreview(rows.slice(0, 3).map(r => JSON.stringify(r)));
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (!user || parsedRows.length === 0) return;
    setImporting(true);
    try {
      for (const row of parsedRows) {
        const fecha = row.fecha || row.date || row.Date || row.Fecha || new Date().toISOString();
        const var_id = row.var_id || row.variable || row.Variable || 'CUSTOM';
        const intensidad = parseFloat(row.intensidad || row.intensity || '5') || 5;
        addDocumentNonBlocking('events', {
          fecha: isNaN(Date.parse(fecha)) ? new Date().toISOString() : new Date(fecha).toISOString(),
          evento_id: `EVT_CSV_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          var_id,
          intensidad: Math.max(1, Math.min(10, intensidad)),
          contexto: row.contexto || row.context || row.Context || 'Importado desde CSV',
          tipo: row.tipo || 'Variable',
          impulsivo: false,
        });
      }
      toast({ title: `${parsedRows.length} registros importados`, description: 'El motor procesará los nuevos eventos en breve.' });
      setParsedRows([]);
      setPreview(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4 text-muted-foreground" />
          Importar datos (CSV)
        </CardTitle>
        <CardDescription>Importa eventos desde un archivo CSV externo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
          <label className="cursor-pointer space-y-1 block">
            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Selecciona un archivo CSV</p>
            <p className="text-[11px] text-muted-foreground">Columnas esperadas: <code className="text-[10px] bg-muted px-1 rounded">fecha, var_id, intensidad, contexto</code></p>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
          </label>
        </div>
        {preview && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Previsualización ({parsedRows.length} filas)</p>
            <div className="rounded-lg bg-muted/30 p-2 space-y-1">
              {preview.map((row, i) => (
                <p key={i} className="text-[10px] font-mono text-muted-foreground truncate">{row}</p>
              ))}
              {parsedRows.length > 3 && <p className="text-[10px] text-muted-foreground">… y {parsedRows.length - 3} más</p>}
            </div>
            <div className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>Los eventos importados afectarán el estado del sistema. Verifica los datos antes de importar.</span>
            </div>
            <Button size="sm" onClick={handleImport} disabled={importing} className="w-full gap-2">
              {importing ? <CheckCircle2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Importar {parsedRows.length} registros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

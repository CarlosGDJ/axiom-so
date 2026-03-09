'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { collection } from 'firebase/firestore';
import { Activity, BatteryCharging, Brain, Plus, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { RPGStats, UserData } from '@/lib/types';

interface ImpactSimulatorProps {
  userData: UserData;
}

export default function ImpactSimulator({ userData }: ImpactSimulatorProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'Variable' | 'Protocolo'>('Variable');
  const [intensity, setIntensity] = useState(3);

  const currentStats: RPGStats = userData.rpg_stats || ({
    dopamina: 50,
    serotonina: 50,
    cortisol: 20,
    foco: 70,
    energia: 75,
    sueño: 50,
    conexion_social: 50,
    carga_dopaminergica: 20,
    player_score: 50,
  } as RPGStats);

  const options = useMemo(() => {
    if (selectedType === 'Variable') {
      return (userData.variables || []).map((v) => ({ id: v.var_id, label: v.var_nombre }));
    }
    return (userData.protocols || []).map((p) => ({ id: p.protocolo_id, label: p.nombre }));
  }, [selectedType, userData.variables, userData.protocols]);

  const projection = useMemo(() => {
    if (!selectedId) return currentStats;
    const impacts = (userData.impactMatrix || []).filter((im) => im.var_id === selectedId);
    let focusDelta = 0;
    let energyDelta = 0;
    impacts.forEach((im) => {
      const effect = im.effect_size * (intensity / 5);
      if (im.hormone_id === 'FOCUS') focusDelta += effect;
      if (im.hormone_id === 'ENERGY') energyDelta += effect;
      if (im.hormone_id === 'DOPAMINA') focusDelta += effect * 0.2;
      if (im.hormone_id === 'CORTISOL') {
        focusDelta -= effect * 0.2;
        energyDelta -= effect * 0.2;
      }
    });

    return {
      ...currentStats,
      foco: Math.max(0, Math.min(100, Math.round(currentStats.foco + focusDelta))),
      energia: Math.max(0, Math.min(100, Math.round(currentStats.energia + energyDelta))),
    };
  }, [selectedId, intensity, currentStats, userData.impactMatrix]);

  const handleApply = () => {
    if (!user || !firestore || !selectedId) return;
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/events`), {
      evento_id: `EVT_SIM_${Date.now()}`,
      fecha: new Date().toISOString(),
      var_id: selectedId,
      intensidad: intensity,
      contexto: 'Registrado desde simulador de impacto.',
      tipo: selectedType,
    });
    toast({ title: 'Impacto aplicado', description: 'El evento se registró correctamente.' });
    setSelectedId('');
  };

  const focusDiff = projection.foco - currentStats.foco;
  const energyDiff = projection.energia - currentStats.energia;

  return (
    <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Simulador de Impacto
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Predicción IA
          </Badge>
        </div>
        <CardDescription>Proyecta cómo cambiarán tus niveles antes de actuar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button
            variant={selectedType === 'Variable' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => setSelectedType('Variable')}
          >
            <Activity size={12} className="mr-1" />
            Variable
          </Button>
          <Button
            variant={selectedType === 'Protocolo' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => setSelectedType('Protocolo')}
          >
            <Zap size={12} className="mr-1" />
            Protocolo
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">
            Seleccionar {selectedType === 'Variable' ? 'variable' : 'protocolo'}
          </label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Elige una opción..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase">Intensidad: {intensity}</label>
          <Slider min={1} max={5} step={1} value={[intensity]} onValueChange={(v) => setIntensity(v[0])} disabled={!selectedId} />
        </div>

        <div className="space-y-3">
          <MetricRow
            icon={<Brain size={14} className="text-primary" />}
            label="FOCO"
            current={currentStats.foco}
            next={projection.foco}
            diff={focusDiff}
          />
          <MetricRow
            icon={<BatteryCharging size={14} className="text-green-600" />}
            label="ENERGÍA"
            current={currentStats.energia}
            next={projection.energia}
            diff={energyDiff}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full h-10 font-bold" disabled={!selectedId} onClick={handleApply}>
          {selectedId ? (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Aplicar impacto al sistema
            </>
          ) : (
            'Elige una opción para proyectar'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function MetricRow({
  icon,
  label,
  current,
  next,
  diff,
}: {
  icon: ReactNode;
  label: string;
  current: number;
  next: number;
  diff: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs font-bold">
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground line-through">{current}%</span>
          <span className={cn('text-lg', diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : '')}>{next}%</span>
          {diff !== 0 && (
            <span className={cn('flex items-center text-[10px]', diff > 0 ? 'text-green-500' : 'text-red-500')}>
              {diff > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
              {Math.abs(diff).toFixed(0)}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-primary/20" style={{ width: `${current}%` }} />
        <div
          className={cn('absolute h-full transition-all duration-500', diff >= 0 ? 'bg-green-500' : 'bg-red-500')}
          style={{ left: `${Math.min(current, next)}%`, width: `${Math.abs(diff)}%` }}
        />
      </div>
    </div>
  );
}

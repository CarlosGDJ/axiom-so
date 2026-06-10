'use client';

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PlayerProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PersonalityRadarCardProps {
  playerProfile: PlayerProfile;
}

const TRAITS = [
  {
    key: 'personality_openness' as const,
    label: 'Apertura',
    high: 'Creativo, curioso, abierto a ideas nuevas.',
    low: 'Práctico, convencional, prefiere rutinas.',
  },
  {
    key: 'personality_conscientiousness' as const,
    label: 'Tesón',
    high: 'Organizado, disciplinado, orientado a metas.',
    low: 'Flexible, espontáneo, adaptable.',
  },
  {
    key: 'personality_extraversion' as const,
    label: 'Extraversión',
    high: 'Energizado por lo social, asertivo, expresivo.',
    low: 'Energizado por la soledad, reflexivo, reservado.',
  },
  {
    key: 'personality_agreeableness' as const,
    label: 'Amabilidad',
    high: 'Empático, cooperativo, orientado a los demás.',
    low: 'Directo, competitivo, escéptico.',
  },
  {
    key: 'personality_neuroticism' as const,
    label: 'Neuroticismo',
    high: 'Alta reactividad emocional, sensible al estrés.',
    low: 'Estable emocionalmente, resistente.',
  },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const trait = TRAITS.find(t => t.label === d.subject);
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm text-xs max-w-[180px]">
      <p className="font-bold mb-1">{d.subject} — {d.value}/100</p>
      <p className="text-muted-foreground leading-relaxed">
        {d.value >= 55 ? trait?.high : trait?.low}
      </p>
    </div>
  );
};

export default function PersonalityRadarCard({ playerProfile }: PersonalityRadarCardProps) {
  const data = TRAITS.map(t => ({
    subject: t.label,
    value: Math.round(playerProfile[t.key] ?? 50),
    fullMark: 100,
  }));

  const dominant = [...TRAITS]
    .map(t => ({ ...t, value: playerProfile[t.key] ?? 50 }))
    .sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50))
    .slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Perfil de Personalidad</CardTitle>
            <CardDescription className="text-xs">Big Five — OCEAN</CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {playerProfile.mbti_type && (
              <Badge variant="secondary" className="text-[10px] font-mono">{playerProfile.mbti_type}</Badge>
            )}
            {playerProfile.enneagram_type && (
              <Badge variant="outline" className="text-[10px]">{playerProfile.enneagram_type}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Radar
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Rasgos dominantes */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rasgos dominantes</p>
          {dominant.map(t => {
            const isHigh = t.value >= 55;
            const isLow = t.value <= 45;
            if (!isHigh && !isLow) return null;
            return (
              <div key={t.key} className="flex items-start gap-2 text-xs">
                <span className={cn(
                  'shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full',
                  isHigh ? 'bg-primary' : 'bg-muted-foreground'
                )} />
                <div>
                  <span className="font-semibold">{t.label} {isHigh ? 'alto' : 'bajo'} ({t.value})</span>
                  <p className="text-muted-foreground leading-relaxed">{isHigh ? t.high : t.low}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra resumen */}
        <div className="space-y-1.5 pt-1">
          {TRAITS.map(t => {
            const v = Math.round(playerProfile[t.key] ?? 50);
            return (
              <div key={t.key} className="flex items-center gap-2">
                <span className="text-[10px] w-20 text-muted-foreground shrink-0">{t.label}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all"
                    style={{ width: `${v}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono w-6 text-right text-muted-foreground">{v}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

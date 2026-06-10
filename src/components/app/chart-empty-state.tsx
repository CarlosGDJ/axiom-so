'use client';

import { BarChart2, TrendingUp, Activity, DatabaseZap } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  bar: BarChart2,
  line: TrendingUp,
  activity: Activity,
  data: DatabaseZap,
} as const;

interface ChartEmptyStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof ICONS;
  minHeight?: string;
  className?: string;
}

export default function ChartEmptyState({
  title = 'Sin datos',
  message = 'Registra actividad para ver esta gráfica.',
  icon = 'bar',
  minHeight = 'h-[200px]',
  className,
}: ChartEmptyStateProps) {
  const Icon = ICONS[icon];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 text-center',
        minHeight,
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="max-w-[220px] text-xs text-muted-foreground/70">{message}</p>
      </div>
    </div>
  );
}

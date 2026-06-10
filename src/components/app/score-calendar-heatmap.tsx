'use client';

import { useMemo, useState } from 'react';
import { subDays, format, parseISO, startOfWeek, differenceInDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DailyScore } from '@/lib/types';

interface ScoreCalendarHeatmapProps {
  data: DailyScore[];
  days?: number;
}

type Band = 'ok' | 'risk' | 'critical' | 'empty';

function scoreToBand(score: number | undefined): Band {
  if (score === undefined) return 'empty';
  if (score >= 60) return 'ok';
  if (score >= 40) return 'risk';
  return 'critical';
}

const BAND_CELL: Record<Band, string> = {
  ok:       'bg-green-500 hover:bg-green-400',
  risk:     'bg-orange-500 hover:bg-orange-400',
  critical: 'bg-red-500 hover:bg-red-400',
  empty:    'bg-muted hover:bg-muted-foreground/20',
};

const BAND_LABEL: Record<Band, string> = {
  ok:       'OK (≥60)',
  risk:     'Riesgo (40–59)',
  critical: 'Crítico (<40)',
  empty:    'Sin datos',
};

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function ScoreCalendarHeatmap({ data, days = 91 }: ScoreCalendarHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; score: number | undefined; band: Band } | null>(null);

  const { weeks, monthLabels } = useMemo(() => {
    const scoreByDate = new Map<string, number>();
    data.forEach(d => scoreByDate.set(d.date, d.score));

    const today = new Date();
    // Start from the Monday of the week that contains (today - days)
    const startDay = startOfWeek(subDays(today, days - 1), { weekStartsOn: 1 });
    const totalDays = differenceInDays(today, startDay) + 1;

    // Build flat array of day cells
    const cells: Array<{ date: string; score: number | undefined; band: Band; isInRange: boolean }> = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(startDay, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const isFuture = d > today;
      const score = isFuture ? undefined : scoreByDate.get(dateStr);
      cells.push({
        date: dateStr,
        score,
        band: isFuture ? 'empty' : scoreToBand(score),
        isInRange: !isFuture,
      });
    }

    // Group into weeks (columns of 7)
    const weeksArr: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeksArr.push(cells.slice(i, i + 7));
    }

    // Month labels: for each week column, detect if a new month starts
    const monthLabelMap = new Map<number, string>();
    weeksArr.forEach((week, wi) => {
      const firstDay = week[0];
      if (!firstDay) return;
      const d = parseISO(firstDay.date);
      const isFirstWeekOfMonth = d.getDate() <= 7;
      if (isFirstWeekOfMonth) {
        monthLabelMap.set(wi, MONTHS_ES[d.getMonth()]);
      } else if (wi === 0) {
        monthLabelMap.set(wi, MONTHS_ES[d.getMonth()]);
      }
    });

    return { weeks: weeksArr, monthLabels: monthLabelMap };
  }, [data, days]);

  const daysWithData = data.filter(d => {
    const daysAgo = differenceInDays(new Date(), parseISO(d.date));
    return daysAgo >= 0 && daysAgo < days;
  });
  const okDays   = daysWithData.filter(d => d.score >= 60).length;
  const riskDays = daysWithData.filter(d => d.score >= 40 && d.score < 60).length;
  const critDays = daysWithData.filter(d => d.score < 40).length;

  return (
    <div className="rounded-xl border bg-card/80 px-5 py-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-bold">Historial de estado · {days} días</p>
          <p className="text-[10px] text-muted-foreground">Score diario del sistema. Verde ≥60 · Naranja 40–59 · Rojo &lt;40</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />{okDays}d OK</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />{riskDays}d riesgo</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />{critDays}d crítico</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels row */}
          <div className="flex gap-[3px] mb-1 ml-6">
            {weeks.map((_, wi) => (
              <div key={wi} className="w-[14px] text-[9px] text-muted-foreground shrink-0">
                {monthLabels.get(wi) ?? ''}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {DAYS_ES.map((d, i) => (
                <div key={i} className="h-[14px] w-4 text-[9px] text-muted-foreground flex items-center justify-end pr-0.5">
                  {i % 2 === 0 ? d : ''}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    className={cn(
                      'w-[14px] h-[14px] rounded-sm cursor-default transition-colors',
                      BAND_CELL[cell.band],
                      !cell.isInRange && 'opacity-0 pointer-events-none',
                    )}
                    onMouseEnter={() => cell.isInRange && setTooltip({ date: cell.date, score: cell.score, band: cell.band })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-sm shrink-0', BAND_CELL[tooltip.band].split(' ')[0])} />
          <span className="font-bold text-foreground">
            {format(parseISO(tooltip.date), "d 'de' MMMM yyyy", { locale: es })}
          </span>
          <span>·</span>
          <span>{tooltip.score !== undefined ? `Score ${tooltip.score} — ${BAND_LABEL[tooltip.band]}` : 'Sin datos registrados'}</span>
        </div>
      )}
    </div>
  );
}

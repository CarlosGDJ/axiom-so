
'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  add,
  isWithinInterval,
  isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';

interface CustomCalendarProps {
  month: Date;
  setMonth: (date: Date) => void;
  selectedRange?: DateRange;
  setSelectedRange?: (range: DateRange | undefined) => void;
}

export function CustomCalendar({
  month,
  setMonth,
  selectedRange,
  setSelectedRange,
}: CustomCalendarProps) {
  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);

  const firstDayOfMonth = startOfMonth(month);
  const lastDayOfMonth = endOfMonth(month);

  const firstDayOfGrid = startOfWeek(firstDayOfMonth, { locale: es });
  const lastDayOfGrid = endOfWeek(lastDayOfMonth, { locale: es });

  const days = eachDayOfInterval({
    start: firstDayOfGrid,
    end: lastDayOfGrid,
  });

  const weekdays = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

  const handleDayClick = (day: Date) => {
    if (!setSelectedRange) return;

    if (!selectedRange?.from || selectedRange.to) {
      setSelectedRange({ from: day, to: undefined });
    } else {
      if (isAfter(day, selectedRange.from)) {
        setSelectedRange({ from: selectedRange.from, to: day });
      } else {
        setSelectedRange({ from: day, to: selectedRange.from });
      }
    }
  };

  const getDayState = (day: Date) => {
    const from = selectedRange?.from;
    const to = selectedRange?.to;

    const isSelected = (from && isSameDay(day, from)) || (to && isSameDay(day, to));
    const isRangeStart = from && isSameDay(day, from);
    const isRangeEnd = to && isSameDay(day, to);
    
    let isInRange = false;
    let effectiveTo = to || (hoveredDate && from && !isSameDay(hoveredDate, from) ? hoveredDate : undefined);
    
    if (from && effectiveTo) {
      const interval = {
        start: isAfter(from, effectiveTo) ? effectiveTo : from,
        end: isAfter(from, effectiveTo) ? from : effectiveTo
      };
      if (isWithinInterval(day, interval)) {
        isInRange = true;
      }
    }

    const isFullRangeSelected = from && to && isSameDay(from, to);

    return { isSelected, isRangeStart, isRangeEnd, isInRange, isFullRangeSelected };
  };

  return (
    <div className="p-3 w-full">
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setMonth(add(month, { months: -1 }))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium capitalize">
          {format(month, 'MMMM yyyy', { locale: es })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => setMonth(add(month, { months: 1 }))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-muted-foreground">
        {weekdays.map((day) => (
          <div key={day} className="capitalize">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 mt-2">
        {days.map((day) => {
          const { isSelected, isRangeStart, isRangeEnd, isInRange } = getDayState(day);
          const isCurrentMonth = isSameMonth(day, month);

          return (
            <div
              key={day.toString()}
              className={cn(
                'relative flex items-center justify-center',
                 isInRange && !isRangeStart && !isRangeEnd && 'bg-accent/50',
                 isRangeStart && !isRangeEnd && 'rounded-l-full bg-gradient-to-r from-transparent via-accent/50 to-accent/50',
                 isRangeEnd && !isRangeStart && 'rounded-r-full bg-gradient-to-l from-transparent via-accent/50 to-accent/50',
                 isRangeStart && isRangeEnd && 'bg-accent/50 rounded-full'
              )}
              onMouseEnter={() => setHoveredDate(day)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  'relative h-8 w-8 transition-colors rounded-full',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50',
                  !isSelected && 'hover:bg-accent hover:text-accent-foreground',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  isToday(day) && !isSelected && 'border border-primary'
                )}
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

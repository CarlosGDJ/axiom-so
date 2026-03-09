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
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SingleCalendarProps {
  selected: Date;
  onSelect: (date: Date | undefined) => void;
  initialFocus: boolean;
}

export function SingleCalendar({
  selected,
  onSelect,
}: SingleCalendarProps) {

  const [month, setMonth] = React.useState(selected || new Date());
  
  // Effect to sync the displayed month with the selected date prop
  React.useEffect(() => {
    if (selected && !isSameMonth(selected, month)) {
      setMonth(selected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);


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
    if (onSelect) {
      onSelect(day);
    }
  };

  return (
    <div className="p-3 w-full">
      <div className="flex items-center justify-between mb-4">
        <Button
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
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentMonth = isSameMonth(day, month);

          return (
            <div
              key={day.toString()}
              className='relative flex items-center justify-center'
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

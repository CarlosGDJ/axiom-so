
'use client';

import * as React from 'react';
import { addDays, format, startOfMonth, subDays, startOfToday, endOfToday, isSameDay, startOfWeek, subMonths, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Check, ChevronDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  setDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [month, setMonth] = React.useState(date?.from || new Date());
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(date);

  React.useEffect(() => {
    if (!isOpen) {
      setDraftRange(date);
      if (date?.from) {
        setMonth(date.from);
      }
    }
  }, [date, isOpen]);

  const presets = [
    { 
        label: 'Hoy', 
        id: 'today',
        range: { from: startOfToday(), to: endOfToday() } 
    },
    { 
        label: 'Esta semana', 
        id: 'this_week',
        range: { from: startOfWeek(new Date(), { locale: es, weekStartsOn: 1 }), to: endOfToday() } 
    },
    { 
        label: 'Últimos 7 días', 
        id: 'last_7',
        range: { from: subDays(new Date(), 6), to: endOfToday() } 
    },
    { 
        label: 'Mes actual', 
        id: 'this_month',
        range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } 
    },
    { 
        label: 'Mes anterior', 
        id: 'last_month',
        range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } 
    },
  ];

  const handlePresetClick = (presetRange: DateRange) => {
    setDate(presetRange);
    setDraftRange(presetRange);
    setMonth(presetRange.from || new Date());
    setIsOpen(false);
  };

  const isPresetActive = (presetRange: DateRange) => {
    if (!date?.from || !date?.to) return false;
    return isSameDay(date.from, presetRange.from!) && isSameDay(date.to, presetRange.to!);
  };

  return (
    <div className={cn('grid gap-2', className)}>
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (open) {
                setDraftRange(date);
              }
            }}
        >
            <PopoverTrigger asChild>
            <Button
                id="date"
                type="button"
                variant={'outline'}
                className={cn(
                'w-full sm:w-[300px] justify-between text-left font-normal bg-background border-primary/10 hover:border-primary/30 transition-colors',
                !date && 'text-muted-foreground'
                )}
            >
                <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, 'd MMM', { locale: es })} - {format(date.to, 'd MMM, yyyy', { locale: es })}
                            </>
                        ) : (
                            format(date.from, 'd MMM, yyyy', { locale: es })
                        )
                    ) : (
                        <span>Filtrar por fecha</span>
                    )}
                </div>
                <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[480px] p-0 shadow-2xl border-primary/10 overflow-hidden" align="end">
                <div className="grid grid-cols-12 h-[340px]">
                    {/* Presets Sidebar */}
                    <div className="col-span-4 flex flex-col p-2 bg-muted/30 border-r">
                        <p className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Periodos</p>
                        {presets.map((preset) => (
                            <Button
                                key={preset.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "justify-between font-medium text-xs h-9 px-3 hover:bg-primary/5 hover:text-primary transition-all",
                                    isPresetActive(preset.range) && "bg-primary/10 text-primary"
                                )}
                                onClick={() => handlePresetClick(preset.range)}
                            >
                                {preset.label}
                                {isPresetActive(preset.range) && <Check className="h-3 w-3" />}
                            </Button>
                        ))}
                    </div>
                    
                    {/* Calendar Content */}
                    <div className="col-span-8 flex items-center justify-center p-2 bg-background">
                        <CustomCalendar 
                            month={month}
                            setMonth={setMonth}
                            selectedRange={draftRange ?? date}
                            setSelectedRange={(newRange) => {
                                setDraftRange(newRange);
                                if (newRange?.from && newRange?.to) {
                                    setDate(newRange);
                                    setIsOpen(false);
                                }
                            }}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    </div>
  );
}

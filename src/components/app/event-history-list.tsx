'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Event } from '@/lib/types';

interface EventHistoryListProps {
  events: Event[];
  emptyMessage?: string;
  /** Render the leading icon for an event */
  renderIcon: (event: Event) => React.ReactNode;
  /** Render the trailing badge/chip for an event */
  renderBadge?: (event: Event) => React.ReactNode;
  title?: string;
  description?: string;
  initialCount?: number;
  pageSize?: number;
}

export default function EventHistoryList({
  events,
  emptyMessage = 'Sin registros aún.',
  renderIcon,
  renderBadge,
  title = 'Actividad reciente',
  description,
  initialCount = 8,
  pageSize = 8,
}: EventHistoryListProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const visible = events.slice(0, visibleCount);
  const hasMore = visibleCount < events.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {visible.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                {renderIcon(ev)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{ev.contexto || ev.var_id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(ev.fecha), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {renderBadge && renderBadge(ev)}
              </div>
            ))}

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-xs text-muted-foreground gap-1"
                onClick={() => setVisibleCount(c => c + pageSize)}
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Ver {Math.min(pageSize, events.length - visibleCount)} más
                <span className="text-[10px] opacity-60">({events.length - visibleCount} restantes)</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

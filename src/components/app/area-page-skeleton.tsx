'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function CardSkeleton({ rows = 3, showButtons = false }: { rows?: number; showButtons?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
        {showButtons && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AreaPageSkeleton() {
  return (
    <div className="space-y-8 pb-16 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Area detail panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick log */}
      <CardSkeleton rows={0} showButtons />

      {/* History */}
      <CardSkeleton rows={4} />
    </div>
  );
}

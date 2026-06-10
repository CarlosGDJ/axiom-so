'use client';

import { Skeleton } from '@/components/ui/skeleton';

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-8 w-14 rounded-md" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

function SkeletonChartCard({ height = 'h-48', className = '' }: { height?: string; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className={`w-full rounded-lg ${height}`} />
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-5 pb-10 animate-in fade-in duration-300">
      {/* HUD Strip */}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-lg border bg-card p-2.5 space-y-1.5 min-w-0">
            <Skeleton className="h-3 w-12 rounded-full mx-auto" />
            <Skeleton className="h-6 w-10 rounded-md mx-auto" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Weekly summary */}
      <SkeletonChartCard height="h-28" />

      {/* Hormonal forecast */}
      <SkeletonChartCard height="h-24" />

      {/* 2-col: Overview + Kairos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkeletonCard className="min-h-[260px]" />
        <div className="rounded-xl border bg-card p-4 space-y-3 min-h-[260px]">
          <Skeleton className="h-5 w-28 rounded-full" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-2 space-y-1">
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-md" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Habit momentum */}
      <SkeletonChartCard height="h-32" />

      {/* Daily score chart */}
      <SkeletonChartCard height="h-44" />

      {/* 2-col: Areas + Finances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkeletonChartCard height="h-36" />
        <SkeletonCard className="min-h-[160px]" />
      </div>
    </div>
  );
}

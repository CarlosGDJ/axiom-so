'use client';

// useUserData is a thin wrapper around UserDataContext.
// All Firestore listeners live in a single UserDataProvider instance in the
// dashboard layout — this hook just reads from that shared context, so 23
// call-sites across the dashboard share ONE set of listeners instead of each
// opening their own.
//
// Pages that need date-range filtering (analytics, finances, data) receive the
// full dataset from context and filter client-side.

import type { DateRange } from 'react-day-picker';
import { useUserDataContext } from '@/contexts/user-data-context';
import { useMemo } from 'react';
import { startOfDay } from 'date-fns';
import type { Event, Transaction, Interaction } from '@/lib/types';

export function useUserData(dateRange?: DateRange) {
  const ctx = useUserDataContext();

  const filtered = useMemo(() => {
    if (!dateRange?.from || !ctx.data) return ctx.data;

    const from = startOfDay(dateRange.from).toISOString();
    const to = dateRange.to
      ? (() => { const d = new Date(dateRange.to!); d.setHours(23,59,59,999); return d.toISOString(); })()
      : null;

    const inRange = (fecha: string) => fecha >= from && (!to || fecha <= to);

    return {
      ...ctx.data,
      events: (ctx.data.events ?? []).filter((e: Event) => e.fecha && inRange(e.fecha)),
      transactions: (ctx.data.transactions ?? []).filter((t: Transaction) => t.fecha && inRange(t.fecha)),
      allTransactions: (ctx.data.allTransactions ?? []).filter((t: Transaction) => t.fecha && inRange(t.fecha)),
      debtTransactions: (ctx.data.debtTransactions ?? []).filter((t: Transaction) => t.fecha && inRange(t.fecha)),
      interactions: (ctx.data.interactions ?? []).filter((i: Interaction) => i.fecha && inRange(i.fecha)),
    };
  }, [ctx.data, dateRange]);

  return { data: filtered, isLoading: ctx.isLoading, isValidating: ctx.isValidating, writerPrefetch: ctx.writerPrefetch };
}

'use client';

import useSWR, { mutate as globalMutate } from 'swr';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Fetch ${url} failed: ${r.status}`);
    return r.json();
  });

export interface CollectionOptions {
  limit?: number;
  orderBy?: string;
  direction?: 'asc' | 'desc';
}

export function useCollection<T = Record<string, unknown>>(
  collection: string | null,
  options?: CollectionOptions
) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.orderBy) params.set('orderBy', options.orderBy);
  if (options?.direction) params.set('direction', options.direction);

  const qs = params.toString();
  const url = collection ? `/api/data/${collection}${qs ? `?${qs}` : ''}` : null;

  const { data, isLoading, error, mutate } = useSWR<T[]>(url, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error ?? null,
    mutate,
  };
}

export function useDoc<T = Record<string, unknown>>(
  collection: string | null,
  docId: string | null
) {
  const url =
    collection && docId
      ? `/api/data/${collection}?docId=${encodeURIComponent(docId)}`
      : null;

  const { data, isLoading, error, mutate } = useSWR<T>(url, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error ?? null,
    mutate,
  };
}

export function revalidateCollection(collection: string) {
  globalMutate((key: unknown) =>
    typeof key === 'string' && key.includes(`/api/data/${collection}`)
  );
}

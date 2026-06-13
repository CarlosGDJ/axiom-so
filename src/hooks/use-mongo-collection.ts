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

  const { data, isLoading, isValidating, error, mutate } = useSWR<T[]>(url, fetcher, {
    // Las escrituras revalidan su colección al instante (api-writes + el writer de
    // computed), así que el poll de fondo es solo una red de seguridad: 90s en vez
    // de 30s. revalidateOnFocus desactivado evita la ráfaga de ~18 peticiones cada
    // vez que la pestaña recupera el foco.
    refreshInterval: 90_000,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });

  return {
    data: data ?? null,
    isLoading,
    isValidating,
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

  const { data, isLoading, isValidating, error, mutate } = useSWR<T>(url, fetcher, {
    // Las escrituras revalidan su colección al instante (api-writes + el writer de
    // computed), así que el poll de fondo es solo una red de seguridad: 90s en vez
    // de 30s. revalidateOnFocus desactivado evita la ráfaga de ~18 peticiones cada
    // vez que la pestaña recupera el foco.
    refreshInterval: 90_000,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });

  return {
    data: data ?? null,
    isLoading,
    isValidating,
    error: error ?? null,
    mutate,
  };
}

// El documento del usuario (colección `users`) NO está en el allowlist de
// /api/data por seguridad; se sirve por su ruta dedicada /api/user.
export function useUserProfile<T = Record<string, unknown>>(active: boolean) {
  const { data, isLoading, isValidating, error, mutate } = useSWR<T>(
    active ? '/api/user' : null,
    fetcher,
    { refreshInterval: 90_000, revalidateOnFocus: false, dedupingInterval: 10_000 },
  );
  return { data: data ?? null, isLoading, isValidating, error: error ?? null, mutate };
}

export function revalidateCollection(collection: string) {
  globalMutate((key: unknown) =>
    typeof key === 'string' && key.includes(`/api/data/${collection}`)
  );
}

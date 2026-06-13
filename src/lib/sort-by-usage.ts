// Orden estándar de los selectores de registro en toda la app:
// primero los más usados (frecuencia desc), el resto alfabético (A→Z).

/** Cuenta la frecuencia de uso por id a partir de un historial. */
export function buildFreq<T>(items: T[] | undefined, idOf: (t: T) => string | undefined | null): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const it of items ?? []) {
    const id = idOf(it);
    if (id) freq[id] = (freq[id] || 0) + 1;
  }
  return freq;
}

/** Ordena: más usados primero (por `freq`), empate → alfabético por nombre. */
export function sortByUsage<T>(
  items: T[],
  freq: Record<string, number>,
  idOf: (t: T) => string,
  nameOf: (t: T) => string,
): T[] {
  return [...items].sort((a, b) => {
    const fa = freq[idOf(a)] || 0;
    const fb = freq[idOf(b)] || 0;
    if (fb !== fa) return fb - fa;
    return nameOf(a).localeCompare(nameOf(b));
  });
}

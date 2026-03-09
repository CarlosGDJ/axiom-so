'use client';
import { useMemo, type DependencyList } from 'react';
import type { Query, DocumentReference } from 'firebase/firestore';

/**
 * Hook to memoize Firebase queries and document references.
 *
 * This hook is a lightweight wrapper around `React.useMemo` that ensures the
 * referential stability of Firestore `Query` and `DocumentReference` objects.
 * This is critical for preventing infinite loops in hooks like `useCollection`
 * or `useDoc` that depend on these objects.
 *
 * Why is this needed
 * Firestore queries/references created inside a component are new objects on every render.
 * If passed as a dependency to `useEffect` (as in `useCollection`), it causes the effect
 * to re-run on every render, leading to an infinite loop of re-fetching data.
 * `useMemo` solves this by returning the same object instance unless its dependencies change.
 *
 * The __memo property is a marker to indicate that the object has been properly memoized.
 * This is used to enforce best practices at runtime.
 *
 * @template T - The type of the query or reference (Query or DocumentReference).
 * @param {() => T | null | undefined} factory - A function that creates the query or reference.
 * @param {DependencyList} deps - The dependency array for the `useMemo` hook.
 * @returns {T & {__memo: true}} The memoized query or reference, or null/undefined.
 */
export function useMemoFirebase<T extends Query<any> | DocumentReference<any>>(
  factory: () => T | null | undefined,
  deps: DependencyList
): (T & { __memo: true }) | null | undefined {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedValue = useMemo(factory, deps);

  // Attach the memoization marker if the value is not null.
  if (memoizedValue) {
    (memoizedValue as T & { __memo: true }).__memo = true;
  }

  return memoizedValue as (T & { __memo: true }) | null | undefined;
}

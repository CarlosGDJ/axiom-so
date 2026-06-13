'use client';

import { useCallback, useMemo } from 'react';
import { useCollection, revalidateCollection } from '@/hooks/use-mongo-collection';
import { setDocumentNonBlocking } from '@/lib/api-writes';
import { useUser } from '@/hooks/use-session-user';
import type { DashboardConfig } from '@/lib/types';
import {
  type FinanceCategory,
  DASHBOARD_CONFIG_KEY,
  DEFAULT_FINANCE_CATEGORIES,
  parseCategories,
} from '@/lib/finance-categories';

// Lee/escribe el catálogo de categorías financieras desde dashboardConfig.
// SWR deduplica por URL, así que llamarlo desde varios componentes no multiplica
// peticiones.
export function useFinanceCategories() {
  const { uid } = useUser();
  const { data: dashboardConfig, isLoading } = useCollection<DashboardConfig>(
    uid ? 'dashboardConfig' : null,
    { orderBy: 'key', direction: 'asc' },
  );

  const categories = useMemo(() => {
    const raw = dashboardConfig?.find(c => c.key === DASHBOARD_CONFIG_KEY)?.value;
    return raw ? parseCategories(raw) : DEFAULT_FINANCE_CATEGORIES;
  }, [dashboardConfig]);

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  const saveCategories = useCallback((next: FinanceCategory[]) => {
    setDocumentNonBlocking('dashboardConfig', DASHBOARD_CONFIG_KEY, {
      key: DASHBOARD_CONFIG_KEY,
      value: JSON.stringify(next),
    });
    revalidateCollection('dashboardConfig');
  }, []);

  return { categories, expenseCategories, incomeCategories, saveCategories, isLoading };
}

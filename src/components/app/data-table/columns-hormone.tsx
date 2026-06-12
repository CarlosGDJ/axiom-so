
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Hormone } from '@/lib/types';

export const columns: ColumnDef<Hormone>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
  },
  {
    accessorKey: 'current_level',
    header: 'Nivel Actual',
  },
  {
    accessorKey: 'baseline',
    header: 'Línea Base',
  },
  {
    accessorKey: 'optimal_range',
    header: 'Rango Óptimo',
  },
];


'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Hormone } from '@/lib/types';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const columns: ColumnDef<Hormone>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
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

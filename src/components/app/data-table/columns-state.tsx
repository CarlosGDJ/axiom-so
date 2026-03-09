
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { State } from '@/lib/types';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const columns: ColumnDef<State>[] = [
  {
    accessorKey: 'estado_id',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Estado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'prioridad',
    header: 'Prioridad',
  },
  {
    accessorKey: 'condicion',
    header: 'Condición',
  },
  {
    accessorKey: 'restricciones',
    header: 'Restricciones',
  },
];

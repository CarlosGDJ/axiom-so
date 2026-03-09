
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Area } from '@/lib/types';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const columns: ColumnDef<Area>[] = [
  {
    accessorKey: 'area_nombre',
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
    accessorKey: 'prioridad',
    header: 'Prioridad',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
  },
  {
    accessorKey: 'peso_estrategico',
    header: 'Peso Estratégico',
  },
];

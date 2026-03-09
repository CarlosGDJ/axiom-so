
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Protocol } from '@/lib/types';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const columns: ColumnDef<Protocol>[] = [
  {
    accessorKey: 'nombre',
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
    accessorKey: 'estado_disparador',
    header: 'Estado Disparador',
  },
  {
    accessorKey: 'duracion_min',
    header: 'Duración (min)',
  },
];

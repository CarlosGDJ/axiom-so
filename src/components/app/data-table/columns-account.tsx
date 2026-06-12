
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Account } from '@/lib/types';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const columns: ColumnDef<Account>[] = [
  {
    accessorKey: 'tipo',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Tipo
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => row.original.nombre ?? row.original.cuenta_id,
  },
  {
    accessorKey: 'saldo',
    header: 'Saldo',
     cell: ({ row }) => {
      const amount = Number(row.getValue('saldo')) || 0;
      const formatted = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
];

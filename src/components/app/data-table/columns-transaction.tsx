
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Transaction, Account, Debt } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const getTransactionColumns = (accounts: Account[], debts: Debt[]): ColumnDef<Transaction>[] => [
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    cell: ({ row }) => {
      const raw = row.getValue('fecha');
      if (!raw) return '—';
      const date = new Date(raw as string);
      if (isNaN(date.getTime())) return '—';
      return format(date, "d MMM, yyyy 'a las' HH:mm", { locale: es });
    },
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
     cell: ({ row }) => {
      const type = row.getValue('tipo') as string;
      return (
        <Badge
          variant="outline"
          className={cn(
            'font-semibold',
            type === 'Gasto'
              ? 'bg-red-500/10 text-red-600 border-red-500/30'
              : 'bg-green-500/10 text-green-600 border-green-500/30'
          )}
        >
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'categoria',
    header: 'Categoría',
  },
  {
    id: 'cuenta_id',
    accessorFn: (row) => {
      const acc = accounts.find(a => a.cuenta_id === row.cuenta_id);
      return acc?.nombre ?? acc?.cuenta_id ?? row.cuenta_id ?? '—';
    },
    header: 'Cuenta',
  },
  {
    accessorKey: 'monto',
    header: 'Monto (€)',
    cell: ({ row }) => {
      const amount = Number(row.getValue('monto')) || 0;
      const formatted = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'notas',
    header: 'Notas',
  },
];

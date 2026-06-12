
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
          variant={type === 'Gasto' ? 'destructive' : 'default'}
          className={cn(type === 'Gasto' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')}
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
    accessorKey: 'cuenta_id',
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

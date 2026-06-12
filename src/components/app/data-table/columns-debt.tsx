
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Debt } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

export const columns: ColumnDef<Debt>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'saldo_pendiente',
    header: 'Saldo Pendiente',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('saldo_pendiente') || '0');
      const formatted = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'porcentaje_pagado',
    header: 'Progreso',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Progress value={row.original.porcentaje_pagado} className="w-[60%]" />
        <span>{row.original.porcentaje_pagado?.toFixed(0)}%</span>
      </div>
    ),
  },
  {
    accessorKey: 'estado_deuda',
    header: 'Estado',
  },
];

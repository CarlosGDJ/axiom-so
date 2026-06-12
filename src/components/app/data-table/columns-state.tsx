
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { State } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATE_LABELS: Record<string, string> = { OK: 'Estable', RIESGO: 'Riesgo', CRITICO: 'Crítico' };
const STATE_CLASSES: Record<string, string> = {
  OK: 'bg-green-500/10 text-green-600 border-green-500/30',
  RIESGO: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  CRITICO: 'bg-red-500/10 text-red-600 border-red-500/30',
};

export const columns: ColumnDef<State>[] = [
  {
    accessorKey: 'estado_id',
    header: 'Estado',
    cell: ({ row }) => {
      const id = String(row.getValue('estado_id'));
      return (
        <Badge variant="outline" className={cn('font-semibold', STATE_CLASSES[id] ?? '')}>
          {STATE_LABELS[id] ?? id}
        </Badge>
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



'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Event, Variable } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const getEventColumns = (variables: Variable[]): ColumnDef<Event>[] => [
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
    id: 'var_id',
    // accessorFn devuelve el nombre resuelto → el buscador y el orden operan
    // sobre el texto visible, no sobre el var_id crudo.
    accessorFn: (row) => {
      const variable = variables.find(v => v.var_id === row.var_id);
      return variable ? variable.var_nombre : row.var_id;
    },
    header: 'Variable',
  },
  {
    accessorKey: 'intensidad',
    header: 'Intensidad',
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => row.getValue('tipo') || 'Variable',
  },
  {
    accessorKey: 'contexto',
    header: 'Contexto',
  },
];

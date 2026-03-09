

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
      const date = new Date(row.getValue('fecha'));
      return format(date, "d MMM, yyyy 'a las' HH:mm", { locale: es });
    },
  },
  {
    accessorKey: 'var_id',
    header: 'Variable',
    cell: ({ row }) => {
        const varId = row.getValue('var_id') as string;
        const variable = variables.find(v => v.var_id === varId);
        return variable ? variable.var_nombre : varId;
    }
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

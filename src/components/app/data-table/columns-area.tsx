
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Area } from '@/lib/types';

export const columns: ColumnDef<Area>[] = [
  {
    accessorKey: 'area_nombre',
    header: 'Nombre',
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

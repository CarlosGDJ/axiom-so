
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Protocol } from '@/lib/types';

export const columns: ColumnDef<Protocol>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
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

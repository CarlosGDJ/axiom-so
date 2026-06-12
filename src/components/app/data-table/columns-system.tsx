
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { System, Skill } from '@/lib/types';

export const getSystemColumns = (skills: Skill[]): ColumnDef<System>[] => [
  {
    accessorKey: 'objetivo',
    header: 'Objetivo',
  },
  {
    id: 'habilidad_id',
    accessorFn: (row) => {
        const skill = skills.find(s => s.habilidad_id === row.habilidad_id);
        return skill ? skill.nombre : row.habilidad_id;
    },
    header: 'Habilidad',
  },
  {
    accessorKey: 'frecuencia',
    header: 'Frecuencia',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
  },
];

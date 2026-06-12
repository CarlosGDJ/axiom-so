
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { System, Skill } from '@/lib/types';

export const getSystemColumns = (skills: Skill[]): ColumnDef<System>[] => [
  {
    accessorKey: 'objetivo',
    header: 'Objetivo',
  },
  {
    accessorKey: 'habilidad_id',
    header: 'Habilidad',
    cell: ({ row }) => {
        const skillId = row.getValue('habilidad_id');
        const skill = skills.find(s => s.habilidad_id === skillId);
        return skill ? skill.nombre : skillId;
    }
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

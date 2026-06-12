
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Area, Skill } from '@/lib/types';

export const getSkillColumns = (areas: Area[]): ColumnDef<Skill>[] => [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    id: 'area_id',
    accessorFn: (row) => {
        const area = areas.find(a => a.area_id === row.area_id);
        return area ? area.area_nombre : row.area_id;
    },
    header: 'Área',
  },
  {
    accessorKey: 'nivel_actual',
    header: 'Nivel Actual',
  },
  {
    accessorKey: 'nivel_objetivo',
    header: 'Nivel Objetivo',
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
  },
];

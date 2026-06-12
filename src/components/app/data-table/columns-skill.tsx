
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Area, Skill } from '@/lib/types';

export const getSkillColumns = (areas: Area[]): ColumnDef<Skill>[] => [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'area_id',
    header: 'Área',
    cell: ({ row }) => {
        const areaId = row.getValue('area_id');
        const area = areas.find(a => a.area_id === areaId);
        return area ? area.area_nombre : areaId;
    }
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


'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Variable, Area } from '@/lib/types';

export const getVariableColumns = (areas: Area[]): ColumnDef<Variable>[] => [
  {
    accessorKey: 'var_nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'area_id',
    header: 'Área',
    cell: ({ row }) => {
      const areaId = row.getValue('area_id');
      const area = areas.find((a) => a.area_id === areaId);
      return area ? area.area_nombre : areaId;
    },
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
  },
  {
    accessorKey: 'polaridad',
    header: 'Polaridad',
    cell: ({ row }) => {
      const p = Number(row.getValue('polaridad'));
      return p > 0 ? 'Positiva' : p < 0 ? 'Negativa' : 'Neutra';
    },
  },
    {
    accessorKey: 'impacto_base',
    header: 'Impacto Base',
  },
  {
    accessorKey: 'controlabilidad',
    header: 'Controlabilidad',
  },
];

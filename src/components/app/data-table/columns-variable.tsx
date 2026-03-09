
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Variable, Area } from '@/lib/types';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const getVariableColumns = (areas: Area[]): ColumnDef<Variable>[] => [
  {
    accessorKey: 'var_nombre',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
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

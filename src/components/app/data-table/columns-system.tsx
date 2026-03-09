
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { System, Skill } from '@/lib/types';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const getSystemColumns = (skills: Skill[]): ColumnDef<System>[] => [
  {
    accessorKey: 'objetivo',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Objetivo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
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

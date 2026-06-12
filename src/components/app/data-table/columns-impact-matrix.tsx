
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ImpactMatrix, Variable, Hormone } from '@/lib/types';

export const getImpactMatrixColumns = (variables: Variable[], hormones: Hormone[]): ColumnDef<ImpactMatrix>[] => [
  {
    accessorKey: 'var_id',
    header: 'Variable (Causa)',
    cell: ({ row }) => {
        const varId = row.getValue('var_id') as string;
        const variable = variables.find(v => v.var_id === varId);
        return variable ? variable.var_nombre : varId;
    }
  },
  {
    accessorKey: 'hormone_id',
    header: 'Hormona (Efecto)',
     cell: ({ row }) => {
        const hormoneId = row.getValue('hormone_id') as string;
        const hormone = hormones.find(a => a.hormone_id === hormoneId);
        return hormone ? hormone.name : hormoneId;
    }
  },
  {
    accessorKey: 'effect_size',
    header: 'Tamaño Efecto',
  },
  {
    accessorKey: 'duration_hours',
    header: 'Duración (h)',
  },
];

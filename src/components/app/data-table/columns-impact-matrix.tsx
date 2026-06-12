
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ImpactMatrix, Variable, Hormone } from '@/lib/types';

export const getImpactMatrixColumns = (variables: Variable[], hormones: Hormone[]): ColumnDef<ImpactMatrix>[] => [
  {
    id: 'var_id',
    accessorFn: (row) => {
        const variable = variables.find(v => v.var_id === row.var_id);
        return variable ? variable.var_nombre : row.var_id;
    },
    header: 'Variable (Causa)',
  },
  {
    id: 'hormone_id',
    accessorFn: (row) => {
        const hormone = hormones.find(a => a.hormone_id === row.hormone_id);
        return hormone ? hormone.name : row.hormone_id;
    },
    header: 'Hormona (Efecto)',
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


'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Habit, System, Variable, Area } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

export const getHabitColumns = (areas: Area[], systems: System[], variables: Variable[]): ColumnDef<Habit>[] => [
  {
    id: 'nombre',
    accessorFn: (row) => {
        const variable = variables.find(v => v.var_id === row.var_id);
        return row.nombre || variable?.var_nombre || row.var_id || '—';
    },
    header: 'Nombre',
  },
  {
    id: 'sistema_id',
    accessorFn: (row) => {
        const system = systems.find(s => s.sistema_id === row.sistema_id);
        return system ? system.objetivo : (row.sistema_id || 'Sin sistema');
    },
    header: 'Sistema',
  },
  {
    id: 'var_id',
    accessorFn: (row) => {
        const variable = variables.find(v => v.var_id === row.var_id);
        return variable ? variable.var_nombre : row.var_id;
    },
    header: 'Variable',
  },
  {
    accessorKey: 'frecuencia',
    header: 'Frecuencia',
  },
  {
    accessorKey: 'duracion_min',
    header: 'Duración (min)',
  },
  {
    accessorKey: 'minimo_viable',
    header: 'Es Mínimo Viable',
    cell: ({ row }) => (
      <Checkbox
        checked={row.getValue('minimo_viable')}
        disabled
        aria-readonly
      />
    ),
  },
];

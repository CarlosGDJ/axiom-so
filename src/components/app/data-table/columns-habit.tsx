
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Habit, System, Variable, Area } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

export const getHabitColumns = (areas: Area[], systems: System[], variables: Variable[]): ColumnDef<Habit>[] => [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => {
        const h = row.original;
        const variable = variables.find(v => v.var_id === h.var_id);
        return h.nombre || variable?.var_nombre || h.var_id || '—';
    }
  },
  {
    accessorKey: 'sistema_id',
    header: 'Sistema',
    cell: ({ row }) => {
        const systemId = row.getValue('sistema_id');
        const system = systems.find(s => s.sistema_id === systemId);
        return system ? system.objetivo : (systemId || 'Sin sistema');
    }
  },
  {
    accessorKey: 'var_id',
    header: 'Variable',
    cell: ({ row }) => {
        const varId = row.getValue('var_id');
        const variable = variables.find(v => v.var_id === varId);
        return variable ? variable.var_nombre : varId;
    }
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

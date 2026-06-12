
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Interaction, Relation } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUp, ArrowRight, ArrowDown, ThumbsUp, Meh, ThumbsDown } from 'lucide-react';

const RenderIcon = ({ value, icons, colors }: { value: number; icons: React.ReactNode[]; colors: string[] }) => {
    const index = value + 1; // map -1, 0, 1 to 0, 1, 2
    return <div className={`flex items-center gap-2 ${colors[index]}`}>{icons[index]}</div>;
};

export const getInteractionColumns = (relations: Relation[]): ColumnDef<Interaction>[] => [
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    cell: ({ row }) => {
      const raw = row.getValue('fecha');
      if (!raw) return '—';
      const date = new Date(raw as string);
      if (isNaN(date.getTime())) return '—';
      return format(date, "d MMM, yyyy 'a las' HH:mm", { locale: es });
    },
  },
  {
    id: 'persona_id',
    accessorFn: (row) => {
        const relation = relations.find(r => r.persona_id === row.persona_id);
        return relation ? relation.nombre : row.persona_id;
    },
    header: 'Persona',
  },
  {
    accessorKey: 'energia_resultante',
    header: 'Energía',
    cell: ({ row }) => {
        const energy = row.getValue('energia_resultante') as number;
        return <RenderIcon value={energy} icons={[<ArrowDown/>, <ArrowRight/>, <ArrowUp/>]} colors={['text-red-500', 'text-yellow-500', 'text-green-500']} />;
    }
  },
   {
    accessorKey: 'respeto_percibido',
    header: 'Respeto',
    cell: ({ row }) => {
        const respect = row.getValue('respeto_percibido') as number;
        return <RenderIcon value={respect} icons={[<ThumbsDown/>, <Meh/>, <ThumbsUp/>]} colors={['text-red-500', 'text-yellow-500', 'text-green-500']} />;
    }
  },
  {
    accessorKey: 'contexto',
    header: 'Contexto',
  },
];

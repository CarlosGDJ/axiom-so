
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Relation } from '@/lib/types';
import { Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export const columns: ColumnDef<Relation>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
  },
  {
    accessorKey: 'rol',
    header: 'Rol',
  },
  {
    accessorKey: 'energia_neta',
    header: 'Energía Neta (Calculada)',
    cell: ({ row }) => {
      const value = row.original.energia_neta ?? 0;
      const Icon = value > 0.1 ? ArrowUp : value < -0.1 ? ArrowDown : Minus;
      const color = value > 0.1 ? 'text-green-500' : value < -0.1 ? 'text-red-500' : 'text-yellow-500';
      return (
        <Popover>
            <PopoverTrigger>
                <div className={cn("flex items-center gap-2 font-medium", color)}>
                    <Icon className="h-4 w-4" />
                    {value.toFixed(2)}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-[240px] p-2.5 text-xs">
                <p>Promedio de energía de las interacciones recientes.</p>
            </PopoverContent>
        </Popover>
      );
    }
  },
  {
    accessorKey: 'respeto',
    header: 'Respeto (Calculado)',
     cell: ({ row }) => {
      const value = row.original.respeto ?? 0;
      const percentage = value * 10; // Convert 0-10 scale to 0-100 for Progress
      return (
         <Popover>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-2">
                    <Progress value={percentage} className="w-[80px]" />
                    <span className="text-sm font-medium">{value.toFixed(1)}/10</span>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-[240px] p-2.5 text-xs">
                <p>Promedio de respeto percibido en interacciones recientes.</p>
            </PopoverContent>
        </Popover>
      );
    }
  },
  {
    accessorKey: 'frecuencia',
    header: 'Frecuencia de Contacto',
  },
];

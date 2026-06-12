
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Relation } from '@/lib/types';
import { ArrowUpDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const columns: ColumnDef<Relation>[] = [
  {
    accessorKey: 'nombre',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Nombre
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
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
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <div className={cn("flex items-center gap-2 font-medium", color)}>
                        <Icon className="h-4 w-4" />
                        {value.toFixed(2)}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Promedio de energía de las interacciones recientes.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
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
         <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                        <Progress value={percentage} className="w-[80px]" />
                        <span className="text-sm font-medium">{value.toFixed(1)}/10</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Promedio de respeto percibido en interacciones recientes.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      );
    }
  },
  {
    accessorKey: 'frecuencia',
    header: 'Frecuencia de Contacto',
  },
];

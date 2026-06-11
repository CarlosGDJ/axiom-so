'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreHorizontal, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import EditAreaForm from './forms/edit-area-form';
import EditHormoneForm from './forms/edit-hormone-form';
import EditVariableForm from './forms/edit-variable-form';
import EditSkillForm from './forms/edit-skill-form';
import EditSystemForm from './forms/edit-system-form';
import EditHabitForm from './forms/edit-habit-form';
import EditProtocolForm from './forms/edit-protocol-form';
import EditStateForm from './forms/edit-state-form';
import EditImpactMatrixForm from './forms/edit-impact-matrix-form';
import EditRelationForm from './forms/edit-relation-form';
import EditAccountForm from './forms/edit-account-form';
import EditDebtForm from './forms/edit-debt-form';
import EditMilestoneForm from './forms/edit-milestone-form';
import EventLogForm from './forms/edit-event-form';
import TransactionLogForm from './forms/edit-transaction-form';
import InteractionLogForm from './forms/edit-interaction-form';
import type { Area, Skill, System, Variable, Account } from '@/lib/types';
import { useUser } from '@/hooks/use-session-user';
import { deleteDocumentNonBlocking } from '@/lib/api-writes';

type EntityWithId = { id: string, [key: string]: any };

const formComponents: { [key: string]: React.ComponentType<any> } = {
    'Área': EditAreaForm,
    'Hormona': EditHormoneForm,
    'Variable': EditVariableForm,
    'Habilidad': EditSkillForm,
    'Sistema': EditSystemForm,
    'Hábito': EditHabitForm,
    'Protocolo': EditProtocolForm,
    'Estado': EditStateForm,
    'Impacto': EditImpactMatrixForm,
    'Relación': EditRelationForm,
    'Cuenta': EditAccountForm,
    'Deuda': EditDebtForm,
    'Hito / Tarea': EditMilestoneForm,
    'Evento': EventLogForm,
    'Transacción': TransactionLogForm,
    'Interacción': InteractionLogForm,
};

const collectionNameMap: { [key: string]: string } = {
    'Área': 'areas',
    'Hormona': 'hormones',
    'Variable': 'variables',
    'Habilidad': 'skills',
    'Sistema': 'systems',
    'Hábito': 'habits',
    'Protocolo': 'protocols',
    'Estado': 'states',
    'Impacto': 'impactMatrix',
    'Relación': 'relations',
    'Cuenta': 'accounts',
    'Deuda': 'debts',
    'Hito / Tarea': 'milestones',
    'Evento': 'events',
    'Transacción': 'transactions',
    'Interacción': 'interactions',
};

interface ActionsProps<T extends EntityWithId> {
  row: T;
  onEdit: (entity: T) => void;
  onDelete: (entity: T) => void;
}

const DataTableActions = <T extends EntityWithId>({ row, onEdit, onDelete }: ActionsProps<T>) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-8 w-8 p-0">
        <span className="sr-only">Abrir menú</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onEdit(row)}>Editar</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onDelete(row)} className="text-red-600">Eliminar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumnId?: string; // kept for backwards compat, not used (global filter replaces it)
  entityName?: string;
  hideCreateButton?: boolean;
  [key: string]: any;
}

export function DataTable<TData extends EntityWithId, TValue>({
  columns: originalColumns,
  data,
  entityName,
  hideCreateButton = false,
  ...rest
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [currentEntity, setCurrentEntity] = React.useState<TData | undefined>(undefined);

  const { uid } = useUser();
  const { toast } = useToast();

  const handleEdit = (entity: TData) => {
    setCurrentEntity(entity);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (entity: TData) => {
    if (!uid || !entityName) return;
    const collectionName = collectionNameMap[entityName];
    if (!collectionName) {
      toast({ variant: 'destructive', title: 'Error', description: `No se encontró la colección: ${entityName}` });
      return;
    }
    deleteDocumentNonBlocking(collectionName, entity.id);
    toast({ title: `${entityName} Eliminado`, description: `El ${entityName.toLowerCase()} ha sido eliminado.` });
  };

  const columns = React.useMemo<ColumnDef<TData, TValue>[]>(() => [
    ...originalColumns,
    ...(entityName ? [{
      id: 'actions',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }: { row: { original: TData } }) => (
        <DataTableActions row={row.original} onEdit={handleEdit} onDelete={handleDelete} />
      ),
    } as ColumnDef<TData, TValue>] : [])
  ], [originalColumns, entityName]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      globalFilter,
    },
  });

  const AddNewForm = entityName ? formComponents[entityName] : null;
  const EditForm = entityName ? formComponents[entityName] : null;
  const singularEntityName = entityName?.split(' / ')[0] || entityName;

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 py-4">
        <Input
          placeholder="Buscar en todas las columnas..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-xs h-9"
        />
        {!hideCreateButton && entityName && AddNewForm && (
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="shrink-0">
            Añadir {singularEntityName}
          </Button>
        )}
      </div>

      {/* ── Table with horizontal scroll on mobile ────────────── */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort();
                  // Only auto-wrap string headers; function headers already handle their own sort UI
                  const hasCustomHeader = typeof header.column.columnDef.header === 'function';
                  const sorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        canSort && !hasCustomHeader && 'cursor-pointer select-none hover:bg-muted/50 transition-colors'
                      )}
                      onClick={canSort && !hasCustomHeader ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {hasCustomHeader ? (
                        header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())
                      ) : (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="text-muted-foreground/50 shrink-0">
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Sin resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-4 pb-24 sm:pb-4">
        <span className="text-xs text-muted-foreground tabular-nums">
          {table.getFilteredRowModel().rows.length} fila{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
          {' · '}pág. {table.getState().pagination.pageIndex + 1}/{Math.max(1, table.getPageCount())}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Página anterior</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Página siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {AddNewForm && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className={entityName === 'Sistema' ? 'sm:max-w-[800px]' : ''}>
            <DialogHeader>
              <DialogTitle>Añadir Nuevo {entityName}</DialogTitle>
              <DialogDescription>
                Completa los detalles para crear un nuevo {entityName?.toLowerCase()}.
              </DialogDescription>
            </DialogHeader>
            <div className="p-1">
              <AddNewForm closeDialog={() => setIsAddDialogOpen(false)} {...rest} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {EditForm && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className={entityName === 'Sistema' ? 'sm:max-w-[800px]' : ''}>
            <DialogHeader>
              <DialogTitle>Editar {entityName}</DialogTitle>
              <DialogDescription>
                Realiza cambios en tu {entityName?.toLowerCase()} aquí.
              </DialogDescription>
            </DialogHeader>
            <div className="p-1">
              <EditForm entity={currentEntity} closeDialog={() => setIsEditDialogOpen(false)} {...rest} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

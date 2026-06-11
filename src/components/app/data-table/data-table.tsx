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
  ColumnFiltersState,
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
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

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
// Define a generic type for our entities that includes an 'id'
type EntityWithId = { id: string, [key: string]: any };

// A map of entity names to their corresponding form components
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

// A map to get the correct plural collection name from the singular entity name
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

const DataTableActions = <T extends EntityWithId>({ row, onEdit, onDelete }: ActionsProps<T>) => {
    return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onEdit(row)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(row)} className="text-red-600">
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    );
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumnId?: string;
  entityName?: string;
  hideCreateButton?: boolean;
  [key: string]: any;
}

export function DataTable<TData extends EntityWithId, TValue>({
  columns: originalColumns,
  data,
  filterColumnId,
  entityName,
  hideCreateButton = false,
  ...rest
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [currentEntity, setCurrentEntity] = React.useState<TData | undefined>(undefined);

  const { user, uid } = useUser();  const { toast } = useToast();

  const handleEdit = (entity: TData) => {
    setCurrentEntity(entity);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (entity: TData) => {
    if (!uid || !entityName) return;
    const collectionName = collectionNameMap[entityName];
    if (!collectionName) {
      toast({ variant: "destructive", title: "Error", description: `No se encontró el nombre de la colección para: ${entityName}` });
      return;
    }
    deleteDocumentNonBlocking(collectionName, entity.id);
    toast({ title: `${entityName} Eliminado`, description: `El ${entityName.toLowerCase()} ha sido eliminado correctamente.` });
  };
  
  const columns = React.useMemo<ColumnDef<TData, TValue>[]>(() => [
    ...originalColumns,
    ...(entityName ? [{
      id: 'actions',
      cell: ({ row }: { row: { original: TData } }) => (
        <DataTableActions
          row={row.original}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ),
    } as ColumnDef<TData, TValue>] : [])
  ], [originalColumns, entityName]); // Dependencies are correct now
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const AddNewForm = entityName ? formComponents[entityName] : null;
  const EditForm = entityName ? formComponents[entityName] : null;
  
  const singularEntityName = entityName?.split(' / ')[0] || entityName;


  return (
    <div>
       <div className="flex items-center justify-between py-4">
            {filterColumnId && (
                <Input
                placeholder="Filtrar..."
                value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                    table.getColumn(filterColumnId)?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
                />
            )}
            {!hideCreateButton && entityName && AddNewForm && (
                <Button onClick={() => setIsAddDialogOpen(true)}>Añadir Nuevo {singularEntityName}</Button>
            )}
        </div>
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
            <Table>
            <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                    return (
                        <TableHead key={header.id}>
                        {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                            )}
                        </TableHead>
                    );
                    })}
                </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                    <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                        {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                        )}
                        </TableCell>
                    ))}
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                    >
                    Sin resultados.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
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
                Realiza cambios en tu {entityName?.toLowerCase()} aquí. Haz clic en guardar cuando hayas terminado.
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

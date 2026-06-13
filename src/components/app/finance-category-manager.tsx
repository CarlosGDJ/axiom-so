'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Settings2, Check } from 'lucide-react';
import { useFinanceCategories } from '@/hooks/use-finance-categories';
import {
  type FinanceCategory, type CategoryType,
  ICON_OPTIONS, COLOR_PALETTE, getIcon,
} from '@/lib/finance-categories';

// Gestión del catálogo de categorías: añadir, renombrar, color, icono, borrar.
// Edita sobre un borrador local y solo persiste al pulsar "Guardar".

function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (icon: string) => void }) {
  const Current = getIcon(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center hover:bg-muted/50"
          style={{ backgroundColor: `${color}15`, color }}
          aria-label="Elegir icono"
        >
          <Current size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="grid grid-cols-6 gap-1">
          {ICON_OPTIONS.map((key) => {
            const Ico = getIcon(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={cn(
                  'h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted',
                  value === key && 'bg-primary/15 text-primary ring-1 ring-primary/40',
                )}
                aria-label={key}
              >
                <Ico size={16} />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-10 w-8 shrink-0 rounded-lg border"
          style={{ backgroundColor: value }}
          aria-label="Elegir color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-6 gap-1.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="h-7 w-7 rounded-md flex items-center justify-center"
              style={{ backgroundColor: c }}
              aria-label={c}
            >
              {value === c && <Check size={14} className="text-white drop-shadow" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function FinanceCategoryManager() {
  const { categories, saveCategories } = useFinanceCategories();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FinanceCategory[]>(categories);

  // Al abrir, sincroniza el borrador con el catálogo actual.
  useEffect(() => {
    if (open) setDraft(categories);
  }, [open, categories]);

  const update = (index: number, patch: Partial<FinanceCategory>) =>
    setDraft(d => d.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const remove = (index: number) => setDraft(d => d.filter((_, i) => i !== index));

  const add = (type: CategoryType) =>
    setDraft(d => [...d, { name: '', type, color: COLOR_PALETTE[d.length % COLOR_PALETTE.length], icon: 'Info' }]);

  const { valid, error } = useMemo(() => {
    const names = draft.map(c => c.name.trim().toLowerCase());
    if (draft.some(c => !c.name.trim())) return { valid: false, error: 'Hay categorías sin nombre.' };
    if (new Set(names).size !== names.length) return { valid: false, error: 'Hay nombres duplicados.' };
    if (!draft.some(c => c.type === 'expense')) return { valid: false, error: 'Necesitas al menos una categoría de gasto.' };
    return { valid: true, error: null };
  }, [draft]);

  const handleSave = () => {
    if (!valid) return;
    saveCategories(draft.map(c => ({ ...c, name: c.name.trim() })));
    toast({ title: 'Categorías guardadas', description: 'Tu catálogo se ha actualizado.' });
    setOpen(false);
  };

  const renderRow = (cat: FinanceCategory, index: number) => (
    <div key={index} className="flex items-center gap-2">
      <IconPicker value={cat.icon} color={cat.color} onChange={(icon) => update(index, { icon })} />
      <ColorPicker value={cat.color} onChange={(color) => update(index, { color })} />
      <Input
        value={cat.name}
        onChange={(e) => update(index, { name: e.target.value })}
        placeholder="Nombre de la categoría"
        className="h-10 flex-1 min-w-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => remove(index)}
        aria-label={`Borrar ${cat.name || 'categoría'}`}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  const expense = draft.map((c, i) => ({ c, i })).filter(x => x.c.type === 'expense');
  const income = draft.map((c, i) => ({ c, i })).filter(x => x.c.type === 'income');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 size={14} />
          Gestionar categorías
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorías</DialogTitle>
          <DialogDescription>
            Organiza tus finanzas a tu manera. Estas categorías se usan en los movimientos y en los pockets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gastos</p>
            {expense.map(({ c, i }) => renderRow(c, i))}
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => add('expense')}>
              <Plus size={14} /> Añadir categoría de gasto
            </Button>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingresos</p>
            {income.map(({ c, i }) => renderRow(c, i))}
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => add('income')}>
              <Plus size={14} /> Añadir categoría de ingreso
            </Button>
          </section>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {error && <p className="text-xs text-destructive sm:mr-auto self-center">{error}</p>}
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!valid}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

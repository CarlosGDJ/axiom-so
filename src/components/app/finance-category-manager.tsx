'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Settings2, Check, Lock, ChevronDown } from 'lucide-react';
import { useFinanceCategories } from '@/hooks/use-finance-categories';
import {
  type FinanceCategory, type CategoryType,
  ICON_OPTIONS, COLOR_PALETTE, getIcon, isProtectedCategory, PROTECTED_CATEGORIES,
} from '@/lib/finance-categories';

// Gestión del catálogo de categorías: añadir, renombrar, color, icono, borrar.
// Edita sobre un borrador local y solo persiste al pulsar "Guardar".
//
// Los selectores de icono/color son INLINE (no Popover): un Popover se portala
// fuera del Dialog y Radix le aplica pointer-events:none, así que los clics no
// llegaban. Inline = dentro del diálogo = funciona también en móvil.

export default function FinanceCategoryManager() {
  const { categories, saveCategories } = useFinanceCategories();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FinanceCategory[]>(categories);
  // Picker inline abierto: índice de fila + tipo (icono/color).
  const [picker, setPicker] = useState<{ index: number; kind: 'icon' | 'color' } | null>(null);

  // Al abrir, sincroniza el borrador con el catálogo actual y garantiza que las
  // categorías protegidas existan (por si vienen datos antiguos sin ellas).
  useEffect(() => {
    if (!open) return;
    const missing = PROTECTED_CATEGORIES
      .filter(name => !categories.some(c => c.name === name))
      .map((name): FinanceCategory => ({ name, type: 'expense', color: COLOR_PALETTE[3], icon: 'CreditCard' }));
    setDraft([...categories, ...missing]);
  }, [open, categories]);

  const update = (index: number, patch: Partial<FinanceCategory>) =>
    setDraft(d => d.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const remove = (index: number) => { setPicker(null); setDraft(d => d.filter((_, i) => i !== index)); };
  const togglePicker = (index: number, kind: 'icon' | 'color') =>
    setPicker(p => (p && p.index === index && p.kind === kind ? null : { index, kind }));

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

  const renderRow = (cat: FinanceCategory, index: number) => {
    const protectedCat = isProtectedCategory(cat.name);
    const Icon = getIcon(cat.icon);
    const iconOpen = picker?.index === index && picker.kind === 'icon';
    const colorOpen = picker?.index === index && picker.kind === 'color';
    return (
      <div key={index} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => togglePicker(index, 'icon')}
            className={cn('h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center hover:bg-muted/50', iconOpen && 'ring-2 ring-primary')}
            style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
            aria-label="Elegir icono"
          >
            <Icon size={18} />
          </button>
          <button
            type="button"
            onClick={() => togglePicker(index, 'color')}
            className={cn('h-10 w-8 shrink-0 rounded-lg border', colorOpen && 'ring-2 ring-primary')}
            style={{ backgroundColor: cat.color }}
            aria-label="Elegir color"
          />
          <Input
            value={cat.name}
            onChange={(e) => update(index, { name: e.target.value })}
            placeholder="Nombre de la categoría"
            className="h-10 flex-1 min-w-0"
            disabled={protectedCat}
            title={protectedCat ? 'Categoría estructural: el motor la usa para el seguimiento de deuda y no puede renombrarse.' : undefined}
          />
          {protectedCat ? (
            <div className="h-10 w-10 shrink-0 flex items-center justify-center text-muted-foreground/60" title="Categoría protegida: no se puede borrar." aria-label="Categoría protegida">
              <Lock size={15} />
            </div>
          ) : (
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(index)} aria-label={`Borrar ${cat.name || 'categoría'}`}>
              <Trash2 size={16} />
            </Button>
          )}
        </div>

        {iconOpen && (
          <div className="rounded-lg border bg-muted/30 p-2 grid grid-cols-7 sm:grid-cols-8 gap-1">
            {ICON_OPTIONS.map((key) => {
              const Ico = getIcon(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { update(index, { icon: key }); setPicker(null); }}
                  className={cn('h-9 w-full rounded-md flex items-center justify-center hover:bg-background', cat.icon === key && 'bg-primary/15 text-primary ring-1 ring-primary/40')}
                  aria-label={key}
                >
                  <Ico size={17} />
                </button>
              );
            })}
          </div>
        )}

        {colorOpen && (
          <div className="rounded-lg border bg-muted/30 p-2 grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { update(index, { color: c }); setPicker(null); }}
                className="h-8 w-full rounded-md flex items-center justify-center"
                style={{ backgroundColor: c }}
                aria-label={c}
              >
                {cat.color === c && <Check size={15} className="text-white drop-shadow" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const expense = draft.map((c, i) => ({ c, i })).filter(x => x.c.type === 'expense');
  const income = draft.map((c, i) => ({ c, i })).filter(x => x.c.type === 'income');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPicker(null); }}>
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

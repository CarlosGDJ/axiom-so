// Catálogo de categorías financieras — ÚNICA fuente de verdad.
//
// Antes las categorías estaban hardcodeadas y duplicadas en 3 sitios (formulario
// de movimientos, colores/iconos de finanzas, pockets) y desincronizadas. Ahora
// viven en un catálogo editable por el usuario, guardado en `dashboardConfig`
// (clave `finance_categories`), y se consumen vía useFinanceCategories().
//
// El `name` ES el identificador: es lo que se guarda en `transaction.categoria`
// y la clave del importe en los pockets. Renombrar una categoría no reescribe
// los movimientos antiguos (mantienen el nombre previo y caen al fallback).

import {
  Home, Utensils, Car, HeartPulse, Gamepad2, GraduationCap, ShoppingBag,
  CreditCard, Gift, Info, Briefcase, Landmark, PiggyBank, DollarSign,
  Activity, Zap, Plane, Dumbbell, Coffee, Smartphone, Wifi, Shirt,
  PawPrint, Baby, Music, BookOpen, Receipt, Wallet, Fuel, Wrench,
  type LucideIcon,
} from 'lucide-react';

export type CategoryType = 'expense' | 'income';

export interface FinanceCategory {
  name: string;
  type: CategoryType;
  color: string; // valor CSS (hsl literal) — listo para style/recharts
  icon: string;  // clave de ICON_MAP
}

export const DASHBOARD_CONFIG_KEY = 'finance_categories';

// Iconos disponibles para elegir. La clave se guarda en BD; el componente se
// resuelve en cliente. Si una clave no existe (icono retirado), cae a Info.
export const ICON_MAP: Record<string, LucideIcon> = {
  Home, Utensils, Car, HeartPulse, Gamepad2, GraduationCap, ShoppingBag,
  CreditCard, Gift, Info, Briefcase, Landmark, PiggyBank, DollarSign,
  Activity, Zap, Plane, Dumbbell, Coffee, Smartphone, Wifi, Shirt,
  PawPrint, Baby, Music, BookOpen, Receipt, Wallet, Fuel, Wrench,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

// Paleta de colores (hsl literal → se ven bien en claro y oscuro).
export const COLOR_PALETTE = [
  'hsl(217 91% 60%)', // azul
  'hsl(142 71% 45%)', // verde
  'hsl(25 95% 53%)',  // naranja
  'hsl(0 84% 60%)',   // rojo
  'hsl(48 96% 53%)',  // amarillo
  'hsl(280 65% 60%)', // morado
  'hsl(330 81% 60%)', // rosa
  'hsl(189 94% 43%)', // cian
  'hsl(160 84% 39%)', // verde azulado
  'hsl(43 74% 49%)',  // oro
  'hsl(15 79% 54%)',  // teja
  'hsl(240 5% 50%)',  // gris
];

export function getIcon(iconKey: string | undefined): LucideIcon {
  return (iconKey && ICON_MAP[iconKey]) || Info;
}

// Catálogo por defecto — semilla la primera vez (incluye las antiguas categorías
// del formulario y de los pockets, ya unificadas y sin huecos).
export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
  // Gastos
  { name: 'Vivienda',              type: 'expense', color: COLOR_PALETTE[0],  icon: 'Home' },
  { name: 'Alimentación',          type: 'expense', color: COLOR_PALETTE[1],  icon: 'Utensils' },
  { name: 'Transporte',            type: 'expense', color: COLOR_PALETTE[2],  icon: 'Car' },
  { name: 'Salud y Bienestar',     type: 'expense', color: COLOR_PALETTE[3],  icon: 'HeartPulse' },
  { name: 'Ocio y Suscripciones',  type: 'expense', color: COLOR_PALETTE[5],  icon: 'Gamepad2' },
  { name: 'Desarrollo Personal',   type: 'expense', color: COLOR_PALETTE[7],  icon: 'GraduationCap' },
  { name: 'Compras',               type: 'expense', color: COLOR_PALETTE[6],  icon: 'ShoppingBag' },
  { name: 'Deudas',                type: 'expense', color: COLOR_PALETTE[10], icon: 'CreditCard' },
  { name: 'Regalos y Donaciones',  type: 'expense', color: COLOR_PALETTE[9],  icon: 'Gift' },
  { name: 'Otros Gastos',          type: 'expense', color: COLOR_PALETTE[11], icon: 'Info' },
  // Ingresos
  { name: 'Nómina',                type: 'income',  color: COLOR_PALETTE[1],  icon: 'Briefcase' },
  { name: 'Freelance/Negocio',     type: 'income',  color: COLOR_PALETTE[8],  icon: 'Landmark' },
  { name: 'Ingresos Pasivos',      type: 'income',  color: COLOR_PALETTE[0],  icon: 'PiggyBank' },
  { name: 'Regalos',               type: 'income',  color: COLOR_PALETTE[9],  icon: 'Gift' },
  { name: 'Otros Ingresos',        type: 'income',  color: COLOR_PALETTE[11], icon: 'DollarSign' },
];

const FALLBACK_COLOR = 'hsl(var(--muted-foreground))';

/** Parsea el valor guardado en dashboardConfig; cae a los defaults si falta/corrupto. */
export function parseCategories(value: string | undefined | null): FinanceCategory[] {
  if (!value) return DEFAULT_FINANCE_CATEGORIES;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(c => c && typeof c.name === 'string')) {
      return parsed.map((c): FinanceCategory => ({
        name: c.name,
        type: c.type === 'income' ? 'income' : 'expense',
        color: typeof c.color === 'string' ? c.color : FALLBACK_COLOR,
        icon: typeof c.icon === 'string' ? c.icon : 'Info',
      }));
    }
  } catch { /* corrupto → defaults */ }
  return DEFAULT_FINANCE_CATEGORIES;
}

/** Color de una categoría por nombre, con fallback para nombres desconocidos. */
export function categoryColor(categories: FinanceCategory[], name: string): string {
  return categories.find(c => c.name === name)?.color ?? FALLBACK_COLOR;
}

/** Icono de una categoría por nombre, con fallback. */
export function categoryIcon(categories: FinanceCategory[], name: string): LucideIcon {
  return getIcon(categories.find(c => c.name === name)?.icon);
}

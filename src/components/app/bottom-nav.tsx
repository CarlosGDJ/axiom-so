'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Repeat, Wallet, BarChart2, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

// Navegación inferior para móvil/tablet — patrón de apps de finanzas/salud/hábitos:
// las secciones clave al alcance del pulgar, y "Más" abre el menú completo (sheet).
const ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: Home, exact: true },
  { href: '/dashboard/milestones', label: 'Hábitos', icon: Repeat },
  { href: '/dashboard/finances', label: 'Finanzas', icon: Wallet },
  { href: '/dashboard/analytics', label: 'Analíticas', icon: BarChart2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-5 h-16 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors active:bg-muted/50',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'scale-110 transition-transform')} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Más secciones"
          className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground active:bg-muted/50"
        >
          <Menu className="h-5 w-5" />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}

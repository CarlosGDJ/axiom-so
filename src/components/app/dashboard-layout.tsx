import type { FC, ReactNode } from 'react';

import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

import { AppHeader } from './header';
import { AppSidebarNav } from './sidebar-nav';
import { PwaInit } from './pwa-init';
import { BottomNav } from './bottom-nav';

export const DashboardLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebarNav />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        {/* pb-24 en móvil deja sitio a la barra de navegación inferior */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 w-full min-w-0">{children}</main>
        <PwaInit />
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
};

import type { FC, ReactNode } from 'react';

import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

import { AppHeader } from './header';
import { AppSidebarNav } from './sidebar-nav';
import { PwaInit } from './pwa-init';

export const DashboardLayout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebarNav />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 w-full min-w-0">{children}</main>
        <PwaInit />
      </SidebarInset>
    </SidebarProvider>
  );
};

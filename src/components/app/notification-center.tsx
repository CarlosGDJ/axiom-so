
'use client';

import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellRing, Check, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Trash2, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useUser } from '@/hooks/use-session-user';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/lib/api-writes';
import { useCollection } from '@/hooks/use-mongo-collection';
import { useUserData } from '@/hooks/use-user-data';
import DiagnosticDialog from '@/components/app/diagnostic-dialog';
const typeIcons = {
    info: <Info className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
};

const typeColors = {
    info: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
    warning: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
    success: 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800',
    error: 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800',
};

function isSystemStateNotif(notif: Notification) {
  const t = notif.title.toLowerCase();
  return notif.type === 'warning' && (t.includes('riesgo') || t.includes('crítico') || t.includes('critico'));
}

export default function NotificationCenter() {
  const { user, uid } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isDiagOpen, setIsDiagOpen] = useState(false);
  const { data: userData } = useUserData();

  const { data: notifications, isLoading } = useCollection<Notification>(uid ? 'notifications' : null, { orderBy: 'createdAt', direction: 'desc', limit: 50 });

  const unreadNotifications = useMemo(() => {
    if (!notifications) return null;
    return notifications.filter(n => !n.read);
  }, [notifications]);

  const unreadCount = useMemo(() => {
    if (!unreadNotifications || unreadNotifications.length === 0) return 0;
    const unique = new Set<string>();
    unreadNotifications.forEach((n) => {
      unique.add(n.dedupe_key || `id:${n.id}`);
    });
    return unique.size;
  }, [unreadNotifications]);

  const dedupedNotifications = useMemo(() => {
    if (!notifications || notifications.length === 0) return [];
    const groups = new Map<string, Notification[]>();
    notifications.forEach((n) => {
      const key = n.dedupe_key || `id:${n.id}`;
      const arr = groups.get(key) || [];
      arr.push(n);
      groups.set(key, arr);
    });

    const merged: Notification[] = [];
    groups.forEach((group) => {
      const sorted = [...group].sort((a, b) => {
        const da = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt?.toDate?.()?.getTime?.() || 0;
        const db = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt?.toDate?.()?.getTime?.() || 0;
        return db - da;
      });
      const latest = sorted[0];
      const anyRead = sorted.some((n) => Boolean(n.read));
      merged.push({ ...latest, read: anyRead ? true : latest.read });
    });

    return merged.sort((a, b) => {
      const da = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt?.toDate?.()?.getTime?.() || 0;
      const db = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt?.toDate?.()?.getTime?.() || 0;
      return db - da;
    });
  }, [notifications]);

  const handleMarkAsRead = (notif: Notification) => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    if (notif.dedupe_key) {
      (notifications || [])
        .filter(n => n.dedupe_key === notif.dedupe_key && !n.read)
        .forEach(n => updateDocumentNonBlocking('notifications', n.id, { read: true, readAt: nowIso, updatedAt: nowIso }));
      updateDocumentNonBlocking('notifications', `smart__${notif.dedupe_key}`, { read: true, readAt: nowIso, updatedAt: nowIso });
      return;
    }
    updateDocumentNonBlocking('notifications', notif.id, { read: true, readAt: nowIso, updatedAt: nowIso });
  };

  const handleMarkAllAsRead = () => {
    if (!user || !unreadNotifications || unreadNotifications.length === 0) return;
    const nowIso = new Date().toISOString();
    unreadNotifications.forEach(n => {
      updateDocumentNonBlocking('notifications', n.id, { read: true, readAt: nowIso, updatedAt: nowIso });
    });
  };

  const handleDelete = (id: string) => {
    if (!user) return;
        deleteDocumentNonBlocking('notifications', id);
  };

  const handleClearAll = () => {
    if (!user || !notifications || notifications.length === 0) return;
    notifications.forEach(n => deleteDocumentNonBlocking('notifications', n.id));
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return '';
    const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt.toDate();
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          {unreadCount > 0 ? (
            <>
                <BellRing className="h-5 w-5 text-primary animate-pulse" />
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
          <span className="sr-only">Ver notificaciones</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                    <Bell className="h-5 w-5" /> Centro de Axiom
                </SheetTitle>
                <SheetDescription>
                    Información algorítmica sobre tu sistema.
                </SheetDescription>
            </div>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleMarkAllAsRead}>
                    <CheckCheck className="mr-2 h-3 w-3" /> Todo leído
                </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-grow">
            <div className="p-4 space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-sm mt-2 font-medium">Analizando avisos...</p>
                    </div>
                ) : !dedupedNotifications || dedupedNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 text-center space-y-3 opacity-40">
                        <div className="bg-muted p-4 rounded-full">
                            <Bell className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="font-bold">Sin avisos</p>
                            <p className="text-xs">Tu sistema Axiom está en calma absoluta.</p>
                        </div>
                    </div>
                ) : (
                    dedupedNotifications.map((notif) => (
                        <div 
                            key={notif.id} 
                            className={cn(
                                "group relative flex flex-col gap-2 p-4 rounded-xl border-2 transition-all duration-300",
                                typeColors[notif.type],
                                !notif.read ? "opacity-100 shadow-sm" : "opacity-60 grayscale-[0.5] border-transparent"
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {typeIcons[notif.type]}
                                    <h4 className={cn(
                                        "text-sm font-bold leading-tight",
                                        !notif.read ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                        {notif.title}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-1">
                                    {!notif.read && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 rounded-full hover:bg-white/50 dark:hover:bg-black/20"
                                            onClick={() => handleMarkAsRead(notif)}
                                        >
                                            <Check className="h-3 w-3" />
                                        </Button>
                                    )}
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(notif.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            
                            <p className="text-xs leading-relaxed">
                                {notif.message}
                            </p>

                            <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(notif.createdAt)}
                                </div>
                                <div className="flex items-center gap-2">
                                    {userData && isSystemStateNotif(notif) && (
                                        <button
                                            onClick={() => setIsDiagOpen(true)}
                                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:underline"
                                        >
                                            ¿Por qué?
                                        </button>
                                    )}
                                    {notif.link && (
                                        <Link
                                            href={notif.link}
                                            onClick={() => {
                                                handleMarkAsRead(notif);
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                                        >
                                            Ver <ExternalLink className="h-2.5 w-2.5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>

        {dedupedNotifications && dedupedNotifications.length > 0 && (
            <div className="p-4 border-t bg-muted/20">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={handleClearAll}
                >
                    Limpiar historial
                </Button>
            </div>
        )}
      </SheetContent>
    </Sheet>

    {userData && isDiagOpen && (
      <DiagnosticDialog
        open={isDiagOpen}
        onClose={() => setIsDiagOpen(false)}
        userData={userData}
        overallState={userData.overallState ?? 'RIESGO'}
        dominantVariables={userData.dominantVariables ?? []}
      />
    )}
  </>
  );
}

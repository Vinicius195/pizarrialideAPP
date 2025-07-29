'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/user-context';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/types';

export function NotificationBell() {
  const { notifications, isLoading, markNotificationsAsRead } = useUser();
  const router = useRouter();

  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadCount = unreadNotifications.length;

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount > 0) {
      const idsToMarkAsRead = unreadNotifications.map(n => n.id);
      markNotificationsAsRead(idsToMarkAsRead);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationsAsRead([notification.id]);
    if (notification.relatedUrl) {
      router.push(notification.relatedUrl);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 flex justify-between items-center">
          <p className="font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-auto p-1">
              <CheckCheck className="mr-1 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          {isLoading ? (
            <div className="p-2 text-center text-muted-foreground">Carregando...</div>
          ) : unreadCount === 0 ? (
            <div className="p-2 text-center text-muted-foreground">Nenhuma notificação nova.</div>
          ) : (
            // **CORREÇÃO**: Mapeando apenas as notificações não lidas.
            unreadNotifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="whitespace-normal cursor-pointer font-bold"
              >
                <div>
                  <p>{notif.title}</p>
                  <p className="text-sm font-normal">{notif.message}</p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

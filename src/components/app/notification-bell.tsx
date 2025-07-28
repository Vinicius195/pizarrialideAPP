'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon, CheckIcon, CheckCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';
import { useUser } from '@/contexts/user-context';
import { useToast } from '@/hooks/use-toast';

// Most robust solution: Generate sound with Web Audio API.
// This has no external dependencies and works in all modern browsers.
const playNotificationAlert = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.error("Failed to play notification sound.", e);
    }
}

export function NotificationBell() {
  const { getAuthToken } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toastedIds = useRef(new Set<string>());

  const fetchNotifications = useCallback(async (isInitialFetch = false) => {
    if (isInitialFetch) setIsLoading(true);
    const token = await getAuthToken();
    if (!token) {
        if (isInitialFetch) setError("Autenticação necessária.");
        setIsLoading(false);
        return;
    }
    try {
      const response = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Falha ao buscar notificações.');
      const data: Notification[] = await response.json();
      
      const newHighPriority = data.filter(n => n.priority === 'high' && !toastedIds.current.has(n.id));
      if (newHighPriority.length > 0) {
          playNotificationAlert();
          newHighPriority.forEach(n => {
              toast({ title: 'Notificação Importante', description: n.message });
              toastedIds.current.add(n.id);
          });
      }
      
      setNotifications(data);
      data.forEach(n => toastedIds.current.add(n.id));
    } catch (err) {
      if (isInitialFetch) setError(err instanceof Error ? err.message : 'Ocorreu um erro.');
    } finally {
      if (isInitialFetch) setIsLoading(false);
    }
  }, [getAuthToken, toast]);

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    setNotifications(current => current.filter(n => n.id !== notificationId));
    const token = await getAuthToken();
    if (!token) return;
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.error('Failed to mark as read:', error);
      fetchNotifications(true);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications([]);
    const token = await getAuthToken();
    if (!token) return;
    try {
        await fetch('/api/notifications', { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
        console.error('Failed to mark all as read:', error);
        fetchNotifications(true);
    }
  }
  
  const handleNotificationClick = (notification: Notification) => {
    if (notification.relatedUrl) router.push(notification.relatedUrl);
    handleMarkAsRead(notification.id);
  }

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) fetchNotifications(true); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <BellIcon className="h-[1.2rem] w-[1.2rem]" />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {notifications.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between pr-2">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            {notifications.length > 0 && (
                <button onClick={handleMarkAllAsRead} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <CheckCheckIcon className="h-4 w-4" /> Marcar todas como lidas
                </button>
            )}
        </div>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="p-2 space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : error ? (
          <p className="p-2 text-sm text-center text-red-500">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="p-4 text-sm text-center text-muted-foreground">Nenhuma notificação nova.</p>
        ) : (
          notifications.map(notification => (
            <DropdownMenuItem key={notification.id} onSelect={() => handleNotificationClick(notification)} className="flex items-center gap-2 cursor-pointer">
              {notification.priority === 'high' && (<div className="h-2 w-2 rounded-full bg-sky-500 shrink-0" title="Prioridade alta"></div>)}
              <div className={cn("flex-grow", notification.priority !== 'high' && "ml-4")}>
                <p className="text-sm font-semibold whitespace-pre-wrap">{notification.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(notification.timestamp).toLocaleString('pt-BR')}</p>
              </div>
              <Button variant="ghost" size="sm" className="p-1 h-auto shrink-0" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }} title="Marcar como lida">
                <CheckIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

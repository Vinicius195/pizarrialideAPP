'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
<<<<<<< HEAD
import { useUser, resumeAudioContext } from '@/contexts/user-context';
=======
import { useUser } from '@/contexts/user-context';
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/');
    }
  }, [currentUser, isLoading, router]);
  
<<<<<<< HEAD
  useEffect(() => {
    const unlockFeatures = () => {
      // Resume o AudioContext para permitir a reprodução de som
      resumeAudioContext();

      // Desbloqueia a API de vibração
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };

    window.addEventListener('click', unlockFeatures, { once: true });
    window.addEventListener('touchstart', unlockFeatures, { once: true });

    return () => {
      window.removeEventListener('click', unlockFeatures);
      window.removeEventListener('touchstart', unlockFeatures);
=======
  // Unlock vibration API on first user interaction
  useEffect(() => {
    const unlockVibration = () => {
      if ('vibrate' in navigator) {
        // A 0ms vibration is not felt but satisfies the browser's requirement
        // for a user-initiated vibration.
        navigator.vibrate(0);
      }
      // Remove the event listener after it has run once.
      window.removeEventListener('click', unlockVibration);
      window.removeEventListener('touchstart', unlockVibration);
    };

    window.addEventListener('click', unlockVibration, { once: true });
    window.addEventListener('touchstart', unlockVibration, { once: true });

    return () => {
      window.removeEventListener('click', unlockVibration);
      window.removeEventListener('touchstart', unlockVibration);
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
    };
  }, []);

  if (isLoading || !currentUser) {
    return (
<<<<<<< HEAD
      <div 
        className="flex min-h-screen w-full bg-background" 
        suppressHydrationWarning={true}
      >
=======
      <div className="flex min-h-screen w-full bg-background">
>>>>>>> 89c89cc970e33ce077055fc0972bcfd494b9f177
        <div className="hidden md:flex flex-col items-center gap-4 border-r bg-sidebar p-2">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="flex flex-1 flex-col">
            <Skeleton className="h-16 w-full border-b" />
            <div className="flex-1 p-6">
                <Skeleton className="h-full w-full" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-full flex-col">
            <AppHeader />
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

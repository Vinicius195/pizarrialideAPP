import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/contexts/user-context';
import { cn } from '@/lib/utils';
import ServiceWorkerRegistrar from '@/components/service-worker-registrar';
import { fontSans } from '@/lib/fonts'; // Import from the new central file

export const metadata: Metadata = {
  title: 'Lider Pizzaria',
  description: 'Gerenciador para sua pizzaria',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={cn(
          'font-sans antialiased',
          fontSans.variable
        )}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="light">
          <UserProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegistrar /> 
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

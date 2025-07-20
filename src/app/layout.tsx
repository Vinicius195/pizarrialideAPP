import type { Metadata } from 'next';
import { Poppins, PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/contexts/user-context';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pizzaria Bela Massa',
  description: 'Gerenciador para sua pizzaria',
  manifest: '/manifest.webmanifest',
};

const fontSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

const fontHeadline = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-headline',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" 
        />
        <meta name="theme-color" content="#000000" />
      </head>
      <body
        className={cn(
          'font-sans antialiased',
          fontSans.variable,
          fontHeadline.variable,
        )}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="light">
          <UserProvider>
            {children}
            <Toaster />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

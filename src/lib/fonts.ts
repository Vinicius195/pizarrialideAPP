// src/lib/fonts.ts
import { Poppins, PT_Sans } from 'next/font/google';

// Fonte principal para o corpo do texto
export const fontSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

// Fonte para títulos e destaques
export const fontHeadline = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

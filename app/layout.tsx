// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { PostHogProvider } from '@/components/PostHogProvider'; // ← ДОБАВЬ ЭТО
import './globals.css';

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  // ... твой существующий metadata (без изменений)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-50`}>
        <PostHogProvider> {/* ← ОБЕРНИ ДЕТЕЙ В ЭТО */}
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}

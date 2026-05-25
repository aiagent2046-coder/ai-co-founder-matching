import type { Metadata } from 'next';
import { Playfair_Display, Syne } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

export const metadata: Metadata = {
  title:       'SyndiAI — Найди ко-фаундера за 48 часов',
  description: 'AI-powered co-founder matching platform with Big Five personality testing, AI avatars, and intelligent agent system.',
  openGraph: {
    title:       'SyndiAI',
    description: 'Tinder for Co-Founders, powered by AI',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${playfair.variable} ${syne.variable}`}>
      <body className="bg-[#0A0C10] text-[#F0EDE8] antialiased">
        {children}
      </body>
    </html>
  );
}

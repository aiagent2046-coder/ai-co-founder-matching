// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://syndiai.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'SyndiAI — Find Your Perfect Co-Founder',
    template: '%s | SyndiAI',
  },
  description:
    '65% of startups fail due to founder conflict. SyndiAI uses Big Five psychometrics and multi-agent AI to match you with a compatible, vetted co-founder. Stop guessing, start building.',
  keywords: [
    'co-founder matching',
    'startup founder',
    'Big Five personality test',
    'AI matchmaking',
    'psychometric compatibility',
    'найти кофаундера',
    'психометрика для стартапов',
  ],
  authors: [{ name: 'SyndiAI Team', url: baseUrl }],
  creator: 'SyndiAI',
  publisher: 'SyndiAI',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ru_RU',
    url: '/',
    siteName: 'SyndiAI',
    title: 'SyndiAI — Find Your Perfect Co-Founder',
    description:
      'AI-powered co-founder matching based on Big Five psychometrics. Stop guessing, start building.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'SyndiAI - AI Co-founder Matching Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SyndiAI — Find Your Perfect Co-Founder',
    description:
      'AI-powered co-founder matching based on Big Five psychometrics.',
    images: ['/opengraph-image.png'], // ← Исправлено с /og-image.png
    creator: '@syndiai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // icons убраны временно - добавим когда будут все файлы
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

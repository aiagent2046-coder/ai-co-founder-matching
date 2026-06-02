import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://syndiai.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/profile/'], // Закрываем приватные зоны и API
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

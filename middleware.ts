import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

console.log('[MW INIT] UPSTASH_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ present' : '❌ MISSING');
console.log('[MW INIT] UPSTASH_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ present' : '❌ MISSING');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  automaticDeserialization: false,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
});

// Хелпер для получения реального IP клиента
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for может содержать цепочку: "client, proxy1, proxy2"
    // Берем первый (самый левый) IP — это реальный клиент
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  // Fallback для локальной разработки
  return '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Пропускаем статику
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const identifier = `ratelimit:${ip}`;

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
    console.log(`[MW] ${pathname} | IP: ${ip} | success: ${success} | remaining: ${remaining}/${limit}`);

    if (!success) {
      console.log(`[MW] 🛑 RATE LIMIT EXCEEDED for ${ip} on ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    return response;

  } catch (error) {
    console.error('[MW ERROR] Rate limit check failed:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/api/:path*'],
};

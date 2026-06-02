// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

console.log('[MW INIT] UPSTASH_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ present' : '❌ MISSING');
console.log('[MW INIT] UPSTASH_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ present' : '❌ MISSING');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  // Для Edge Runtime важно указать automaticDeserialization: false
  automaticDeserialization: false,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 запросов в минуту на IP
  analytics: true,
});

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

  const ip = request.ip ?? '127.0.0.1';
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

    // Добавляем заголовки с лимитами для успешных запросов
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    return response;

  } catch (error) {
    console.error('[MW ERROR] Rate limit check failed:', error);
    // Fail-open: если Redis упал, пропускаем запрос (но логируем)
    // В проде можно изменить на fail-closed (вернуть 503)
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/api/:path*'],
};

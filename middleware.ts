import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Создаем Supabase клиент для сервера (middleware)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );

  // Проверяем, есть ли сессия у пользователя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Если пользователь не авторизован и пытается зайти на защищенную страницу /app/*
  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set(`redirectedFrom`, request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

// Указываем, на какие роуты middleware должен реагировать
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|ingest|robots.txt|sitemap.xml).*)',
  ],
};
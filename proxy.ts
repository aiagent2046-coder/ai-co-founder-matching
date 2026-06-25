import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // @supabase/ssr@0.3.0: cookie API get/set/remove (getAll/setAll появились позже).
      // Старый код использовал несуществующий API → рефреш сессии не работал.
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Важно: не запускаем никакую логику между createServerClient и getUser()
  const { data: { user } } = await supabase.auth.getUser();

  // Защищаем приватные зоны /app и /onboarding
  const p = request.nextUrl.pathname;
  if (!user && (p.startsWith('/app') || p.startsWith('/onboarding'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set(`redirectedFrom`, request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|ingest|robots.txt|sitemap.xml).*)',
  ],
};
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Server-side Supabase client с хранением сессии в httpOnly-cookie.
 * Все вызовы идут сервер Vercel → Supabase, поэтому ТСПУ/RKN их не режет
 * (в отличие от прямых browser → supabase.co запросов).
 *
 * Использует ANON_KEY: RLS работает от имени залогиненного юзера через cookie-сессию.
 * Для @supabase/ssr@0.3.0 — cookie API get/set/remove (не getAll/setAll).
 */
export async function getServerSupabase() {
  // Next 16: cookies() асинхронный.
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    },
  );
}

/** Текущий пользователь из cookie-сессии, либо null. */
export async function getServerUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

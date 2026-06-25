import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * Отдаёт access_token из cookie-сессии для клиентских fetch к /api/* (Bearer).
 * Токен берётся на сервере (сервер → Supabase), а не прямым browser → supabase.co,
 * который режет ТСПУ. getSession() здесь читает/рефрешит сессию из cookie.
 */
export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return NextResponse.json({ access_token: session?.access_token ?? null });
}

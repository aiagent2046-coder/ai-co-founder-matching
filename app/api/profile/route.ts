import { NextResponse } from 'next/server';
import { getServerUser, getServerSupabase } from '@/lib/supabase-server';

/**
 * Профиль текущего юзера из cookie-сессии (сервер → Supabase, ТСПУ не режет).
 * Заменяет прямые browser → supabase.co вызовы sb.from('founder_profiles') в страницах.
 */
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // .single() даёт ошибку, если профиля ещё нет — это норма (онбординг не пройден).
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

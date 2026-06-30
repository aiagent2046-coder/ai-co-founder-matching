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
  // Явный whitelist полей, которые реально читает UI (profile/avatar/onboarding).
  // Не отдаём наружу тяжёлый embedding и служебные/чувствительные поля
  // (telegram_*, behavioral_profile, honesty_humility, user_id и т.д.).
  const { data, error } = await supabase
    .from('founder_profiles')
    .select('name, role, domain, bio, location, stage, skills, looking_for, big_five, can_teach, want_to_learn, not_looking_for, goals, intent, birth_year, birth_month, birth_day, time_zone, work_style, hexaco')
    .eq('user_id', user.id)
    .single();

  // .single() даёт ошибку, если профиля ещё нет — это норма (онбординг не пройден).
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

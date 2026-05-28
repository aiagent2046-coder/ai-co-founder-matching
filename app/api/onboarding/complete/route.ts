import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { proxyFetch } from '@/lib/proxy-fetch';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ ok: true }); // graceful — редиректим в любом случае

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { fetch: proxyFetch as any } }
    );

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ ok: true });

    await supabase
      .from('founder_profiles')
      .update({ onboarding_done: true })
      .eq('user_id', user.id);
  } catch {
    // Не блокируем редирект если ошибка
  }

  return NextResponse.json({ ok: true });
}

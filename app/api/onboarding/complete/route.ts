import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from '@/lib/jwt';
import { proxyFetch } from '@/lib/proxy-fetch';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ ok: true }); // graceful — редиректим в любом случае

  const payload = decodeJwt(token);
  if (!payload?.sub) return NextResponse.json({ ok: true });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { fetch: proxyFetch as any } }
    );

    await supabase
      .from('founder_profiles')
      .update({ onboarding_done: true })
      .eq('user_id', payload.sub);
  } catch {
    // Не блокируем редирект если ошибка
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from '@/lib/jwt';
import { proxyFetch } from '@/lib/proxy-fetch';

export async function POST(req: NextRequest) {
  const { targetFounderId, action } = await req.json() as {
    targetFounderId: string;
    action: 'like' | 'pass';
  };

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = decodeJwt(token);
  if (!payload?.sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  if (action === 'pass') return NextResponse.json({ matched: false });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` }, fetch: proxyFetch as any } }
  );

  // Проверим есть ли мутуальный лайк
  const { data: theirLike } = await supabase
    .from('matches')
    .select('id')
    .eq('founder1_id', targetFounderId)
    .eq('founder2_id', payload.sub)
    .eq('status', 'pending')
    .single();

  if (theirLike) {
    await supabase.from('matches').update({ status: 'matched' }).eq('id', theirLike.id);
    return NextResponse.json({ matched: true, matchId: theirLike.id, score: 85 });
  }

  // Записываем лайк
  await supabase.from('matches').insert({
    founder1_id: payload.sub,
    founder2_id: targetFounderId,
    score: 0,
    status: 'pending',
  });

  return NextResponse.json({ matched: false });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from '@/lib/jwt';

export const maxDuration = 30;

// OCEAN complementarity (0..1): чем БОЛЬШЕ диф, тем сильнее партнёры дополняют
function oceanComplement(a: any, b: any): number {
  if (!a || !b) return 0.5;
  const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  let sum = 0;
  for (const t of traits) {
    const diff = Math.abs((a[t] ?? 50) - (b[t] ?? 50)) / 100;
    sum += diff;
  }
  // 0.5 — идеальный баланс между схожестью и дополнением
  // Используем bell curve: пик на 0.3-0.5 разнице
  const avg = sum / traits.length;
  const peak = 0.4;
  const sigma = 0.25;
  return Math.exp(-Math.pow(avg - peak, 2) / (2 * sigma * sigma));
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = decodeJwt(token);
  if (!payload?.sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1. Берём embedding текущего пользователя
  const { data: me } = await supabase
    .from('founder_profiles')
    .select('embedding, big_five')
    .eq('user_id', payload.sub)
    .single();

  if (!me?.embedding) {
    return NextResponse.json({
      error: 'Your embedding is not computed yet. Save your profile first.',
      candidates: [],
    }, { status: 400 });
  }

  // 2. Зовём pgvector function
  const { data: matches, error } = await supabase.rpc('match_founders', {
    query_embedding: me.embedding,
    match_count:     20,
    exclude_user_id: payload.sub,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Hybrid score: vector_sim * 0.6 + ocean_complement * 0.4
  const ranked = (matches || []).map((m: any) => {
    const oceanScore = oceanComplement(me.big_five, m.big_five);
    const hybridScore = m.similarity * 0.6 + oceanScore * 0.4;
    return {
      ...m,
      ocean_score:    Math.round(oceanScore * 100),
      vector_score:   Math.round(m.similarity * 100),
      match:          Math.round(hybridScore * 100),
    };
  }).sort((a: any, b: any) => b.match - a.match);

  return NextResponse.json({ candidates: ranked });
}

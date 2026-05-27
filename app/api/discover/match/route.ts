import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

// OCEAN complementarity — bell curve вокруг 40% разницы
function oceanComplement(a: any, b: any): number {
  if (!a || !b) return 0.5;
  const traits = ['openness','conscientiousness','extraversion','agreeableness','neuroticism'];
  let sum = 0;
  for (const t of traits) {
    sum += Math.abs((a[t] ?? 50) - (b[t] ?? 50)) / 100;
  }
  const avg = sum / traits.length;
  const peak = 0.4, sigma = 0.25;
  return Math.exp(-Math.pow(avg - peak, 2) / (2 * sigma * sigma));
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Server-side verify the JWT
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const userId = user.id;

  const { data: me } = await supabase
    .from('founder_profiles')
    .select('embedding, big_five')
    .eq('user_id', userId)
    .single();

  if (!me?.embedding) {
    return NextResponse.json({
      error: 'Сначала сгенерируй embedding в Avatar Studio (кнопка Recompute embedding).',
      candidates: [],
    }, { status: 400 });
  }

  const { data: matches, error } = await supabase.rpc('match_founders', {
    query_embedding: me.embedding,
    match_count:     20,
    exclude_user_id: userId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ranked = (matches || []).map((m: any) => {
    const oceanScore = oceanComplement(me.big_five, m.big_five);
    const hybridScore = m.similarity * 0.6 + oceanScore * 0.4;
    return {
      ...m,
      ocean_score:  Math.round(oceanScore * 100),
      vector_score: Math.round(m.similarity * 100),
      match:        Math.round(hybridScore * 100),
    };
  }).sort((a: any, b: any) => b.match - a.match);

  return NextResponse.json({ candidates: ranked });
}

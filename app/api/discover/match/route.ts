import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

const BEHAVIORAL_ENABLED = process.env.BEHAVIORAL_MATCH_ENABLED === 'true';

// Thomas-Kilmann compatibility matrix — score 0..1 для пары стилей
// Высокие значения: оба collaborating, один collaborating + другой compromising
// Низкие: оба competing (постоянный клинч), оба avoiding (никто не решает)
const CONFLICT_MATRIX: Record<string, Record<string, number>> = {
  competing:     { competing: 0.25, collaborating: 0.55, compromising: 0.65, avoiding: 0.40 },
  collaborating: { competing: 0.55, collaborating: 0.90, compromising: 0.80, avoiding: 0.50 },
  compromising:  { competing: 0.65, collaborating: 0.80, compromising: 0.70, avoiding: 0.60 },
  avoiding:      { competing: 0.40, collaborating: 0.50, compromising: 0.60, avoiding: 0.35 },
};

// Red flag: то, что A назвал raздражителем, реально присутствует у B
function redFlagPenalty(a: any, b: any): number {
  const irr = a?.projective?.partner_irritants;
  const dec = b?.projective?.decision_style;
  if (irr === 'chaos' && dec === 'do') return 0.5;            // A не выносит хаоса — B действует без плана
  if (irr === 'overthink' && dec === 'plan') return 0.5;      // A бесит analysis paralysis — B всегда планирует
  if (irr === 'no_ambition' && (b?.values?.achievement_power ?? 50) < 30) return 0.3;
  return 0;
}

function behavioralCompat(a: any, b: any): number {
  if (!a || !b) return 0.5; // нейтрально, если у кого-то нет behavioral
  const hA = a.honesty_humility ?? 50;
  const hB = b.honesty_humility ?? 50;
  const honestyScore = 1 - Math.abs(hA - hB) / 100;
  const styleA = a.conflict?.primary_style ?? 'compromising';
  const styleB = b.conflict?.primary_style ?? 'compromising';
  const conflictScore = CONFLICT_MATRIX[styleA]?.[styleB] ?? 0.5;
  const penalty = redFlagPenalty(a, b);
  return Math.max(0, Math.min(1,
    0.3 * honestyScore +
    0.5 * conflictScore +
    0.2 * (1 - penalty)
  ));
}

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
  const _rlOk = await checkLimit(`discover-match:${user.id}`);
  if (!_rlOk) return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  const userId = user.id;

  const { data: me } = await supabase
    .from('founder_profiles')
    .select('embedding, big_five, behavioral_profile')
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
    const behavScore = behavioralCompat((me as any).behavioral_profile, m.behavioral_profile);
    const hybridScore = BEHAVIORAL_ENABLED
      ? m.similarity * 0.4 + oceanScore * 0.4 + behavScore * 0.2
      : m.similarity * 0.6 + oceanScore * 0.4;
    return {
      ...m,
      ocean_score:      Math.round(oceanScore * 100),
      vector_score:     Math.round(m.similarity * 100),
      behavioral_score: Math.round(behavScore * 100),  // всегда в ответе, удобно для debug/UI
      match:            Math.round(hybridScore * 100),
    };
  }).sort((a: any, b: any) => b.match - a.match);

  return NextResponse.json({ candidates: ranked });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { soulCompat } from '@/lib/soul-matrix';
import { hexacoCompat, tzFit, workStyleCompat, PSYCHO_V2_WEIGHTS } from '@/lib/psycho-match';
import { checkLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

const BEHAVIORAL_ENABLED = process.env.BEHAVIORAL_MATCH_ENABLED === 'true';
// Psycho-Match v2 (Р3): HEXACO + tz + work-style. Дефолт off — данные накапливаются.
const PSYCHO_V2_ENABLED = process.env.PSYCHO_V2_ENABLED === 'true';

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

type BehavioralBreakdown = {
  score: number;
  honesty: number | null;
  conflict: { self: string; other: string; score: number } | null;
  red_flags: string[];
};

function soulLevelOf(score: number): string {
  return score >= 75 ? 'Глубокий резонанс'
       : score >= 60 ? 'Созвучие'
       : score >= 45 ? 'Нейтральный фон' : 'Разные волны';
}

const INTENT_MATRIX: Record<string, Record<string, number>> = {
  has_idea:        { has_idea: 0.75, looking_to_join: 1.00, flexible: 0.90 },
  looking_to_join: { has_idea: 1.00, looking_to_join: 0.15, flexible: 0.85 },
  flexible:        { has_idea: 0.90, looking_to_join: 0.85, flexible: 0.75 },
};

function intentCompat(a: string | null | undefined, b: string | null | undefined): number {
  const ia = a ?? 'has_idea'; // дефолт для старых юзеров
  const ib = b ?? 'has_idea';
  return INTENT_MATRIX[ia]?.[ib] ?? 0.5;
}

function activeRedFlags(a: any, b: any): string[] {
  const flags: string[] = [];
  const irr = a?.projective?.partner_irritants;
  const dec = b?.projective?.decision_style;
  if (irr === 'chaos' && dec === 'do') flags.push('chaos_vs_do');
  if (irr === 'overthink' && dec === 'plan') flags.push('overthink_vs_plan');
  if (irr === 'no_ambition' && (b?.values?.achievement_power ?? 50) < 30) flags.push('low_ambition');
  return flags;
}

function behavioralBreakdown(a: any, b: any): BehavioralBreakdown {
  if (!a || !b) return { score: 50, honesty: null, conflict: null, red_flags: [] };
  const hA = a.honesty_humility ?? 50;
  const hB = b.honesty_humility ?? 50;
  const honestyScore = 1 - Math.abs(hA - hB) / 100;
  const styleA = a.conflict?.primary_style ?? 'compromising';
  const styleB = b.conflict?.primary_style ?? 'compromising';
  const conflictScore = CONFLICT_MATRIX[styleA]?.[styleB] ?? 0.5;
  const penalty = redFlagPenalty(a, b);
  const total = Math.max(0, Math.min(1,
    0.3 * honestyScore +
    0.5 * conflictScore +
    0.2 * (1 - penalty)
  ));
  return {
    score:     Math.round(total * 100),
    honesty:   Math.round(honestyScore * 100),
    conflict:  { self: styleA, other: styleB, score: Math.round(conflictScore * 100) },
    red_flags: activeRedFlags(a, b),
  };
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

// GET не поддерживается — явный 405 вместо дефолтного Next.js
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Use POST to discover matches.' },
    { status: 405, headers: { Allow: 'POST' } },
  );
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // SERVICE_ROLE_KEY: чтение профилей кандидатов идёт на сервере, не зависит от RLS
  // (RLS на founder_profiles ужесточена до SELECT auth.uid()=user_id — чужие профили
  // больше не читаются ANON-ключом). getUser(token) верифицирует JWT по явному токену.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Server-side verify the JWT
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const _rlOk = await checkLimit(`discover-match:${user.id}`);
  if (!_rlOk) return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  const userId = user.id;

  const { data: me } = await supabase
    .from('founder_profiles')
    .select('embedding, big_five, behavioral_profile, intent, birth_year, birth_month, birth_day, hexaco, work_style, time_zone')
    .eq('user_id', userId)
    .single();

  if (!me?.embedding) {
    return NextResponse.json({
      error: 'Сначала сгенерируй embedding в Avatar Studio (кнопка Recompute embedding).',
      candidates: [],
    }, { status: 400 });
  }

  const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10);
  const matchCount = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 20;

  const { data: matches, error } = await supabase.rpc('match_founders', {
    query_embedding: me.embedding,
    match_count:     matchCount,
    exclude_user_id: userId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const engine = req.nextUrl.searchParams.get('engine') === 'soul' ? 'soul' : 'psycho';

  // match_founders RPC не возвращает behavioral_profile — подтягиваем отдельным запросом
  const matchedIds = (matches || []).map((m: any) => m.user_id).filter(Boolean);
  const behavioralMap = new Map<string, any>();
  const intentMap = new Map<string, string | null>();
  const birthMap = new Map<string, { birth_year: number | null; birth_month: number | null; birth_day: number | null }>();
  const v2Map = new Map<string, { hexaco: any; work_style: any; time_zone: string | null }>();
  if (matchedIds.length > 0) {
    const { data: extra } = await supabase
      .from('founder_profiles')
      .select('user_id, behavioral_profile, intent, birth_year, birth_month, birth_day, hexaco, work_style, time_zone')
      .in('user_id', matchedIds);
    for (const row of extra || []) {
      behavioralMap.set(row.user_id, row.behavioral_profile);
      intentMap.set(row.user_id, row.intent);
      birthMap.set(row.user_id, { birth_year: row.birth_year, birth_month: row.birth_month, birth_day: row.birth_day });
      v2Map.set(row.user_id, { hexaco: row.hexaco, work_style: row.work_style, time_zone: row.time_zone });
    }
  }

  const ranked = (matches || []).map((m: any) => {
    const candidateBehavioral = m.behavioral_profile ?? behavioralMap.get(m.user_id) ?? null;
    const oceanScore = oceanComplement(me.big_five, m.big_five);
    const breakdown = behavioralBreakdown((me as any).behavioral_profile, candidateBehavioral);
    const behavScore = breakdown.score / 100;
    const candidateIntent = m.intent ?? intentMap.get(m.user_id) ?? null;
    const intCompat = intentCompat((me as any).intent, candidateIntent);

    // Хард-фильтр: два looking_to_join (или другие крайне несовместимые пары) не показываем
    if (intCompat < 0.2) return null;

    let baseHybrid = BEHAVIORAL_ENABLED
      ? m.similarity * 0.4 + oceanScore * 0.4 + behavScore * 0.2
      : m.similarity * 0.6 + oceanScore * 0.4;

    // Psycho-Match v2: HEXACO + work-style + tz (за флагом, иначе формула как раньше).
    // Отсутствующие данные деградируют на нейтральные 0.5 внутри функций.
    let v2 = null as null | { hexaco: number; work_style: number; tz: number };
    if (PSYCHO_V2_ENABLED) {
      const cv2 = v2Map.get(m.user_id) ?? { hexaco: null, work_style: null, time_zone: null };
      const hexacoScore = hexacoCompat((me as any).hexaco, cv2.hexaco);
      const workScore = workStyleCompat((me as any).work_style, cv2.work_style);
      const tzScore = tzFit((me as any).time_zone, cv2.time_zone);
      v2 = {
        hexaco: Math.round(hexacoScore * 100),
        work_style: Math.round(workScore * 100),
        tz: Math.round(tzScore * 100),
      };
      baseHybrid =
        m.similarity     * PSYCHO_V2_WEIGHTS.similarity +
        oceanScore       * PSYCHO_V2_WEIGHTS.ocean +
        hexacoScore      * PSYCHO_V2_WEIGHTS.hexaco +
        workScore        * PSYCHO_V2_WEIGHTS.workStyle +
        tzScore          * PSYCHO_V2_WEIGHTS.tz;
    }
    const soul = engine === 'soul'
      ? soulCompat(
          {
            big_five: (me as any).big_five,
            behavioral_profile: (me as any).behavioral_profile,
            birth_year: (me as any).birth_year,
            birth_month: (me as any).birth_month,
            birth_day: (me as any).birth_day,
          },
          {
            big_five: m.big_five,
            behavioral_profile: candidateBehavioral,
            ...(birthMap.get(m.user_id) ?? { birth_year: null, birth_month: null, birth_day: null }),
          },
        )
      : null;
    const hybridScore = soul
      ? (soul.score / 100) * intCompat   // движок Матрицы: soul-композит × intent
      : baseHybrid * intCompat;          // психометрика: как раньше

    return {
      ...m,
      ocean_score:          Math.round(oceanScore * 100),
      vector_score:         Math.round(m.similarity * 100),
      behavioral_score:     breakdown.score,
      behavioral_breakdown: breakdown,
      intent:               candidateIntent,
      intent_compat:        Math.round(intCompat * 100),
      psycho_v2:            v2 ?? undefined,
      soul_score:           soul ? Math.round(hybridScore * 100) : undefined,
      soul_level:           soul ? soulLevelOf(Math.round(hybridScore * 100)) : undefined,
      soul_phrase:          soul ? soul.phrase : undefined,
      soul_components:      soul ? soul.components : undefined,
      match:                Math.round(hybridScore * 100),
    };
  }).filter(Boolean).sort((a: any, b: any) => b.match - a.match);

  return NextResponse.json({ candidates: ranked });
}

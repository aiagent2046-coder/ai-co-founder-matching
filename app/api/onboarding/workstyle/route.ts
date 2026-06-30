import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkLimit } from '@/lib/rate-limit';

// Psycho-Match v2 (Р3): сбор time_zone / work_style / hexaco.
// Все секции опциональны по отдельности — онбординг может слать их по частям.

const score = z.number().min(0).max(100);

const WorkStyleSchema = z.object({
  pace: score,
  structure: score,
  communication: score,
  risk: score,
});

const HexacoSchema = z.object({
  domains: z.object({
    H: score, E: score, X: score, A: score, C: score, O: score,
  }),
  facets: z.object({
    fairness: score,
    diligence: score,
    flexibility: score,
  }).optional(),
});

const BodySchema = z.object({
  // IANA tz, напр. 'Europe/Moscow'. Валидируем через Intl (не доверяем клиенту).
  time_zone: z.string().min(1).max(64).optional(),
  work_style: WorkStyleSchema.optional(),
  hexaco: HexacoSchema.optional(),
}).refine(
  (b) => b.time_zone !== undefined || b.work_style !== undefined || b.hexaco !== undefined,
  { message: 'Нужно хотя бы одно из полей: time_zone, work_style, hexaco' },
);

// Проверка валидности IANA-зоны без внешних зависимостей.
function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  if (!(await checkLimit(`onboarding-workstyle:${user.id}`))) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (parsed.data.time_zone && !isValidTz(parsed.data.time_zone)) {
    return NextResponse.json({ error: 'Невалидная зона time_zone' }, { status: 400 });
  }

  // Обновляем только присланные поля (частичное заполнение).
  const update: Record<string, unknown> = {};
  if (parsed.data.time_zone !== undefined) update.time_zone = parsed.data.time_zone;
  if (parsed.data.work_style !== undefined) update.work_style = parsed.data.work_style;
  if (parsed.data.hexaco !== undefined) update.hexaco = parsed.data.hexaco;

  const { error: updErr } = await supabase
    .from('founder_profiles')
    .update(update)
    .eq('user_id', user.id);

  if (updErr) {
    return NextResponse.json({ error: 'DB error: ' + updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { checkLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBody, bigfiveSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  // Проверка rate limit: 10 запросов в минуту (дефолт)
  const allowed = await checkLimit(`onboarding-bigfive:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
    // Парсим и валидируем тело запроса через Zod
  const body = await parseBody(bigfiveSchema, req);
  const scores = body.scores;  

  const { error } = await supabase
    .from('founder_profiles')
    .update({ big_five: scores })
    .eq('user_id', user.id);

  if (error) {
    console.error('bigfive error:', JSON.stringify(error));
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
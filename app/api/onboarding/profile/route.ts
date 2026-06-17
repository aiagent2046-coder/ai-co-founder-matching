import { checkLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const allowed = await checkLimit(`onboarding-profile:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  // Парсим тело запроса
  const body = await req.json();

  const { error } = await supabase.from('founder_profiles').upsert({
    user_id:         user.id,
    name:            body.name,
    role:            body.role,
    bio:             body.bio,
    skills:          body.skills,
    looking_for:     body.lookingFor,
    stage:           body.stage,
    domain:          body.domain,
    location:        body.location ?? '',
    linkedin_url:    body.linkedinUrl ?? null,
    github_url:      body.githubUrl ?? null,
    birth_month:     body.birthMonth ?? null,
    birth_day:       body.birthDay ?? null,
    birth_year:      body.birthYear ?? null,
    onboarding_done: false,
  }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
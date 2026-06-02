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

  const body = await req.json();
  const update: any = {
    name: body.name,
    role: body.role,
    domain: body.domain,
    bio: body.bio,
    location: body.location,
    stage: body.stage,
    skills: body.skills ?? [],
    can_teach: body.can_teach ?? [],
    want_to_learn: body.want_to_learn ?? [],
    looking_for: body.looking_for ?? [],
    not_looking_for: body.not_looking_for ?? [],
    goals: body.goals,
    autonomy_level: body.autonomy_level ?? 1,
  };

  Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

  const { error } = await supabase
    .from('founder_profiles')
    .update(update)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = req.headers.get('x-forwarded-host')
    ? `https://${req.headers.get('x-forwarded-host')}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  fetch(`${baseUrl}/api/embedding/recompute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(e => console.error('embedding recompute failed:', e));

  return NextResponse.json({ ok: true });
}

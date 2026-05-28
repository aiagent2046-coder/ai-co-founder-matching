import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { proxyFetch } from '@/lib/proxy-fetch';

export async function POST(req: NextRequest) {
  const body  = await req.json();
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: proxyFetch as any } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

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
    onboarding_done: false,
  }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

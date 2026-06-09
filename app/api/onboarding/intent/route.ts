import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID = new Set(['has_idea', 'looking_to_join', 'flexible']);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!VALID.has(body.intent)) {
    return NextResponse.json({ error: 'Invalid intent value' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const { error } = await supabase.from('founder_profiles').upsert({
    user_id: user.id,
    intent: body.intent,
    onboarding_done: false,
  }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkLimit } from '@/lib/rate-limit';

const BehavioralSchema = z.object({
  honesty_humility: z.number().min(0).max(100),
  values: z.object({
    achievement_power: z.number().min(0).max(100),
    universalism: z.number().min(0).max(100),
    self_direction: z.number().min(0).max(100),
  }),
  conflict: z.object({
    primary_style: z.enum(['competing', 'collaborating', 'compromising', 'avoiding']),
    performance_response: z.string().min(1).max(300),
    strategy_response: z.string().min(1).max(300),
  }),
  projective: z.object({
    partner_irritants: z.string().min(1).max(300),
    decision_style: z.string().min(1).max(300),
    rule_orientation: z.string().min(1).max(300),
  }),
});

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const token = auth?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  if (!(await checkLimit(`onboarding-behavioral:${user.id}`))) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BehavioralSchema.safeParse(body?.behavioral_profile);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid behavioral_profile', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { error: updErr } = await supabase
    .from('founder_profiles')
    .update({ behavioral_profile: parsed.data })
    .eq('user_id', user.id);

  if (updErr) {
    return NextResponse.json({ error: 'DB error: ' + updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

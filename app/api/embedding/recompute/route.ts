import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from '@/lib/jwt';
import { generateEssence, computeEmbedding } from '@/lib/avatar/essence';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = decodeJwt(token);
  if (!payload?.sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile, error: pErr } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('user_id', payload.sub)
    .single();

  if (pErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  try {
    const essence = await generateEssence(profile);
    const embedding = await computeEmbedding(essence);

    const { error: uErr } = await supabase
      .from('founder_profiles')
      .update({
        essence_text: essence,
        embedding:    `[${embedding.join(',')}]`,
        embedded_at:  new Date().toISOString(),
      })
      .eq('user_id', payload.sub);

    if (uErr) {
      console.error('[supabase] update failed:', uErr);
      return NextResponse.json({
        error: uErr.message,
        details: uErr.details,
        hint: uErr.hint,
        code: uErr.code,
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, essence, dim: embedding.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

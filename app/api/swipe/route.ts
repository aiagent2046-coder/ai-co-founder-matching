import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from '@/lib/jwt';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { to_user, action } = await req.json() as {
    to_user: string;
    action: 'like' | 'pass';
  };

  // 1. JWT auth
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = decodeJwt(token);
  if (!payload?.sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const userId = payload.sub;

  // 2. Service-role supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 3. Look up the current user's founder profile id (needed for matches table FK)
  const { data: myProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const myFounderId = myProfile.id;

  // 4. Idempotent swipe insert
  const { error: swipeError } = await supabase
    .from('swipes')
    .insert({ from_user: userId, to_user, action });

  if (swipeError) {
    // Unique constraint violation means the swipe already exists — idempotent
    if (swipeError.code === '23505' || swipeError.message?.includes('duplicate key')) {
      return NextResponse.json({ ok: true, mutual: false });
    }
    console.error('swipe insert error', swipeError);
    return NextResponse.json({ error: 'Failed to record swipe' }, { status: 500 });
  }

  // 5. Mutual match detection (only for likes)
  if (action === 'like') {
    const { data: otherLikes, error: checkError } = await supabase
      .from('swipes')
      .select('id')
      .eq('from_user', to_user)
      .eq('to_user', userId)
      .eq('action', 'like');

    if (checkError) {
      console.error('swipe check error', checkError);
    }

    if (otherLikes && otherLikes.length > 0) {
      // Symmetric like exists — create a match
      const [a, b] = [myFounderId, to_user].sort();

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .upsert(
          {
            founder1_id: a,
            founder2_id: b,
            score: 80,
            status: 'active',
          },
          { onConflict: 'founder1_id,founder2_id', ignoreDuplicates: true },
        )
        .select('id')
        .single();

      if (matchError && !matchError.message?.includes('duplicate key')) {
        console.error('match insert error', matchError);
      }

      return NextResponse.json({
        ok: true,
        mutual: true,
        match_id: match?.id ?? null,
      });
    }
  }

  return NextResponse.json({ ok: true, mutual: false });
}

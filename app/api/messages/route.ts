import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const matchId = req.nextUrl.searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 });

  // Проверить, что пользователь — участник мэтча
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, founder1_id, founder2_id')
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  // Найти founder_profiles для текущего пользователя
  const { data: myProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!myProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (myProfile.id !== match.founder1_id && myProfile.id !== match.founder2_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: messages, error: msgsErr } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (msgsErr) {
    return NextResponse.json({ error: msgsErr.message }, { status: 500 });
  }

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const { matchId, content } = await req.json();
  if (!matchId || !content?.trim()) {
    return NextResponse.json({ error: 'matchId and content are required' }, { status: 400 });
  }

  // Проверить, что пользователь — участник мэтча
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, founder1_id, founder2_id')
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { data: myProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!myProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (myProfile.id !== match.founder1_id && myProfile.id !== match.founder2_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: message, error: insErr } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: user.id, // Используем user.id из auth, чтобы соответствовать FK в БД
      content: content.trim(),
      type: 'text',
    })
    .select()
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ message }, { status: 201 });
}

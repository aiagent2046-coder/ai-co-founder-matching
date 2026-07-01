import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRoomToken, ROOM_TTL_SECONDS } from '@/lib/livekit';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Клиент с правами пользователя (RLS работает)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Админ-клиент для записи в video_rooms (обходит RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const matchId = body?.matchId;
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

  const roomName = `match_${matchId}`;
  const accessToken = await createRoomToken(roomName, user.id);

  // Записать комнату (T2: room_token = имя комнаты, не JWT)
  const expiresAt = new Date(Date.now() + ROOM_TTL_SECONDS * 1000).toISOString();
  const { error: insErr } = await supabaseAdmin
    .from('video_rooms')
    .insert({
      match_id: matchId,
      room_token: roomName,
      expires_at: expiresAt,
    });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    token: accessToken,
    roomName,
  });
}

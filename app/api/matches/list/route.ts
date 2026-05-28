import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

function initialsFor(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ANON_KEY — RLS policies будут проверять auth.uid()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1. Server-side verify the JWT
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const userId = user.id;

  // 2. Look up my founder profile
  const { data: myProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!myProfile) {
    console.log('[matches-list-debug] NO founder profile for user:', user.id);
    return NextResponse.json({ matches: [] });
  }

  const myFounderId = myProfile.id;
  console.log('[matches-list-debug] user.id:', user.id);
  console.log('[matches-list-debug] myFounderId:', myFounderId);

  // 3. Fetch matches where I am involved
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id, founder1_id, founder2_id, score, status, created_at')
    .or(`founder1_id.eq.${myFounderId},founder2_id.eq.${myFounderId}`)
    .order('created_at', { ascending: false });

  if (matchError) {
    console.error('matches fetch error', matchError);
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  console.log('[matches-list-debug] raw matches count:', matches?.length ?? 0);
  console.log('[matches-list-debug] matches data:', JSON.stringify(matches));

  if (!matches || matches.length === 0) return NextResponse.json({ matches: [] });

  // 4. Collect peer founder IDs and match IDs
  const peerIds: string[] = [];
  const matchIds: string[] = [];
  for (const m of matches) {
    matchIds.push(m.id);
    const peerId = m.founder1_id === myFounderId ? m.founder2_id : m.founder1_id;
    peerIds.push(peerId);
  }

  // 5. Fetch peer profiles in one query
  const { data: peers } = await supabase
    .from('founder_profiles')
    .select('id, user_id, name, role, domain')
    .in('id', peerIds);

  const peerMap = new Map((peers ?? []).map(p => [p.id, p]));

  // 6. Fetch last message for each match in one query
  const { data: allMessages } = await supabase
    .from('messages')
    .select('match_id, sender_id, content, is_ai_reply, created_at')
    .in('match_id', matchIds)
    .order('created_at', { ascending: false });

  // Group messages by match_id, pick the first (latest) one
  const lastMessageMap = new Map<string, {
    match_id: string;
    sender_id: string;
    content: string;
    is_ai_reply: boolean;
    created_at: string;
  }>();
  if (allMessages) {
    for (const msg of allMessages) {
      if (!lastMessageMap.has(msg.match_id)) {
        lastMessageMap.set(msg.match_id, msg as any);
      }
    }
  }

  // 7. Build response
  const result = matches.map(m => {
    const peerId = m.founder1_id === myFounderId ? m.founder2_id : m.founder1_id;
    const peer = peerMap.get(peerId);
    const lastMsg = lastMessageMap.get(m.id);

    return {
      match_id: m.id,
      peer_user_id: peer?.user_id ?? null,
      peer_name: peer?.name ?? 'Unknown',
      peer_role: peer?.role ?? '',
      peer_domain: peer?.domain ?? '',
      peer_avatar_text: initialsFor(peer?.name ?? ''),
      last_message: lastMsg?.content ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      has_ai_reply: lastMsg?.is_ai_reply ?? false,
      score: m.score,
      created_at: m.created_at,
    };
  });

  return NextResponse.json({ matches: result });
}

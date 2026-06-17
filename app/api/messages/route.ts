import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBody, messagesSchema } from '@/lib/validation';
import { buildSystemPrompt, DEFAULT_IDENTITY, type AvatarIdentity } from '@/lib/avatar/identity';
import { checkLimit } from '@/lib/rate-limit';

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

  // Добавляем флаг is_me, чтобы клиент точно знал, чье это сообщение
  const messagesWithFlags = (messages || []).map(m => ({
    ...m,
    is_me: m.sender_id === myProfile.id,
  }));

  return NextResponse.json({ messages: messagesWithFlags });
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

  // Проверка rate limit: 20 сообщений в минуту
  const allowed = await checkLimit(`messages:${user.id}`, 20, "60 s");
  if (!allowed) {
    return NextResponse.json({ error: 'Too many messages. Please slow down.' }, { status: 429 });
  }

  let parsed;
  try {
    parsed = await parseBody(messagesSchema, req);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
  const { matchId, content } = parsed;
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
      sender_id: myProfile.id, 
      content: content.trim(),
      type: 'text',
      is_ai_reply: false,
    })
    .select()
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // --- L2 Auto-Reply (первое сообщение, если у получателя autonomy >= 2) ---
  try {
    // a) Проверить, что это первое сообщение в матче
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId);

    if (count !== null && count <= 1) {
      // b) Определить recipient founder_id
      const recipientFounderId =
        match.founder1_id === myProfile.id ? match.founder2_id : match.founder1_id;

      // c) Загрузить recipient profile
      const { data: recipient } = await supabase
        .from('founder_profiles')
        .select('*')
        .eq('id', recipientFounderId)
        .single();

      // d) Проверить autonomy_level >= 2
      if (recipient && (recipient.autonomy_level ?? 0) >= 2) {
        // e) Собрать AvatarIdentity
        const identity: AvatarIdentity = {
          name:          recipient.name           ?? DEFAULT_IDENTITY.name,
          role:          recipient.role           ?? DEFAULT_IDENTITY.role,
          domain:        recipient.domain         ?? DEFAULT_IDENTITY.domain,
          bio:           recipient.bio            ?? '',
          location:      recipient.location       ?? '',
          stage:         recipient.stage          ?? 'idea',
          skills:        recipient.skills         ?? [],
          ocean:         recipient.big_five       ?? DEFAULT_IDENTITY.ocean,
          canTeach:      recipient.can_teach      ?? [],
          wantToLearn:   recipient.want_to_learn  ?? [],
          lookingFor:    recipient.looking_for    ?? [],
          notLookingFor: recipient.not_looking_for?? [],
          goals:         recipient.goals          ?? DEFAULT_IDENTITY.goals,
          autonomyLevel: recipient.autonomy_level ?? 1,
        };

        // f) Сгенерировать system prompt
        const systemPrompt = buildSystemPrompt(identity, 'autoreply');

        // g) Вызвать Claude API
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 400,
            system: systemPrompt,
            messages: [{ role: 'user', content: content.trim() }],
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (claudeRes.ok) {
          const data = await claudeRes.json();
          const aiReply: string | null = data.content?.[0]?.text ?? null;

          // i) Если ответ не пустой — сохранить как AI-ответ
          if (aiReply) {
            await supabase.from('messages').insert({
              match_id: matchId,
              sender_id: recipientFounderId,
              content: aiReply,
              type: 'text',
              is_ai_reply: true,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('L2 auto-reply failed:', e);
  }

  // Добавляем is_me: true, так как это только что отправленное сообщение пользователя
  return NextResponse.json({ message: { ...message, is_me: true } }, { status: 201 });
}
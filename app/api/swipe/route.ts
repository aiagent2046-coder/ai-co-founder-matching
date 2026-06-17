import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBody, swipeSchema } from '@/lib/validation';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = await parseBody(swipeSchema, req);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad request' }, { status: 400 });
  }
  const { to_user, action } = parsed;
    // 60 свайпов в минуту
  const allowed = await checkLimit(`swipe:${user.id}`, 60, "60 s");
  if (!allowed) {
    return NextResponse.json({ error: 'Too many swipes. Please slow down.' }, { status: 429 });
  }

  // 1. Auth
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Create service-role client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 3. Server-side verify the JWT via supabase.auth
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  const userId = user.id;

  // 4. Look up the current user's founder profile id
  const { data: myProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const myFounderId = myProfile.id;

  // 5. Look up the peer's founder profile id
  const { data: otherProfile } = await supabase
    .from('founder_profiles')
    .select('id')
    .eq('user_id', to_user)
    .single();
  const otherFounderId = otherProfile?.id;

  // 6. Idempotent swipe insert
  const { error: swipeError } = await supabase
    .from('swipes')
    .insert({ from_user: userId, to_user, action });

  if (swipeError) {
    if (swipeError.code === '23505' || swipeError.message?.includes('duplicate key')) {
      return NextResponse.json({ ok: true, mutual: false });
    }
    console.error('swipe insert error', swipeError);
    return NextResponse.json({ error: 'Failed to record swipe' }, { status: 500 });
  }

  // 7. Mutual match detection (only for likes)
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
      if (!otherFounderId) {
        console.warn('swipe: peer profile not found, skipping match creation', { to_user });
        return NextResponse.json({ ok: true, mutual: false });
      }

      // Symmetric like exists — create a match
      const [a, b] = [myFounderId, otherFounderId].sort();

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

      // L2: Auto-reply при взаимном мэтче (в фоне, не блокирует ответ)
      if (match?.id) {
        generateAutoReply(supabase, match.id, myFounderId, to_user).catch(e =>
          console.error('auto_reply failed:', e)
        );
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

/**
 * Генерирует первое сообщение от лица текущего фаундера при взаимном мэтче
 * через claude-haiku (быстро, дешево). Ошибки не ломают свайп.
 */
async function generateAutoReply(
  supabase: any,
  matchId: string,
  myFounderId: string,
  toUserId: string,
) {
  // Загружаем имена, роли, домены обоих (исправленная версия)
  const [{ data: me }, { data: them }] = await Promise.all([
    supabase.from('founder_profiles').select('name, role, domain').eq('id', myFounderId).single(),
    supabase.from('founder_profiles').select('name, role, domain').eq('user_id', toUserId).single(),
  ]);

  if (!me || !them) {
    console.warn('auto_reply: missing profile data');
    return;
  }

  const prompt = `Ты — AI-аватар фаундера по имени ${me.name} (роль: ${me.role}). Пишешь ПЕРВОЕ сообщение новому контакту по имени ${them.name} (роль: ${them.role}${them.domain ? ', сфера: ' + them.domain : ''}), с которым только что случился взаимный мэтч. Обратись К СОБЕСЕДНИКУ по имени ${them.name} (не к себе!), пиши от первого лица как ${me.name}, кратко и дружелюбно (1–2 предложения) НА РУССКОМ ЯЗЫКЕ, гендерно-нейтрально (используй настоящее время, избегай гендерных форм прошедшего вроде «рад/рада», «искал/искала»), предложи обсудить сотрудничество. Не упоминай, что ты ИИ. Ответь ТОЛЬКО текстом сообщения, без кавычек.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000); // haiku быстро

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.text();
      console.error('auto_reply: claude error', err);
      return;
    }

    const data = await res.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      console.warn('auto_reply: empty response');
      return;
    }

    const { error: insErr } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: myFounderId,
      content,
      type: 'auto_reply',
    });

    if (insErr) {
      console.error('auto_reply: insert error', insErr);
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      console.warn('auto_reply: claude timeout');
    } else {
      console.error('auto_reply: unhandled error', e);
    }
  }
}

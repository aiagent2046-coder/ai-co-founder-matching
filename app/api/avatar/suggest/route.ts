import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from '@/lib/jwt';
import { buildSystemPrompt, DEFAULT_IDENTITY, type AvatarIdentity } from '@/lib/avatar/identity';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = decodeJwt(token);
  if (!payload?.sub) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const { messages, mode = 'suggest' } = await req.json() as {
    messages: Array<{ senderId: string; content: string }>;
    mode?: 'suggest' | 'autoreply';
  };

  // 1. Загрузить identity из БД
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('user_id', payload.sub)
    .single();

  // 2. Собрать identity (с дефолтами для отсутствующих полей)
  const identity: AvatarIdentity = profile ? {
    name:          profile.name           ?? DEFAULT_IDENTITY.name,
    role:          profile.role           ?? DEFAULT_IDENTITY.role,
    domain:        profile.domain         ?? DEFAULT_IDENTITY.domain,
    bio:           profile.bio            ?? '',
    location:      profile.location       ?? '',
    stage:         profile.stage          ?? 'idea',
    skills:        profile.skills         ?? [],
    ocean:         profile.big_five       ?? DEFAULT_IDENTITY.ocean,
    canTeach:      profile.can_teach      ?? [],
    wantToLearn:   profile.want_to_learn  ?? [],
    lookingFor:    profile.looking_for    ?? [],
    notLookingFor: profile.not_looking_for?? [],
    goals:         profile.goals          ?? DEFAULT_IDENTITY.goals,
    autonomyLevel: profile.autonomy_level ?? 1,
  } : DEFAULT_IDENTITY;

  // 3. Скомпилировать system prompt
  const systemPrompt = buildSystemPrompt(identity, mode);

  // 4. Собрать conversation для Claude
  const conversation = messages.map(m => ({
    role: m.senderId === payload.sub ? 'assistant' : 'user',
    content: m.content,
  }));

  // Гарантируем что последнее сообщение от user (иначе Claude не ответит)
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    conversation.push({ role: 'user', content: '(continue the conversation naturally)' });
  }

  // 5. Вызов Claude API
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: conversation,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Claude API error', detail: err }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? '';

    return NextResponse.json({
      suggestion: reply,
      mode,
      identity: { name: identity.name, autonomyLevel: identity.autonomyLevel },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

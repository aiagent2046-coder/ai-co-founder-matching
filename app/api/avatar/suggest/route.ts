import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkLimit } from '@/lib/rate-limit';
import { buildSystemPrompt, DEFAULT_IDENTITY, type AvatarIdentity } from '@/lib/avatar/identity';
import { anthropicDispatcher } from '@/lib/anthropic-dispatcher';

const TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 1_000;

async function fetchWithTimeout(url: string, init: RequestInit & { timeout?: number }): Promise<Response> {
  const timeout = init.timeout ?? TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const dispatcher = url.startsWith('https://api.anthropic.com') ? anthropicDispatcher() : undefined;
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, dispatcher } as RequestInit);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === 2) {
        const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
        throw new Error(isTimeout ? 'AI service timeout, please try again' : `AI service error: ${err?.message ?? String(err)}`);
      }
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw new Error('AI service unavailable');
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

  // Rate limit: 5 запросов в 60 секунд на пользователя
  const success = await checkLimit(`avatar-suggest:${user.id}`);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  const { messages, mode = 'suggest' } = await req.json() as {
    messages: Array<{ senderId: string; content: string }>;
    mode?: 'suggest' | 'autoreply';
  };

  // 1. Загрузить identity из БД
  const { data: profile } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('user_id', user.id)
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
    role: m.senderId === user.id ? 'assistant' : 'user',
    content: m.content,
  }));

  // Гарантируем что последнее сообщение от user (иначе Claude не ответит)
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    conversation.push({ role: 'user', content: '(continue the conversation naturally)' });
  }

  // 5. Вызов Claude API с таймаутом и retry
  try {
    const res = await withRetry(() =>
      fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 500,
          system: systemPrompt,
          messages: conversation,
        }),
      })
    );

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

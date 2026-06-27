import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkLimit } from '@/lib/rate-limit';
import { getAgentRole, buildAgentPrompt, type ProjectContext } from '@/lib/agents/roles';

const TIMEOUT_MS = 25_000;
const RETRY_DELAY_MS = 1_000;

async function fetchWithTimeout(url: string, init: RequestInit & { timeout?: number }): Promise<Response> {
  const timeout = init.timeout ?? TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
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
  const success = await checkLimit(`agents-chat:${user.id}`);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  const { agentId, messages } = await req.json() as {
    agentId: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  const role = getAgentRole(agentId);
  if (!role) return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });

  // 1. Профиль владельца
  const { data: profile } = await supabase
    .from('founder_profiles')
    .select('id, name, role, domain, stage, bio')
    .eq('user_id', user.id)
    .single();

  // 2. Матчи владельца (имя/роль/домен/скор/статус)
  const matches: ProjectContext['matches'] = [];
  if (profile?.id) {
    const { data: rawMatches } = await supabase
      .from('matches')
      .select('founder1_id, founder2_id, score, status')
      .or(`founder1_id.eq.${profile.id},founder2_id.eq.${profile.id}`);

    const peerIds = (rawMatches ?? []).map(m => m.founder1_id === profile.id ? m.founder2_id : m.founder1_id);
    if (peerIds.length) {
      const { data: peers } = await supabase
        .from('founder_profiles')
        .select('id, name, role, domain')
        .in('id', peerIds);
      const peerMap = new Map((peers ?? []).map(p => [p.id, p]));
      for (const m of rawMatches ?? []) {
        const peerId = m.founder1_id === profile.id ? m.founder2_id : m.founder1_id;
        const peer = peerMap.get(peerId);
        if (peer) matches.push({
          name: peer.name ?? 'Unknown',
          role: peer.role ?? '',
          domain: peer.domain ?? '',
          score: m.score ?? 0,
          status: m.status ?? '',
        });
      }
    }
  }

  // 3. Контекст проекта + промпт роли
  const ctx: ProjectContext = {
    ownerName: profile?.name ?? 'Founder',
    ownerRole: profile?.role ?? '',
    ownerDomain: profile?.domain ?? '',
    ownerStage: profile?.stage ?? 'idea',
    ownerBio: profile?.bio ?? '',
    matches,
  };
  const systemPrompt = buildAgentPrompt(role, ctx);

  // 4. Гарантируем что последнее сообщение от user
  const conversation = (messages ?? []).filter(m => m.content?.trim());
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
  }

  // 5. Вызов Claude
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
          max_tokens: 4096,
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
    return NextResponse.json({ reply, agentId: role.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

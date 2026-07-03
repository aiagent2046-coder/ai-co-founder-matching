import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Read-only статистика лабораторного эксперимента (агенты @lab.syndi).
// Доступ через service-key (браузер ключ не видит) + защита заголовком x-lab-token.
// Ничего не мутирует. Фильтр строго по домену email агентов.

export const dynamic = 'force-dynamic';

const LAB_DOMAIN = 'lab.syndi';
// Ожидаемые шаги профиля для воронки заполненности.
const PROFILE_FIELDS = ['intent', 'big_five', 'behavioral_profile', 'work_style', 'hexaco'] as const;

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  // Простая защита: заголовок x-lab-token должен совпасть с env LAB_TOKEN.
  const token = req.headers.get('x-lab-token');
  if (!process.env.LAB_TOKEN || token !== process.env.LAB_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = svc();

  // 1. Найти всех lab-пользователей по email-домену (через auth admin).
  //    listUsers пагинируется; берём до 200 (агентов ~10, с запасом).
  const { data: usersPage, error: uErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  const labUsers = usersPage.users.filter(u => (u.email ?? '').endsWith(`@${LAB_DOMAIN}`));
  const labUserIds = labUsers.map(u => u.id);
  const emailById = new Map(labUsers.map(u => [u.id, u.email ?? '']));

  if (labUserIds.length === 0) {
    return NextResponse.json({
      agents: [], funnel: emptyFunnel(), matches_count: 0, messages_count: 0, feed: [],
      generated_at: new Date().toISOString(),
    });
  }

  // 2. Профили агентов.
  const { data: profiles, error: pErr } = await supabase
    .from('founder_profiles')
    .select('id, user_id, name, role, domain, intent, big_five, behavioral_profile, work_style, hexaco, onboarding_done, created_at')
    .in('user_id', labUserIds);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const profByUser = new Map((profiles ?? []).map(p => [p.user_id, p]));
  const labProfileIds = (profiles ?? []).map(p => p.id);
  const nameByProfileId = new Map((profiles ?? []).map(p => [p.id, p.name ?? '—']));

  // 3. Матчи между lab-агентами.
  const { data: matches } = await supabase
    .from('matches')
    .select('id, founder1_id, founder2_id, created_at')
    .or(`founder1_id.in.(${labProfileIds.join(',')}),founder2_id.in.(${labProfileIds.join(',')})`);
  const labMatches = (matches ?? []).filter(
    m => labProfileIds.includes(m.founder1_id) && labProfileIds.includes(m.founder2_id),
  );
  const labMatchIds = labMatches.map(m => m.id);

  // 4. Лента сообщений (последние 60) внутри lab-матчей.
  let feed: any[] = [];
  let messagesCount = 0;
  if (labMatchIds.length > 0) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('match_id', labMatchIds);
    messagesCount = count ?? 0;

    const { data: msgs } = await supabase
      .from('messages')
      .select('id, match_id, sender_id, content, is_ai_reply, created_at')
      .in('match_id', labMatchIds)
      .order('created_at', { ascending: false })
      .limit(60);
    feed = (msgs ?? []).map(m => ({
      id: m.id,
      match_id: m.match_id,
      sender: nameByProfileId.get(m.sender_id) ?? '—',
      content: m.content,
      is_ai_reply: m.is_ai_reply ?? false,
      created_at: m.created_at,
    }));
  }

  // 5. Сводка по агентам + воронка заполненности.
  const funnel = emptyFunnel();
  funnel.registered = labUserIds.length;

  const agents = labUsers.map(u => {
    const p: any = profByUser.get(u.id) ?? null;
    const filled: Record<string, boolean> = {};
    for (const f of PROFILE_FIELDS) {
      const has = !!(p && p[f] !== null && p[f] !== undefined && p[f] !== '');
      filled[f] = has;
      if (has) (funnel.fields as any)[f]++;
    }
    if (p) funnel.has_profile++;
    if (p?.onboarding_done) funnel.onboarding_done++;
    const doneCount = Object.values(filled).filter(Boolean).length;
    const completeness = Math.round((doneCount / PROFILE_FIELDS.length) * 100);
    return {
      email: emailById.get(u.id),
      name: p?.name ?? '(нет профиля)',
      role: p?.role ?? null,
      domain: p?.domain ?? null,
      intent: p?.intent ?? null,
      onboarding_done: !!p?.onboarding_done,
      filled,
      completeness,
    };
  }).sort((a, b) => b.completeness - a.completeness);

  return NextResponse.json({
    agents,
    funnel,
    matches_count: labMatches.length,
    messages_count: messagesCount,
    feed,
    generated_at: new Date().toISOString(),
  });
}

function emptyFunnel() {
  return {
    registered: 0,
    has_profile: 0,
    onboarding_done: 0,
    fields: { intent: 0, big_five: 0, behavioral_profile: 0, work_style: 0, hexaco: 0 },
  };
}

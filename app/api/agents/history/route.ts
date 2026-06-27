import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAgentRole } from '@/lib/agents/roles';

// История диалога с конкретным агентом (1a). Своя ветка на агента: ключ user_id + agent_id.
// Отдаёт последние HISTORY_LIMIT сообщений в хронологическом порядке.
const HISTORY_LIMIT = 50;

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get('agentId') ?? '';
  if (!getAgentRole(agentId)) return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  // Берём последние HISTORY_LIMIT по убыванию, затем разворачиваем в хронологический порядок.
  const { data, error } = await supabase
    .from('agent_messages')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });

  const messages = (data ?? [])
    .reverse()
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  return NextResponse.json({ agentId, messages });
}

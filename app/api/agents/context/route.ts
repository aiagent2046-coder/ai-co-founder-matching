import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MAX_FACT_LEN } from '@/lib/agents/save-facts';

// Память проекта (agent_context) — факты о стартапе, общие для всех агентов
// владельца. Все операции идут через сервисный ключ + явный фильтр по user_id
// (нельзя тронуть чужое). История диалогов (agent_messages) не затрагивается.

// Общая авторизация: вернёт { supabase, user } или NextResponse с ошибкой.
async function authed(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  return { supabase, user };
}

// GET — список фактов текущего пользователя (новые сверху).
export async function GET(req: NextRequest) {
  const a = await authed(req);
  if (a.error) return a.error;
  const { supabase, user } = a;

  const { data, error } = await supabase
    .from('agent_context')
    .select('id, content, created_by, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to load project memory' }, { status: 500 });
  return NextResponse.json({ facts: data ?? [] });
}

// PATCH — изменить content одного факта по id. Тело: { id, content }.
export async function PATCH(req: NextRequest) {
  const a = await authed(req);
  if (a.error) return a.error;
  const { supabase, user } = a;

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!id || !content) return NextResponse.json({ error: 'id и непустой content обязательны' }, { status: 400 });
  const clipped = content.length > MAX_FACT_LEN ? content.slice(0, MAX_FACT_LEN) : content;

  const { data, error } = await supabase
    .from('agent_context')
    .update({ content: clipped })
    .eq('user_id', user.id)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to update fact' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Fact not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE — без ?id: удалить ВСЕ факты (старое поведение). С ?id=<uuid>: удалить один.
export async function DELETE(req: NextRequest) {
  const a = await authed(req);
  if (a.error) return a.error;
  const { supabase, user } = a;

  const id = req.nextUrl.searchParams.get('id');

  let q = supabase.from('agent_context').delete().eq('user_id', user.id);
  if (id) q = q.eq('id', id);

  const { error } = await q;
  if (error) return NextResponse.json({ error: id ? 'Failed to delete fact' : 'Failed to clear project memory' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

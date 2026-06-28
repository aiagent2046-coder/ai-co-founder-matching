import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Очистка памяти проекта (agent_context) — фактов о стартапе, общих для всех
// агентов владельца. Удаляет ВСЕ факты текущего пользователя. Сервисный ключ +
// явный фильтр по user_id (нельзя удалить чужое). История диалогов
// (agent_messages) не затрагивается.
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const { error } = await supabase
    .from('agent_context')
    .delete()
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Failed to clear project memory' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase-server';

// Статус подключения GitHub и отключение. Токен наружу НИКОГДА не отдаётся —
// только факт подключения и логин аккаунта. Авторизация через cookie-сессию
// (единый паттерн github-подсистемы).

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET — { connected, github_login } для текущего пользователя.
export async function GET() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await admin()
    .from('github_connections')
    .select('github_login')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to read connection' }, { status: 500 });

  return NextResponse.json({
    connected: !!data,
    github_login: data?.github_login ?? null,
  });
}

// DELETE — отключить GitHub (удалить запись с токеном).
export async function DELETE() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await admin()
    .from('github_connections')
    .delete()
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

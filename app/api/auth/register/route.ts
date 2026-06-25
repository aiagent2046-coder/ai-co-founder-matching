import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Подтверждение почты выключено → есть session (cookie уже выставлена) → needsConfirmation=false.
  // Включено → session нет → клиент показывает "Проверь почту".
  const needsConfirmation = !data.session;
  return NextResponse.json({
    user: { id: data.user?.id, email: data.user?.email },
    needsConfirmation,
  });
}

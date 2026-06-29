import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/supabase-server';

// Шаг 1 OAuth: редирект пользователя на GitHub authorize.
// Пользователь уже залогинен в приложении (cookie-сессия) — берём user из неё.
// CSRF-защита: случайный state кладём в httpOnly-cookie и сверяем в callback.
//
// read-only доступ: scope "read:user repo". Для приватных репо нужен repo;
// если нужны только публичные — заменить на "read:user public_repo".
export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !appUrl) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
  }

  const state = randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('gh_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 минут на завершение флоу
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/github/callback`,
    scope: 'read:user repo',
    state,
    allow_signup: 'false',
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

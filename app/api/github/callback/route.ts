import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase-server';
import { encryptToken } from '@/lib/github/crypto';

// Шаг 2 OAuth: GitHub редиректит сюда с ?code&state.
// Сверяем state (CSRF), меняем code на access_token, шифруем, сохраняем по user_id.
// Затем редиректим обратно в чат агентов.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const backToAgents = (status: string) =>
    NextResponse.redirect(`${appUrl}/app/agents?github=${status}`);

  const user = await getServerUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const cookieStore = await cookies();
  const savedState = cookieStore.get('gh_oauth_state')?.value;
  cookieStore.set('gh_oauth_state', '', { maxAge: 0, path: '/' });

  if (!code || !state || !savedState || state !== savedState) {
    return backToAgents('error');
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return backToAgents('error');

  // code → access_token
  let accessToken: string | null = null;
  let scope: string | null = null;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/github/callback`,
      }),
    });
    const tokenJson = await tokenRes.json();
    accessToken = tokenJson.access_token ?? null;
    scope = tokenJson.scope ?? null;
  } catch {
    return backToAgents('error');
  }
  if (!accessToken) return backToAgents('error');

  // логин аккаунта (для отображения в UI)
  let githubLogin: string | null = null;
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    });
    if (userRes.ok) githubLogin = (await userRes.json()).login ?? null;
  } catch {
    // логин не критичен — продолжаем без него
  }

  // сохраняем зашифрованный токен (SERVICE_ROLE: RLS только на SELECT)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await admin
    .from('github_connections')
    .upsert(
      {
        user_id: user.id,
        encrypted_token: encryptToken(accessToken),
        github_login: githubLogin,
        scopes: scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (error) return backToAgents('error');

  return backToAgents('connected');
}

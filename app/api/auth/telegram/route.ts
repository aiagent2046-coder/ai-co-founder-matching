import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getServerSupabase } from '@/lib/supabase-server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const AUTH_MAX_AGE_SEC = 24 * 60 * 60;

function verifyInitData(initData: string):
  | { ok: true; user: any }
  | { ok: false; reason: string } {
  if (!BOT_TOKEN) return { ok: false, reason: 'TELEGRAM_BOT_TOKEN not set' };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'no hash' };
  params.delete('hash');
  const pairs: string[] = [];
  Array.from(params.keys()).sort().forEach(k => pairs.push(`${k}=${params.get(k)}`));
  const dataCheckString = pairs.join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (computed !== hash) return { ok: false, reason: 'bad hash' };
  const authDate = parseInt(params.get('auth_date') || '0', 10);
  if (!authDate || Date.now() / 1000 - authDate > AUTH_MAX_AGE_SEC) {
    return { ok: false, reason: 'expired' };
  }
  const userJson = params.get('user');
  if (!userJson) return { ok: false, reason: 'no user' };
  try { return { ok: true, user: JSON.parse(userJson) }; }
  catch { return { ok: false, reason: 'bad user json' }; }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const initData: string | undefined = body?.initData;
  if (!initData) return NextResponse.json({ error: 'initData required' }, { status: 400 });

  const v = verifyInitData(initData);
  if (!v.ok) return NextResponse.json({ error: 'invalid initData: ' + v.reason }, { status: 401 });

  const tg = v.user;
  const telegramId: number = tg.id;
  // email-шим (никому не показывается, технический ID)
  const email = `tg-${telegramId}@syndi.local`;
  // детерминированный пароль: server-secret + telegram_id
  const password = crypto
    .createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(`tg-${telegramId}`)
    .digest('hex');

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // пытаемся войти; если юзера нет — создаём и входим
  let signIn = await admin.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    const create = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
        telegram_username: tg.username ?? null,
        telegram_photo_url: tg.photo_url ?? null,
        first_name: tg.first_name ?? null,
        last_name: tg.last_name ?? null,
      },
    });
    if (create.error) return NextResponse.json({ error: 'create user: ' + create.error.message }, { status: 500 });
    signIn = await admin.auth.signInWithPassword({ email, password });
    if (signIn.error) return NextResponse.json({ error: 'sign in: ' + signIn.error.message }, { status: 500 });
  }

  // если профиль уже есть — пристёгиваем telegram_*; если нет, онбординг создаст его позже
  const userId = signIn.data.user!.id;
  await admin
    .from('founder_profiles')
    .update({
      telegram_id: telegramId,
      telegram_username: tg.username ?? null,
      telegram_photo_url: tg.photo_url ?? null,
    })
    .eq('user_id', userId);

  // Ставим cookie-сессию на сервере (вместо клиентского setSession, который бьёт в supabase.co).
  const ssr = await getServerSupabase();
  await ssr.auth.setSession({
    access_token: signIn.data.session!.access_token,
    refresh_token: signIn.data.session!.refresh_token,
  });

  return NextResponse.json({ user_id: userId });
}

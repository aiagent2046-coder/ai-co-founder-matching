import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}

export async function getAuthToken(): Promise<string | null> {
  // Берём токен с сервера (cookie-сессия), а не через прямой browser → supabase.co,
  // который режет ТСПУ/RKN из РФ. Сам запрос идёт на свой домен.
  try {
    const resp = await fetch('/api/auth/token');
    if (!resp.ok) return null;
    const { access_token } = await resp.json();
    return access_token ?? null;
  } catch {
    return null;
  }
}

import { createClient } from '@supabase/supabase-js';
import { decryptToken } from './crypto';

// Читает и расшифровывает GitHub-токен пользователя из github_connections.
// Возвращает null, если подключения нет. Использует SERVICE_ROLE (RLS только SELECT).
export async function getUserGitHubToken(userId: string): Promise<string | null> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await admin
    .from('github_connections')
    .select('encrypted_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.encrypted_token) return null;
  try {
    return decryptToken(data.encrypted_token);
  } catch {
    return null;
  }
}

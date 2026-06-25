import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export async function POST() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  // signOut чистит cookie через cookie-методы getServerSupabase.
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase-server';

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}

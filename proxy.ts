import { NextRequest, NextResponse } from 'next/server';

// TODO: включить защиту роутов после настройки Supabase
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/onboarding/:path*'],
};

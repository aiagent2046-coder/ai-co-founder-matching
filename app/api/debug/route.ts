// 🚨 REMOVED: этот эндпоинт возвращал ANTHROPIC_API_KEY в теле ответа.
// Удалён по соображениям безопасности.
// См. app/api/debug/route.ts в истории git для восстановления.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    envFile: process.env.NEXT_RUNTIME ?? 'unknown',
  });
}

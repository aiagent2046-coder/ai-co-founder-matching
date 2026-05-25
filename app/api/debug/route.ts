import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.ANTHROPIC_API_KEY ?? '';
  
  // Hex каждого символа
  const hex = Array.from(raw).map((c, i) => `${i}:${c.charCodeAt(0).toString(16)}(${c})`).join(' ');
  
  return NextResponse.json({
    len: raw.length,
    value: raw,
    hex: hex.slice(0, 200),
    envFile: process.env.NEXT_RUNTIME ?? 'unknown',
    cwd: process.cwd(),
  });
}

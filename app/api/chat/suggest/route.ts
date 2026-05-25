import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@syndi/ai-agents';
import type { Message } from '@syndi/types';

export async function POST(req: NextRequest) {
  const { matchId, messages } = await req.json() as {
    matchId: string;
    messages: Message[];
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ suggestion: 'Спроси про его самую большую неудачу — это покажет насколько он рефлексирует.' });
  }

  const orchestrator = new AgentOrchestrator({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  });

  const result = await orchestrator.run({
    type: 'assist_chat',
    matchId,
    messages,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ suggestion: (result.data as any)?.suggestion ?? '' });
}

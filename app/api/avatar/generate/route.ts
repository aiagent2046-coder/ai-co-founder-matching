import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from '@/lib/jwt';
import { AgentOrchestrator } from '@syndi/ai-agents';

export async function POST(req: NextRequest) {
  const { name, role, domain } = await req.json();
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  const payload = token ? decodeJwt(token) : null;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      prompt:       `Professional ${role} in ${domain}, confident portrait`,
      imageUrl:     null,
      predictionId: null,
    });
  }

  const orchestrator = new AgentOrchestrator({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    replicateApiKey: process.env.REPLICATE_API_KEY,
  });

  const result = await orchestrator.run({
    type: 'generate_avatar',
    profile: {
      id: payload?.sub ?? 'tmp', userId: payload?.sub ?? 'tmp',
      name, role, domain, bio: '', skills: [], lookingFor: [],
      stage: 'mvp', location: '', onboardingDone: false,
      createdAt: '', updatedAt: '',
    } as any,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { prompt, imageUrl } = result.data as any;
  return NextResponse.json({ prompt, imageUrl: imageUrl ?? null, predictionId: null });
}

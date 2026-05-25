import { AgentResult, CompatibilityReport, FounderProfile } from '@syndi/types';

const SYSTEM = `You are MatchAgent. Analyse co-founder compatibility. Return ONLY valid JSON.`;

export class MatchAgent {
  async run([a, b]: [FounderProfile, FounderProfile], apiKey: string): Promise<AgentResult<CompatibilityReport>> {
    const prompt = `Founders:
A: ${JSON.stringify({name:a.name,role:a.role,skills:a.skills,domain:a.domain,stage:a.stage})}
B: ${JSON.stringify({name:b.name,role:b.role,skills:b.skills,domain:b.domain,stage:b.stage})}
Return: {"totalScore":N,"personalityScore":N,"skillsScore":N,"stageScore":N,"domainScore":N,"rolesScore":N,"summary":"...","strengths":["...","..."],"risks":["...","..."]}`;
    const res  = await callClaude(prompt, SYSTEM, apiKey);
    const data = JSON.parse(res) as CompatibilityReport;
    return { success: true, data, agentName: 'MatchAgent', durationMs: 0 };
  }
}

export async function callClaude(
  userMsg: string,
  system: string,
  apiKey: string,
  maxTokens = 1024,
): Promise<string> {
  const axios   = (await import('axios')).default;
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';
  const proxy   = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;

  const proxyConfig = proxy ? (() => {
    const u = new URL(proxy);
    return { host: u.hostname, port: parseInt(u.port), protocol: u.protocol };
  })() : false;

  const resp = await axios.post(
    `${baseUrl}/v1/messages`,
    {
      model:      'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages:   [{ role: 'user', content: userMsg }],
    },
    {
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      proxy: proxyConfig as any,
    },
  );

  return resp.data.content[0].text as string;
}

import { AgentResult, FounderProfile } from '@syndi/types';
import { callClaude } from './match-agent';

export class InsightAgent {
  async run([a, b]: [FounderProfile, FounderProfile], apiKey: string): Promise<AgentResult<{ insights: string[]; recommendation: string }>> {
    const system = `You are InsightAgent. Give strategic insights about a co-founder partnership. Respond ONLY with valid JSON.`;
    const prompt = `Founders: A=${JSON.stringify({name:a.name,role:a.role,skills:a.skills})} B=${JSON.stringify({name:b.name,role:b.role,skills:b.skills})}\nReturn: {"insights":["...","...","...","..."],"recommendation":"..."}`;
    const res = await callClaude(prompt, system, apiKey);
    const data = JSON.parse(res);
    return { success: true, data, agentName: 'InsightAgent', durationMs: 0 };
  }
}

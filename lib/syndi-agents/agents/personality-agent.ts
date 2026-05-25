import { AgentResult, BigFiveScores, FounderProfile } from '@syndi/types';
import { callClaude } from './match-agent';

export class PersonalityAgent {
  async run(profile: FounderProfile, apiKey: string): Promise<AgentResult<BigFiveScores>> {
    const system = `Analyse founder profile and infer Big Five scores. Respond ONLY with valid JSON.`;
    const prompt = `Profile: ${JSON.stringify(profile)}\nReturn: {"openness":N,"conscientiousness":N,"extraversion":N,"agreeableness":N,"neuroticism":N} all 0-100.`;
    const res = await callClaude(prompt, system, apiKey);
    const data = JSON.parse(res) as BigFiveScores;
    return { success: true, data, agentName: 'PersonalityAgent', durationMs: 0 };
  }
}

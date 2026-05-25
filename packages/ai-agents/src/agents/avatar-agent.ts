import { AgentResult, FounderProfile } from '@syndi/types';
import { callClaude } from './match-agent';

export class AvatarAgent {
  async run(profile: FounderProfile, apiKey: string, replicateKey?: string): Promise<AgentResult<{ prompt: string; imageUrl?: string }>> {
    const system = `Generate a professional AI avatar image prompt for a startup founder. Return only the prompt string.`;
    const imagePrompt = await callClaude(`Name: ${profile.name}, Role: ${profile.role}, Domain: ${profile.domain}, Bio: ${profile.bio}`, system, apiKey, 256);
    return { success: true, data: { prompt: imagePrompt }, agentName: 'AvatarAgent', durationMs: 0 };
  }
}

import { AgentResult, Message } from '@syndi/types';
import { callClaude } from './match-agent';

export class ChatAgent {
  async run(matchId: string, messages: Message[], apiKey: string): Promise<AgentResult<{ suggestion: string }>> {
    const system = `You are ChatAgent inside a co-founder matching chat. Suggest 1-2 sentences the founders could say to deepen conversation. Be concise.`;
    const history = messages.slice(-8).map(m => `${m.senderId}: ${m.content}`).join('\n');
    const suggestion = await callClaude(`Match: ${matchId}\nMessages:\n${history}\n\nSuggest next message:`, system, apiKey, 256);
    return { success: true, data: { suggestion }, agentName: 'ChatAgent', durationMs: 0 };
  }
}

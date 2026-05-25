import {
  AgentEvent, AgentName, AgentResult,
  CompatibilityReport, FounderProfile, Message,
} from '@syndi/types';

import { MatchAgent }       from './agents/match-agent';
import { PersonalityAgent } from './agents/personality-agent';
import { ChatAgent }        from './agents/chat-agent';
import { AvatarAgent }      from './agents/avatar-agent';
import { InsightAgent }     from './agents/insight-agent';

// ── Task union ────────────────────────────────
export type OrchestratorTask =
  | { type: 'compute_match';      profiles: [FounderProfile, FounderProfile] }
  | { type: 'analyze_personality'; profile: FounderProfile }
  | { type: 'assist_chat';        matchId: string; messages: Message[] }
  | { type: 'generate_avatar';    profile: FounderProfile }
  | { type: 'generate_insight';   profiles: [FounderProfile, FounderProfile] };

export type OrchestratorOpts = {
  anthropicApiKey: string;
  replicateApiKey?: string;
  onEvent?: (event: AgentEvent) => void;
};

// ─────────────────────────────────────────────
//  AgentOrchestrator
// ─────────────────────────────────────────────
export class AgentOrchestrator {
  private match       = new MatchAgent();
  private personality = new PersonalityAgent();
  private chat        = new ChatAgent();
  private avatar      = new AvatarAgent();
  private insight     = new InsightAgent();

  private apiKey:      string;
  private replicateKey?: string;
  private onEvent?:    (event: AgentEvent) => void;

  constructor(opts: OrchestratorOpts) {
    this.apiKey       = opts.anthropicApiKey;
    this.replicateKey = opts.replicateApiKey;
    this.onEvent      = opts.onEvent;
  }

  private emit(agent: AgentName, type: AgentEvent['type'], payload?: Record<string, unknown>) {
    this.onEvent?.({ agent, type, payload, timestamp: new Date().toISOString() });
  }

  async run(task: OrchestratorTask): Promise<AgentResult> {
    const start = Date.now();
    const ms = () => Date.now() - start;

    try {
      switch (task.type) {

        case 'compute_match': {
          this.emit('MatchAgent', 'start');
          const result = await this.match.run(task.profiles, this.apiKey);
          this.emit('MatchAgent', 'complete', { score: (result.data as CompatibilityReport)?.totalScore });
          return { ...result, agentName: 'MatchAgent', durationMs: ms() };
        }

        case 'analyze_personality': {
          this.emit('PersonalityAgent', 'start');
          const result = await this.personality.run(task.profile, this.apiKey);
          this.emit('PersonalityAgent', 'complete');
          return { ...result, agentName: 'PersonalityAgent', durationMs: ms() };
        }

        case 'assist_chat': {
          this.emit('ChatAgent', 'start');
          const result = await this.chat.run(task.matchId, task.messages, this.apiKey);
          this.emit('ChatAgent', 'complete');
          return { ...result, agentName: 'ChatAgent', durationMs: ms() };
        }

        case 'generate_avatar': {
          this.emit('AvatarAgent', 'start');
          const result = await this.avatar.run(task.profile, this.apiKey, this.replicateKey);
          this.emit('AvatarAgent', 'complete');
          return { ...result, agentName: 'AvatarAgent', durationMs: ms() };
        }

        case 'generate_insight': {
          this.emit('InsightAgent', 'start');
          const result = await this.insight.run(task.profiles, this.apiKey);
          this.emit('InsightAgent', 'complete');
          return { ...result, agentName: 'InsightAgent', durationMs: ms() };
        }

        default:
          throw new Error('Unknown task type');
      }
    } catch (err) {
      const agentName = taskToAgent(task);
      this.emit(agentName, 'error', { message: String(err) });
      return { success: false, error: String(err), agentName, durationMs: ms() };
    }
  }
}

function taskToAgent(task: OrchestratorTask): AgentName {
  const map: Record<OrchestratorTask['type'], AgentName> = {
    compute_match:       'MatchAgent',
    analyze_personality: 'PersonalityAgent',
    assist_chat:         'ChatAgent',
    generate_avatar:     'AvatarAgent',
    generate_insight:    'InsightAgent',
  };
  return map[task.type];
}

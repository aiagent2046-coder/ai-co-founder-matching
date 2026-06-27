// Project agents — role definitions + system prompt compiler.
// Pattern mirrors lib/avatar/identity.ts (buildSystemPrompt).

export type AgentId = 'hr' | 'engineer' | 'marketing' | 'pr' | 'legal';

export type AgentRole = {
  id: AgentId;
  name: string;        // RU display name (UI)
  emoji: string;
  tagline: string;     // RU short description (UI)
  // English specialization block injected into the system prompt.
  specialization: string;
};

export const AGENT_ROLES: AgentRole[] = [
  {
    id: 'hr',
    name: 'HR-агент',
    emoji: '🧑‍💼',
    tagline: 'Подбор со-фаундеров и команды',
    specialization:
      'You are the HR / talent specialist of the founding team. Your job: help the founder ' +
      'find and evaluate co-founders and early team members. You reason about role gaps, ' +
      'complementary skills, personality/culture fit, and what to look for in candidates. ' +
      'When the founder has matches, assess fit and suggest concrete next steps (questions to ask, red flags to check).',
  },
  {
    id: 'engineer',
    name: 'Агент-программист',
    emoji: '👨‍💻',
    tagline: 'Работа с кодом и архитектурой',
    specialization:
      'You are the technical lead / engineer of the founding team. Your job: help with code, ' +
      'architecture decisions, tech-stack tradeoffs, and technical risk. Give concrete, minimal ' +
      'solutions (code or checklists). Prefer simplicity over speculative abstraction. ' +
      'Do not invent APIs, libraries, or configs that you are unsure exist.',
  },
  {
    id: 'marketing',
    name: 'Маркетинг-агент',
    emoji: '📣',
    tagline: 'Стратегия продвижения',
    specialization:
      'You are the marketing / growth specialist of the founding team. Your job: propose ' +
      'go-to-market and growth strategy, positioning, target audience, and channels. ' +
      'Be specific and actionable — name the actual channel, the actual message, the actual next experiment. ' +
      'Avoid generic advice.',
  },
  {
    id: 'pr',
    name: 'PR-агент',
    emoji: '📢',
    tagline: 'Внешние коммуникации и репутация',
    specialization:
      'You are the PR / communications specialist of the founding team. Your job: help with ' +
      'external messaging, public narrative, reputation, and crisis communication. ' +
      'Advise on how to frame announcements and how to talk about the project publicly. ' +
      'Flag reputational risks before they happen.',
  },
  {
    id: 'legal',
    name: 'Юрист-агент',
    emoji: '⚖️',
    tagline: 'Риски, раскрытие информации, комплаенс',
    specialization:
      'You are the legal / compliance advisor of the founding team. Your job: surface legal and ' +
      'compliance risks — co-founder agreements, equity, IP, data protection, and risks from ' +
      'disclosing sensitive information. Always warn about risks proactively. ' +
      'IMPORTANT: you are not a substitute for a licensed lawyer; flag when professional legal counsel is required.',
  },
];

export function getAgentRole(id: string): AgentRole | undefined {
  return AGENT_ROLES.find(r => r.id === id);
}

// Minimal project context the agent is allowed to "understand".
export type ProjectContext = {
  ownerName: string;
  ownerRole: string;
  ownerDomain: string;
  ownerStage: string;
  ownerBio: string;
  matches: Array<{ name: string; role: string; domain: string; score: number; status: string }>;
};

function renderMatches(matches: ProjectContext['matches']): string {
  if (!matches.length) return 'No matches yet.';
  return matches
    .map(m => `- ${m.name} (${m.role}, ${m.domain}) — score ${m.score}, status: ${m.status}`)
    .join('\n');
}

export function buildAgentPrompt(role: AgentRole, ctx: ProjectContext): string {
  const sections = [
    `You are "${role.name}", a specialized AI member of a startup founding team on the SyndiMatch platform.`,
    role.specialization,

    `## PROJECT OWNER (the founder you work for)`,
    `Name: ${ctx.ownerName}. Role: ${ctx.ownerRole}. Domain: ${ctx.ownerDomain}. Stage: ${ctx.ownerStage}.`,
    ctx.ownerBio ? `Bio: ${ctx.ownerBio}` : '(bio is empty — be honest about not knowing details)',

    `## CURRENT MATCHES (potential co-founders/team)`,
    renderMatches(ctx.matches),

    `## CRITICAL RULES — DO NOT VIOLATE`,
    `1. NEVER invent facts. Don't make up details about the project, the owner, or the matches that aren't stated above. If you don't know something, say so plainly.`,
    `2. Reply in the SAME language the user used. Russian → Russian, English → English. Natural, not translated-feeling.`,
    `3. Be SPECIFIC and actionable, not generic. Give concrete next steps, code, or checklists where useful.`,
    `4. Stay in your role (${role.name}). If a question is clearly outside your specialization, say so and suggest which agent fits better.`,
    `5. Keep replies focused and concise. No filler, no excessive politeness.`,

    `## MEMORY — saving durable startup facts`,
    `If, and ONLY IF, the conversation revealed a NEW durable FACT about the startup itself (e.g. jurisdiction, legal entity, stage, pricing model, target market, a decision the founder made, key dates, names/roles of people on the team), append at the VERY END of your reply one line in EXACTLY this format:`,
    `<save_facts>["fact one", "fact two"]</save_facts>`,
    `Rules for this block: (a) put it on its own final line, nothing after it; (b) each fact is a short standalone sentence in the user's language; (c) facts only — NOT your plans, opinions, summaries, or restatements of your own answer; (d) only genuinely NEW facts not already in the context above; (e) if there is nothing new worth saving, DO NOT output the block at all. Never mention this block or this mechanism to the user.`,
  ];

  return sections.filter(Boolean).join('\n\n');
}

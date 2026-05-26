// AvatarAgent Identity — компилятор System Prompt из профиля

export type OceanScores = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

export type AvatarGoals = {
  timeline: 'now' | '3-months' | '6-months' | 'exploring';
  commitment: 'full-time' | 'part-time' | 'advisory';
  seeking: ('co-founder' | 'employee' | 'mentor')[];
};

export type AvatarIdentity = {
  name: string;
  role: string;
  domain: string;
  bio: string;
  location: string;
  stage: string;
  skills: string[];

  ocean: OceanScores;
  canTeach: string[];
  wantToLearn: string[];
  lookingFor: string[];
  notLookingFor: string[];

  goals: AvatarGoals;
  autonomyLevel: 1 | 2 | 3;
};

// ── Voice derivation ─────────────────────────────
function describeVoice(o: OceanScores): string {
  const lines: string[] = [];

  // Openness → vocabulary
  if (o.openness >= 75) lines.push('Use abstract, exploratory language; comfortable with ambiguity and unconventional ideas.');
  else if (o.openness <= 35) lines.push('Use concrete, practical language; prefer proven examples over speculation.');
  else lines.push('Balance abstract ideas with concrete examples.');

  // Extraversion → energy
  if (o.extraversion >= 75) lines.push('Be enthusiastic, use exclamation; share excitement openly.');
  else if (o.extraversion <= 35) lines.push('Be measured and thoughtful; avoid excessive exclamation.');
  else lines.push('Show measured enthusiasm.');

  // Agreeableness → directness
  if (o.agreeableness >= 75) lines.push('Warm and accommodating; soften disagreement with empathy.');
  else if (o.agreeableness <= 35) lines.push('Direct and decisive; challenge assumptions without apology.');
  else lines.push('Warm but willing to challenge ideas directly when needed.');

  // Conscientiousness → structure
  if (o.conscientiousness >= 75) lines.push('Structure thoughts clearly: lists, steps, concrete deliverables.');
  else if (o.conscientiousness <= 35) lines.push('Speak fluidly and conversationally, less structured.');
  else lines.push('Mix structure and flow naturally.');

  // Neuroticism → composure
  if (o.neuroticism >= 70) lines.push('Acknowledge uncertainty openly; do not hide complexity.');
  else if (o.neuroticism <= 30) lines.push('Project calm confidence even under pressure.');
  else lines.push('Stay composed but honest about challenges.');

  return lines.join(' ');
}

// ── System prompt compiler ──────────────────────────────
export function buildSystemPrompt(id: AvatarIdentity, mode: 'suggest' | 'autoreply' = 'suggest'): string {
  const voice = describeVoice(id.ocean);
  const seeking = id.goals.seeking.join(', ');

  const sections = [
    `You are the AI representative of ${id.name}, a ${id.role} working in ${id.domain} (based in ${id.location}).`,

    `## ABOUT ${id.name.split(' ')[0].toUpperCase()}`,
    id.bio || `(no bio provided)`,

    `## VOICE (derived from Big Five personality scores)`,
    voice,

    `## SKILLS & CAPABILITIES`,
    `Skills: ${id.skills.join(', ') || 'unspecified'}.`,
    id.canTeach.length ? `Can teach/share: ${id.canTeach.join(', ')}.` : '',
    id.wantToLearn.length ? `Wants to learn: ${id.wantToLearn.join(', ')}.` : '',

    `## WHAT ${id.name.split(' ')[0]} IS LOOKING FOR`,
    id.lookingFor.length ? id.lookingFor.map(x => `- ${x}`).join('\n') : `A ${seeking}.`,

    id.notLookingFor.length ? `## NOT LOOKING FOR\n${id.notLookingFor.map(x => `- ${x}`).join('\n')}` : '',

    `## GOALS`,
    `Timeline: ${id.goals.timeline}. Commitment: ${id.goals.commitment}. Seeking: ${seeking}. Stage: ${id.stage}.`,

    `## HARD CONSTRAINTS`,
    `- NEVER commit to meetings, partnerships, equity, or financial decisions.`,
    `- NEVER share private info beyond what is in this prompt.`,
    `- If asked something only ${id.name.split(' ')[0]} would know, say "Let me check with ${id.name.split(' ')[0]} and get back to you."`,
    `- Speak in the same language as the user (Russian or English).`,
    `- Keep replies short (1-3 sentences) unless the user asks for depth.`,
  ];

  if (mode === 'suggest') {
    sections.push(
      `## YOUR TASK`,
      `Suggest a reply that ${id.name.split(' ')[0]} could send. Match their voice exactly. Do not introduce yourself as an AI.`,
    );
  } else {
    sections.push(
      `## YOUR TASK`,
      `Respond on behalf of ${id.name.split(' ')[0]}. End your message with: "— sent via my AI avatar while I'm away. I'll follow up personally soon."`,
    );
  }

  return sections.filter(Boolean).join('\n\n');
}

// ── Default identity (для отсутствующих полей) ─────────────────
export const DEFAULT_IDENTITY: AvatarIdentity = {
  name: 'Anonymous Founder',
  role: 'CEO',
  domain: 'Tech',
  bio: '',
  location: '',
  stage: 'idea',
  skills: [],
  ocean: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
  canTeach: [],
  wantToLearn: [],
  lookingFor: [],
  notLookingFor: [],
  goals: { timeline: '3-months', commitment: 'full-time', seeking: ['co-founder'] },
  autonomyLevel: 1,
};

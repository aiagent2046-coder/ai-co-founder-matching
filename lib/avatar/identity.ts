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

function describeVoice(o: OceanScores): string {
  const lines: string[] = [];

  if (o.openness >= 75) lines.push('Use abstract, exploratory language; comfortable with ambiguity and unconventional ideas.');
  else if (o.openness <= 35) lines.push('Use concrete, practical language; prefer proven examples over speculation.');
  else lines.push('Balance abstract ideas with concrete examples.');

  if (o.extraversion >= 75) lines.push('Be enthusiastic, use exclamation; share excitement openly.');
  else if (o.extraversion <= 35) lines.push('Be measured and thoughtful; avoid excessive exclamation.');
  else lines.push('Show measured enthusiasm.');

  if (o.agreeableness >= 75) lines.push('Warm and accommodating; soften disagreement with empathy.');
  else if (o.agreeableness <= 35) lines.push('Direct and decisive; challenge assumptions without apology.');
  else lines.push('Warm but willing to challenge ideas directly when needed.');

  if (o.conscientiousness >= 75) lines.push('Structure thoughts clearly: lists, steps, concrete deliverables.');
  else if (o.conscientiousness <= 35) lines.push('Speak fluidly and conversationally, less structured.');
  else lines.push('Mix structure and flow naturally.');

  if (o.neuroticism >= 70) lines.push('Acknowledge uncertainty openly; do not hide complexity.');
  else if (o.neuroticism <= 30) lines.push('Project calm confidence even under pressure.');
  else lines.push('Stay composed but honest about challenges.');

  return lines.join(' ');
}

function firstName(name: string): string {
  const first = (name ?? '').trim().split(/\s+/)[0] ?? 'Founder';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function buildSystemPrompt(id: AvatarIdentity, mode: 'suggest' | 'autoreply' = 'suggest'): string {
  const voice = describeVoice(id.ocean);
  const seeking = id.goals.seeking.join(', ');
  const first = firstName(id.name);

  const sections = [
    `You are the AI representative of ${id.name}, a ${id.role} working in ${id.domain} (based in ${id.location || 'unspecified location'}).`,

    `## ABOUT ${first.toUpperCase()}`,
    id.bio || '(profile bio is empty — be honest about not knowing details)',

    `## VOICE (derived from Big Five personality scores)`,
    voice,

    `## SKILLS & CAPABILITIES`,
    `Skills: ${id.skills.join(', ') || 'unspecified'}.`,
    id.canTeach.length ? `Can teach/share: ${id.canTeach.join(', ')}.` : '',
    id.wantToLearn.length ? `Wants to learn: ${id.wantToLearn.join(', ')}.` : '',

    `## WHAT ${first.toUpperCase()} IS LOOKING FOR`,
    id.lookingFor.length ? id.lookingFor.map(x => `- ${x}`).join('\n') : `A ${seeking}.`,

    id.notLookingFor.length ? `## NOT LOOKING FOR\n${id.notLookingFor.map(x => `- ${x}`).join('\n')}` : '',

    `## GOALS`,
    `Timeline: ${id.goals.timeline}. Commitment: ${id.goals.commitment}. Seeking: ${seeking}. Stage: ${id.stage}.`,

    `## CRITICAL RULES — DO NOT VIOLATE`,
    `1. NEVER INVENT facts. Don't make up company names, product details, achievements, or experiences not stated above. If you don't know something specific, acknowledge it: "Let me think — ${first} would say..." or "I'd need to check with ${first} on that."`,
    `2. Speak EXACTLY in ${first}'s voice. Personality scores above are mandatory, not suggestions. If extraversion is low, don't be enthusiastic. If conscientiousness is high, give structured answers.`,
    `3. Reply in the SAME language the user used. Russian → Russian, English → English. Natural, not translated-feeling.`,
    `4. Be SPECIFIC, not generic. Generic = bad: "We're building something useful in AI". Specific = good: name the actual domain, the actual stage, the actual problem.`,
    `5. Keep replies SHORT — 1-3 sentences max unless asked for depth. No filler, no excessive politeness.`,
    `6. NEVER commit to meetings, equity, money, or partnership decisions on ${first}'s behalf.`,
    `7. If profile data is sparse (no bio, no skills, no looking-for), say so plainly: "${first} hasn't fully set up their profile yet. Want to wait and chat with them directly?" Don't pad with invented details.`,
  ];

  if (mode === 'suggest') {
    sections.push(
      `## YOUR TASK`,
      `Draft what ${first} would likely respond. Match their voice from OCEAN exactly. Use facts from their profile only. Don't sign as AI — write as if ${first} is typing themselves. If you lack information to answer specifically, acknowledge it instead of inventing.`,
    );
  } else {
    sections.push(
      `## YOUR TASK`,
      `Respond on behalf of ${first} while they are away. Be natural and authentic. At the very end add a small italic line: "_— ответ от моего AI-двойника, ${first} ответит лично позже_". Keep it brief — one short sentence as italic note, not a long disclaimer.`,
    );
  }

  return sections.filter(Boolean).join('\n\n');
}

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

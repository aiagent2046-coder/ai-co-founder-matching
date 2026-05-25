import type { FounderProfile, Match, Message } from '@syndi/types';

export const MOCK_FOUNDERS: FounderProfile[] = [
  {
    id: 'f1', userId: 'u1', name: 'Alex Chen', role: 'CTO', bio: 'Ex-Google Brain. Built ML infra at scale. Looking for a visionary CEO to build the future of AI tools.',
    skills: ['Python', 'ML', 'System Design', 'Go'], lookingFor: ['CEO', 'CPO'],
    stage: 'mvp', domain: 'AI/ML', location: 'San Francisco',
    avatarUrl: '', aiAvatarUrl: '', onboardingDone: true,
    bigFive: { openness: 88, conscientiousness: 72, extraversion: 55, agreeableness: 68, neuroticism: 32 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'f2', userId: 'u2', name: 'Sarah Kim', role: 'CEO', bio: 'YC W24. Previously scaled a B2B SaaS to $2M ARR. Obsessed with product-led growth and community building.',
    skills: ['Growth', 'Sales', 'Fundraising', 'Strategy'], lookingFor: ['CTO', 'CPO'],
    stage: 'seed', domain: 'B2B SaaS', location: 'New York',
    avatarUrl: '', aiAvatarUrl: '', onboardingDone: true,
    bigFive: { openness: 78, conscientiousness: 90, extraversion: 82, agreeableness: 75, neuroticism: 28 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'f3', userId: 'u3', name: 'Marcus Rivera', role: 'CPO', bio: 'Ex-Stripe PM. Led checkout redesign that increased conversion by 23%. Looking for technical co-founder for FinTech startup.',
    skills: ['Product Strategy', 'UX', 'Data Analysis', 'Roadmapping'], lookingFor: ['CTO'],
    stage: 'idea', domain: 'FinTech', location: 'Austin',
    avatarUrl: '', aiAvatarUrl: '', onboardingDone: true,
    bigFive: { openness: 82, conscientiousness: 85, extraversion: 70, agreeableness: 80, neuroticism: 35 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'f4', userId: 'u4', name: 'Yuki Tanaka', role: 'CTO', bio: 'MIT PhD in ML. 3 patents in NLP. Building at the intersection of AI and healthcare. JFDI type.',
    skills: ['NLP', 'PyTorch', 'Research', 'TypeScript'], lookingFor: ['CEO', 'BD'],
    stage: 'mvp', domain: 'HealthTech', location: 'Boston',
    avatarUrl: '', aiAvatarUrl: '', onboardingDone: true,
    bigFive: { openness: 92, conscientiousness: 78, extraversion: 42, agreeableness: 65, neuroticism: 45 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'f5', userId: 'u5', name: 'Priya Nair', role: 'CEO', bio: 'Ex-McKinsey. Raised $500K pre-seed for EdTech startup. Passionate about democratizing education globally.',
    skills: ['Operations', 'Fundraising', 'Partnerships', 'Marketing'], lookingFor: ['CTO', 'Designer'],
    stage: 'seed', domain: 'EdTech', location: 'London',
    avatarUrl: '', aiAvatarUrl: '', onboardingDone: true,
    bigFive: { openness: 85, conscientiousness: 88, extraversion: 79, agreeableness: 88, neuroticism: 22 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

export const MOCK_MATCHES: (Match & { profile: FounderProfile })[] = [
  {
    id: 'm1', founder1Id: 'me', founder2Id: 'f2',
    score: 94, status: 'matched',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    profile: MOCK_FOUNDERS[1],
  },
  {
    id: 'm2', founder1Id: 'me', founder2Id: 'f4',
    score: 87, status: 'matched',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    profile: MOCK_FOUNDERS[3],
  },
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'msg1', matchId: 'm1', senderId: 'f2', content: 'Привет! Впечатляет твой опыт в ML. Я как раз ищу технического ко-фаундера для AI-first продукта.', type: 'text', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'msg2', matchId: 'm1', senderId: 'me', content: 'Sarah, привет! Видел твой YC батч — интересный трекшн. Расскажи про текущий стек и roadmap?', type: 'text', createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
  { id: 'msg3', matchId: 'm1', senderId: 'f2', content: 'Сейчас на Next.js + Supabase, MVP за 3 недели. Roadmap: enterprise tier к Q3, Series A в конце года.', type: 'text', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
];

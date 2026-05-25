// ─────────────────────────────────────────────
//  @syndi/types — единственный источник правды
// ─────────────────────────────────────────────

// ── Big Five ──────────────────────────────────
export type BigFiveScores = {
  openness:          number; // 0-100
  conscientiousness: number;
  extraversion:      number;
  agreeableness:     number;
  neuroticism:       number;
};

// ── Founder ───────────────────────────────────
export type StartupRole  = 'CEO' | 'CTO' | 'CPO' | 'CMO' | 'CFO' | 'Designer' | 'BD' | 'Other';
export type StartupStage = 'idea' | 'mvp' | 'seed' | 'series_a' | 'growth';
export type Domain       = 'AI/ML' | 'FinTech' | 'HealthTech' | 'EdTech' | 'B2B SaaS' | 'Consumer' | 'Web3' | 'Other';

export type FounderProfile = {
  id:             string;
  userId:         string;
  name:           string;
  role:           StartupRole;
  bio:            string;
  skills:         string[];
  lookingFor:     StartupRole[];
  stage:          StartupStage;
  domain:         Domain;
  location:       string;
  avatarUrl?:     string;
  aiAvatarUrl?:   string;
  aiAvatarPrompt?: string;
  bigFive?:       BigFiveScores;
  linkedinUrl?:   string;
  githubUrl?:     string;
  onboardingDone: boolean;
  createdAt:      string;
  updatedAt:      string;
};

// ── Matching ──────────────────────────────────
export type MatchStatus = 'pending' | 'matched' | 'rejected';

export type Match = {
  id:         string;
  founder1Id: string;
  founder2Id: string;
  score:      number; // 0-100 compatibility
  status:     MatchStatus;
  createdAt:  string;
};

export type SwipeAction = 'like' | 'pass' | 'super_like';

// ── Chat ──────────────────────────────────────
export type MessageType = 'text' | 'ai_suggestion' | 'system' | 'video_invite';

export type Message = {
  id:        string;
  matchId:   string;
  senderId:  string;
  content:   string;
  type:      MessageType;
  createdAt: string;
};

// ── Agents ────────────────────────────────────
export type AgentName =
  | 'MatchAgent'
  | 'PersonalityAgent'
  | 'ChatAgent'
  | 'AvatarAgent'
  | 'InsightAgent';

export type AgentEvent = {
  agent:      AgentName;
  type:       'start' | 'progress' | 'complete' | 'error';
  payload?:   Record<string, unknown>;
  timestamp:  string;
};

export type AgentResult<T = unknown> = {
  success:    boolean;
  data?:      T;
  error?:     string;
  agentName:  AgentName;
  durationMs: number;
};

// ── Match score breakdown ─────────────────────
export type CompatibilityReport = {
  totalScore:       number;
  personalityScore: number;
  skillsScore:      number;
  stageScore:       number;
  domainScore:      number;
  rolesScore:       number;
  summary:          string;
  strengths:        string[];
  risks:            string[];
};

// ── Video ─────────────────────────────────────
export type VideoRoom = {
  id:        string;
  matchId:   string;
  roomToken: string; // LiveKit token
  createdAt: string;
  expiresAt: string;
};

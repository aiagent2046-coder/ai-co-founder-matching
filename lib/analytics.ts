// lib/analytics.ts
import posthog from 'posthog-js';

// Базовые события
export const trackPageView = (page: string) => {
  posthog.capture(`page_view_${page}`);
};

// Идентификация пользователя (после логина)
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  posthog.identify(userId, properties);
};

// События воронки
export const trackTestStarted = () => {
  posthog.capture('personality_test_started');
};

export const trackTestCompleted = (bigFiveResults: {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}) => {
  posthog.capture('personality_test_completed', {
    openness: bigFiveResults.openness,
    conscientiousness: bigFiveResults.conscientiousness,
    extraversion: bigFiveResults.extraversion,
    agreeableness: bigFiveResults.agreeableness,
    neuroticism: bigFiveResults.neuroticism,
  });
};

export const trackMatchFound = (matchId: string, synergyScore: number) => {
  posthog.capture('match_found', {
    match_id: matchId,
    synergy_score: synergyScore,
  });
};

export const trackMessageSent = (recipientId: string) => {
  posthog.capture('message_sent', {
    recipient_id: recipientId,
  });
};

export const trackSwipeAction = (action: 'like' | 'pass', profileId: string) => {
  posthog.capture(`swipe_${action}`, {
    profile_id: profileId,
  });
};

export const trackAgentInteraction = (agentType: 'psychologist' | 'angel' | 'wingman') => {
  posthog.capture('agent_interaction', {
    agent_type: agentType,
  });
};

export const trackAvatarGenerated = (avatarId: string) => {
  posthog.capture('avatar_generated', {
    avatar_id: avatarId,
  });
};

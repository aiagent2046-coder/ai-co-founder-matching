# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the SyndiAI co-founder matching platform.

**What changed:**

- **`instrumentation-client.ts`** (new) — PostHog client-side initialization using the Next.js 15.3+ recommended pattern (replaces the useEffect-based init in PostHogProvider).
- **`components/PostHogProvider.tsx`** (updated) — Removed PostHog init; now a transparent pass-through so layout.tsx doesn't break.
- **`lib/posthog-server.ts`** (new) — Singleton `getPostHogClient()` for server-side event capture via `posthog-node`.
- **`next.config.ts`** (updated) — Added `/ingest/*` reverse proxy rewrites so PostHog requests route through the app domain (improves ad-blocker resistance and performance).
- **`.env.local`** (updated) — `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set to correct values.

Six new events were added on top of the four already tracked (`signup`, `swipe`, `mutual_match`, `message_sent`):

| Event | Description | File |
|---|---|---|
| `login` | User successfully logs in; triggers `posthog.identify()` to link the session to the Supabase user ID, then captures the event. | `app/login/page.tsx` |
| `onboarding_profile_completed` | Step 1 of onboarding completed (name, role, domain, skills). Properties: `role`, `domain`, `stage`, `skills_count`. | `app/(onboarding)/onboarding/profile/page.tsx` |
| `big_five_test_completed` | Big Five personality test completed and saved (step 2). Properties: all 5 OCEAN trait scores. | `components/onboarding/BigFiveTest.tsx` |
| `behavioral_profile_completed` | Behavioral questionnaire completed (step 3). Properties: `conflict_style`, `honesty_humility`. | `components/onboarding/BehavioralProfile.tsx` |
| `onboarding_completed` | Server-side event fired when `onboarding_done=true` is written to the database (step 4 complete). Distinct ID passed via `X-POSTHOG-DISTINCT-ID` header for cross-domain correlation. | `app/api/onboarding/complete/route.ts` |
| `avatar_suggestion_used` | User applies an AI-generated message suggestion in chat. Property: `match_id`. | `app/app/chat/[matchId]/page.tsx` |

## Next steps

We've built a dashboard and five insights to help you monitor user behavior:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/451304/dashboard/1686899)
- [Onboarding Funnel](https://us.posthog.com/project/451304/insights/zp0Vus75) — 5-step conversion from signup through full onboarding completion
- [Signups & Logins over time](https://us.posthog.com/project/451304/insights/4a0E787o) — Daily acquisition and return-user signal
- [Swipe to Mutual Match Funnel](https://us.posthog.com/project/451304/insights/brZEc4Nk) — Core engagement loop conversion rate
- [Message Engagement](https://us.posthog.com/project/451304/insights/ri5LKon3) — Messages sent vs AI suggestions used per day
- [Weekly Active Users](https://us.posthog.com/project/451304/insights/xxL1UJFU) — Overall product engagement health over 90 days

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

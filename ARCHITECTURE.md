

SyndiMatch is built as a modern, server-first application leveraging the Next.js 16 App Router. The architecture prioritizes security, low latency, and AI-native interactions.

## High-Level Diagram

```mermaid
graph TD
    User[User Browser] -->|HTTPS| Vercel[Vercel Edge / Next.js]
    Vercel -->|Middleware| AuthCheck{Session Valid?}
    AuthCheck -->|No| Login[/login]
    AuthCheck -->|Yes| AppPages[/app/* Server Components]
    
    AppPages -->|Fetch + JWT| API[Next.js API Routes]
    API -->|Anon Key + JWT| Supabase[(Supabase PostgreSQL + pgvector)]
    API -->|Service Role| SupabaseAdmin[(Supabase Admin - L2 Replies)]
    API -->|Async Background| Claude[Anthropic Claude API]
    API -->|Check Limit| Upstash[(Upstash Redis)]
    
    AppPages -->|Client Side| PostHog[PostHog Analytics]

Component Breakdown
1. Frontend (Next.js 16 App Router)

     Server Components: Used by default for profile views, dashboards, and SEO-critical pages. Fetch data directly from Supabase.
     Client Components: Isolated islands for interactivity (Chat UI, Onboarding wizards, Swiping deck).
     Proxy layer (proxy.ts): Implements the current edge/proxy logic for protected areas. It can perform lightweight routing and session-related checks, but ключевая аутентификация и авторизация всё равно выполняются внутри соответствующих API‑роутов (app/api/*). Документация исторически ссылалась на middleware.ts, но фактическая реализация опирается на proxy.ts как точку входа для edge‑логики, а не на классический Next.js middleware.

2. Database (Supabase & PostgreSQL)

     Schema Management: Version-controlled via supabase/migrations/0000_init.sql.
     Vector Search: Uses pgvector extension. User profiles are embedded into 1536-dimensional vectors. The match_founders RPC function performs cosine similarity search (<=>) filtered by onboarding_done = true.
     Row Level Security (RLS): Enabled on founder_profiles, matches, messages, and swipes. Policies ensure users can only read/write their own data and mutually shared data (e.g., messages in a match).

3. API & Security Layer

     Authentication: Supabase Auth. API routes extract the access_token from the Authorization: Bearer header.
     Supabase Clients: 
         User Client: Uses ANON_KEY + user JWT. Respects RLS. Used for reading profiles, sending messages, recording swipes.
         Admin Client: Uses SERVICE_ROLE_KEY. Bypasses RLS. Used strictly for system operations like generating L2 AI auto-replies or checking mutual match status.
     Rate Limiting: Upstash Redis sliding window. Prevents abuse on /api/messages, /api/swipe, and /api/auth/telegram.
     Validation: Zod schemas (lib/validation.ts) validate all incoming JSON payloads before touching the database.

4. AI Integration (Anthropic Claude)

     L2 Auto-Reply: When a user sends the first message in a new match, the API instantly returns 201 Created. The after() function (Next.js 16 feature) triggers a background task that fetches the recipient's AI Avatar identity, calls Claude API, and inserts the AI response into the database. The user receives the reply via polling.
     Avatar Essence: Profiles are enriched with AI-generated summaries based on their OCEAN scores and behavioral profiles.

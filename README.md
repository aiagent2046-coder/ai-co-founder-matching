<div align="center">

<img src="public/logo.png" alt="SyndiMatch" width="72" />

# SyndiMatch — AI-Native Co-Founder Matching

Status: In Private Beta · Next.js · Supabase · TypeScript · License: MIT

</div>

SyndiMatch — AI-платформа подбора сооснователей стартапов. Вместо поиска «похожих»
людей алгоритм ищет **комплементарные** связи: векторная семантика профилей +
психометрика (Big Five / OCEAN), матрица конфликтов (Thomas-Kilmann) и совместимость
намерений (Intent). Поверх продукта работает команда **AI-агентов** (HR / Engineer /
Marketing / PR / Legal) с потоковыми ответами и памятью.

> 📐 Подробное техническое описание — в [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🧠 Matching Engine

Подбор — двухуровневый (pgvector в БД + до-скоринг в TypeScript), переключается
параметром `engine` в `GET /api/discover/match`:

- **Vector Similarity** — pgvector, RPC `match_founders` (косинусная близость эмбеддингов).
- **OCEAN Complementarity** — комплементарность по 5 осям Big Five.
- **Behavioral Breakdown** — стили разрешения конфликтов (Thomas-Kilmann); под флагом `BEHAVIORAL_MATCH_ENABLED`.
- **Intent Compatibility** — совместимость намерений.
- **Soul-движок** (`engine=soul`) — дополнительно MBTI, Enneagram, стихии, биоритмы.

## 🛠 Tech Stack

- **Frontend:** Next.js 16 (App Router, Server Components), TypeScript (strict), Tailwind CSS.
- **Backend:** Next.js Route Handlers, Supabase (PostgreSQL, pgvector, Row Level Security).
- **Auth:** Supabase Auth (email/пароль, httpOnly-cookie) + Telegram WebApp (HMAC-SHA256).
- **AI / LLM:** Anthropic Claude — `sonnet-4-5` (агенты, чат-авто-ответы, аватар), `haiku-4-5` (генерация essence).
- **Embeddings:** Replicate `multilingual-e5-large` (1024-dim).
- **Infrastructure:** Vercel, Upstash Redis (rate limiting, fail-open), PostHog (analytics).
- **CI/CD:** GitHub Actions (type-check, Vitest, Build, Playwright).

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account & project
- Upstash Redis account
- Anthropic API key
- Replicate API key

### Installation

1. Clone the repo:

   ```bash
   git clone https://github.com/aiagent2046-coder/ai-co-founder-matching.git
   cd ai-co-founder-matching
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Setup environment variables — copy `.env.example` to `.env.local` and fill in your keys:

   ```bash
   cp .env.example .env.local
   ```

4. Setup database — выполните миграции из `supabase/migrations/` в Supabase SQL Editor
   (начиная с `0000_init.sql`): таблицы, индексы, RLS-политики и RPC `match_founders`.

5. Run the dev server:

   ```bash
   npm run dev
   ```

### Scripts

```bash
npm run dev        # дев-сервер
npm run build      # production-сборка
npm test           # Vitest (unit)
npm run test:e2e   # Playwright (chromium)
```

## 🔒 Security

- **Row Level Security (RLS):** включён на чувствительных таблицах. Большинство
  API-роутов работают на `SERVICE_ROLE_KEY` и проверяют владельца **вручную**
  (`supabase.auth.getUser(token)`); RLS — второй рубеж. На `ANON_KEY` (RLS активна)
  работают `matches/list`, `messages`, `swipe`.
- **Auth:** Supabase httpOnly-cookie + Telegram WebApp (валидация `initData` по HMAC-SHA256).
  Приватные страницы (`/app`, `/onboarding`) защищены на edge через `proxy.ts`
  (не классический `middleware.ts`); API-роуты проверяют владельца в хендлерах.
- **Rate Limiting:** Upstash Redis sliding window (fail-open) на чувствительных API.
- **Validation:** Zod-схемы на входящих телах запросов.
- **Anti-prompt-injection:** контекст и факты подаются агентам как данные, не как инструкции.

## 📄 License

Distributed under the MIT License. See [LICENSE](./LICENSE) for more information.

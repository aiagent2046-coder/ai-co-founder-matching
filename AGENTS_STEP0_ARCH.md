# Шаг 0 — карта архитектуры (факты из кода, для MVP-1 агентов)

> Изучено 27.06.2026. main @ 62b291b. Всё проверено грепом/чтением, не догадки.

## 1. Вызов LLM (сердце агентов)
- **Прямой `fetch` на `https://api.anthropic.com/v1/messages`** (НЕ AITunnel в проде — напрямую Anthropic).
- Заголовки: `x-api-key: process.env.ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`.
- Тело: `{ model, max_tokens, system: <systemPrompt>, messages: [{role,content}] }`.
- Модели: `claude-sonnet-4-5-20250929` (чат/suggest), `claude-haiku-4-5-20251001` (лёгкие, essence).
- Места: `app/api/messages/route.ts:197`, `app/api/avatar/suggest/route.ts:101`, `lib/avatar/essence.ts:73`.
- Есть `fetchWithTimeout` helper (essence.ts, avatar/suggest) — переиспользовать.

## 2. Компилятор системных промптов (ШАБЛОН для ролей агентов)
- `lib/avatar/identity.ts` → `buildSystemPrompt(id: AvatarIdentity, mode: 'suggest'|'autoreply')`.
- Берёт профиль → секции: ABOUT / VOICE(Big Five) / SKILLS / LOOKING FOR / GOALS / CRITICAL RULES / TASK.
- Жёсткие правила уже есть: «не выдумывай факты», «отвечай на языке пользователя», «будь конкретным».
- `AvatarIdentity` имеет **`autonomyLevel: 1|2|3`** — НЕ используется. Заготовка под проактивность (MVP-3).
- → Для агентов: сделать аналогичный `buildAgentPrompt(role, projectContext)` рядом, тем же паттерном.

## 3. Доступ к данным проекта (что агент будет «понимать»)
- Профиль: `/api/profile` (GET, cookie-сессия, whitelist полей после вчерашнего фикса).
- Матчи: `/api/matches/list` — отдаёт `{id, score, status, peer{name,role,domain}, lastMessage}`.
- Чтение чужих профилей — ТОЛЬКО на сервере через `SUPABASE_SERVICE_ROLE_KEY` (RLS ужесточена вчера).
- Профиль владельца — ANON + `.eq('user_id', user.id)`.

## 4. Фронт-паттерн (образец UI агентов)
- Auth: `getAuthToken()` из `lib/supabase.ts` → `Authorization: Bearer <token>`.
- `fetch('/api/...')`, состояние `useState`/`useEffect`, без стриминга (обычный JSON).
- Чат: `app/app/chat/[matchId]/page.tsx` (330 строк) — готовый образец чат-UI.
- Кнопка «AI suggestion» (стр 148) вызывает `/api/avatar/suggest` с `mode` → ПРОТОТИП агентского ответа.

## 5. Навигация — источник 404
- `app/app/layout.tsx:45` уже содержит `{ href: '/app/agents', label: 'Агенты', icon: ICONS.agents }`.
- Иконка `ICONS.agents` (стр 28) уже нарисована. → нужна только сама страница `app/app/agents/page.tsx`.

## 6. Инфраструктура (для фона/проактивности — MVP-2/3)
- **Upstash Redis** (`UPSTASH_REDIS_REST_*`) — сейчас rate-limit (`lib/rate-limit.ts`). Кандидат для очередей/состояния фоновых задач.
- **PostHog** (аналитика).
- Telegram bot (`TELEGRAM_BOT_TOKEN`) — канал для проактивных уведомлений (MVP-3?).
- Vercel — serverless (важно: нет долгоживущих процессов; фон = cron/Edge, не вечный воркер).

## Вывод для плана MVP-1
Переиспользуем ВСЁ: паттерн вызова Claude, шаблон buildSystemPrompt, доступ к данным, чат-UI, готовую навигацию.
MVP-1 = страница `/app/agents` (список 5 ролей) + чат с агентом (свой промпт на роль + контекст проекта)
через новый роут `/api/agents/chat`, по образцу avatar/suggest. Минимум нового кода.

# SyndiMatch — Architecture

Технический обзор реальной архитектуры проекта **по состоянию кода в `main`**.
Документ описывает то, что есть в репозитории, а не целевое/идеальное состояние.
Если код и этот документ расходятся — прав код, документ нужно обновить.

> Источник истины: `app/`, `lib/`, `supabase/migrations/`. Все утверждения ниже
> сверены с этими файлами.

---

## 1. Обзор

SyndiMatch — платформа подбора **комплементарных** сооснователей. Подбор строится
на семантической близости профилей (pgvector) и психометрике (Big Five, стили
конфликта по Thomas-Kilmann, намерения). Поверх основного продукта работает набор
**AI-агентов команды** (HR / Engineer / Marketing / PR / Legal) с потоковыми
ответами и памятью.

Монорепозиторий — единое Next.js-приложение (App Router): фронтенд и API
(Route Handlers) в одном проекте, деплой на Vercel, данные в Supabase.

---

## 2. Технологический стек

| Слой | Технологии |
|---|---|
| Frontend | Next.js 16 (App Router, RSC), React 18, TypeScript (strict), Tailwind CSS 3 |
| Backend | Next.js Route Handlers (`app/api/**`) |
| БД | Supabase PostgreSQL + `pgvector` (ivfflat), Row Level Security |
| Auth | Supabase Auth (email/пароль, httpOnly-cookie) + Telegram WebApp (HMAC-SHA256) |
| LLM | Anthropic Claude: `claude-sonnet-4-5` (агенты, чат-ответы, аватар), `claude-haiku-4-5` (генерация «essence») |
| Embeddings | Replicate `beautyyuyanli/multilingual-e5-large` (**1024-dim**, `normalize_embeddings: true`) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`, sliding window, **fail-open**) |
| Analytics | PostHog (`posthog-js` + `posthog-node`) |
| OG | `@vercel/og` (`app/opengraph-image.tsx`) |
| Hosting / CI | Vercel (prod `syndimatch.online`), GitHub Actions (type-check, Vitest, Build, Playwright) |

Версии зафиксированы в `package.json` (имя пакета: `syndi-ai-web`).

---

## 3. Структура каталогов

```
app/
  (onboarding)/onboarding/   профиль → big-five → behavioral → intent → avatar
  app/                        приватная зона: discover, matches, chat, profile, avatar, agents
  api/                        Route Handlers (см. §5)
  login/ register/ tg/        точки входа (email и Telegram WebApp)
  opengraph-image.tsx, robots.ts, sitemap.ts
proxy.ts   edge-guard: рефреш сессии + редирект гостей с /app и /onboarding на /login
lib/
  agents/    roles.ts, save-facts.ts      — роли агентов, парсинг/санитайз фактов
  avatar/    essence.ts, identity.ts      — Replicate embeddings + Claude essence
  soul-matrix.ts                          — MBTI/Enneagram/стихии/биоритмы (soul-движок)
  rate-limit.ts, validation.ts            — Upstash limiter, Zod-схемы
  supabase.ts, supabase-server.ts         — клиенты (browser / server-cookie)
  analytics.ts, posthog-server.ts
supabase/migrations/   0000_init … 0008_agent_messages
```

---

## 4. Модель данных (Supabase)

Таблицы (см. `supabase/migrations/`):

| Таблица | Назначение | Введена |
|---|---|---|
| `founder_profiles` | профиль основателя: `name, role, domain, bio, stage, skills, big_five, behavioral_profile, intent, birth_*`, `embedding`, `onboarding_done` | 0000 (+ 0001–0005 расширения) |
| `swipes` | действия like/pass (`from_user`, `to_user`) | 0000 |
| `matches` | взаимные лайки (`founder1_id`, `founder2_id`, `score`, `status`) | 0000 |
| `messages` | переписка в матче (`is_ai_reply`, `type`) | 0000 |
| `video_rooms` | видео-комнаты | 0000 |
| `avatar_interactions` | взаимодействия с AI-аватаром | 0000 |
| `agent_context` | факты о стартапе для агентов (`content`, `created_by`) | 0007 |
| `agent_messages` | история диалога с агентом (`agent_id`, `role`, `content`) | 0008 |

> ⚠️ Реальные имена колонок: `swipes.from_user/to_user`, `matches.founder1_id/founder2_id`,
> `messages.is_ai_reply`. Это важно — старые описания «по памяти» ошибочно
> использовали `profiles`, `user1_id/user2_id`, `is_ai_generated`.

### Индексы
- `idx_founder_profiles_embedding` — `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
  объявлен в `0000_init.sql`, но **в проде фактически отсутствует** (при текущем объёме
  профилей ANN-индекс не требуется — поиск идёт seq-scan'ом). Добавить отдельной
  миграцией при росте до тысяч профилей.
- **Индексы под FK** (Блок 2-3 техдолга): `messages_sender_id_idx` (`0011`),
  `matches_founder2_id_idx` / `messages_match_id_idx` / `video_rooms_match_id_idx` (`0012`).
  Закрыли линт `unindexed_foreign_keys`. (`matches.founder1_id` уже покрыт ведущей
  колонкой составного UNIQUE `(founder1_id, founder2_id)`.)

### RLS
- Включён на чувствительных таблицах. Политики ужесточались в `0006_tighten_founder_profiles_rls.sql`
  и далее для `agent_context` (0007) / `agent_messages` (0008): один SELECT по `auth.uid() = user_id`.
- **Консолидированы в `0012` (Блок 3 техдолга, см. §13):** по одной permissive-политике
  на каждую пару (таблица, действие); все вызовы `auth.uid()` обёрнуты в
  `(select auth.uid())` (init-plan, оценивается один раз на запрос, а не на строку).
  Нейминг: `founders_*`, `matches_select`, `messages_*`, `swipes_own_*`.
- `video_rooms` — RLS включён, политик нет (deny-all для anon/auth-ключа; доступ
  только service-role). Политику добавить вместе с реализацией видео-фичи (см. §12).
- **Важно про ключи:** большинство API-роутов работают на `SUPABASE_SERVICE_ROLE_KEY`
  (RLS обходится, авторизация проверяется **вручную** через `supabase.auth.getUser(token)`).
  На `ANON_KEY` (RLS активна) работают только `matches/list`, `messages`, `swipe`.
  То есть RLS — это второй рубеж; первичная проверка владельца происходит в коде роута.

---

## 5. API (Route Handlers)

| Группа | Роуты | Назначение |
|---|---|---|
| Auth | `auth/login`, `auth/logout`, `auth/register`, `auth/session`, `auth/token`, `auth/telegram` | email-сессии (cookie) + Telegram WebApp |
| Onboarding | `onboarding/profile`, `onboarding/bigfive`, `onboarding/behavioral`, `onboarding/intent`, `onboarding/complete` | пошаговое заполнение профиля |
| Profile | `profile` | чтение/обновление профиля |
| Embeddings | `embedding/recompute` | пересчёт вектора профиля (Replicate) |
| Discover | `discover/match` | подбор кандидатов (см. §6) |
| Swipe / Match | `swipe`, `matches/list` | лайк/пас, создание матча, список матчей |
| Messages | `messages` | переписка + AI auto-reply через `after()` |
| Avatar | `avatar/identity`, `avatar/suggest` | AI-аватар |
| Agents | `agents/chat`, `agents/history` | чат с агентами команды (стриминг) + история |
| Прочее | `health` | health-check |

---

## 6. Matching-движок

Подбор кандидатов — **двухуровневый**: pgvector в БД + до-скоринг в TypeScript.
Управляется query-параметром `engine` в `GET /api/discover/match`.

**Уровень 1 — pgvector (БД).** RPC `match_founders(query_embedding, match_count, exclude_user_id)`
делает ANN-поиск: `similarity = 1 - (embedding <=> query_embedding)`, фильтрует по
`onboarding_done = true` и `embedding IS NOT NULL`, сортирует по близости.
Это **чистый векторный поиск** — никакой OCEAN/intent-логики внутри SQL нет.

**Уровень 2 — до-скоринг (TypeScript, `app/api/discover/match/route.ts`).**
Кандидаты из RPC переоцениваются в коде:
- **Vector similarity** — из RPC.
- **OCEAN complementarity** (`oceanComplement`) — bell-curve вокруг ~40% разницы по осям Big Five.
- **Behavioral breakdown** (`behavioralBreakdown`) — честность + матрица конфликтов
  Thomas-Kilmann (`CONFLICT_MATRIX`); под флагом `BEHAVIORAL_MATCH_ENABLED`.
- **Intent compatibility** (`intentCompat`, `INTENT_MATRIX`) — совместимость намерений.

**Два движка:**
- `engine=psycho` (по умолчанию) — психометрический скоринг выше.
- `engine=soul` — добавляет `lib/soul-matrix.ts`: MBTI, Enneagram, стихии,
  биоритмы (по `birth_year/month/day`).

---

## 7. AI-интеграции

**Embeddings (`lib/avatar/essence.ts`).** `computeEmbedding()` → Replicate
`multilingual-e5-large`, ждёт прогноз поллингом, ожидает вектор длины **1024**
(`normalize_embeddings: true`). Текст для вектора — «essence», генерируемая Claude Haiku.

**LLM (Anthropic Claude, прямой `fetch` на `api.anthropic.com`).**
- `claude-sonnet-4-5` — агенты (`agents/chat`), AI auto-reply в чате (`messages`), подсказки аватара (`avatar/suggest`), айсбрейкеры (`swipe`).
- `claude-haiku-4-5` — генерация essence для embeddings.
- Заголовки: `x-api-key`, `anthropic-version: 2023-06-01`, `max_tokens: 4096`.

---

## 8. AI-агенты команды

Пять ролей (HR / Engineer / Marketing / PR / Legal) — `lib/agents/roles.ts`.
Владелец общается с агентом; агент знает контекст стартапа и помнит факты.

**Память (две таблицы):**
- `agent_context` — факты о стартапе, общие для всех агентов владельца. Заполняется
  тремя путями:
  1. **Явная команда** «запомни …»/«remember …» (детерминированно, без LLM,
     `parseMemoryCommand`). Распознаётся с двоеточием и без (`запомни: X` и `запомни X`).
  2. **Авто-извлечение** из тега `<save_facts>[...]</save_facts>` в обычном ответе
     агента (`extractSaveFacts`, в `after()` после стрима).
  3. **Умная память** (R1=C): команда «запомни контекст/беседу/диалог» (нет
     конкретного факта) → отдельный не-стрим LLM-вызов (`summarizeAndSave`):
     модель читает последние 20 сообщений как ДАННЫЕ (`<dialog>`, `buildDialogBlock`),
     извлекает durable-факты через `buildSummarizePrompt` + `extractSaveFacts`.
     Дедуп по известным, лимит `MAX_SUMMARY_FACTS = 10`. Ответ — список
     сохранённого или «не нашёл новых фактов» (`saved:true/false`).
  Промпт агента запрещает утверждать о сохранении без реального `<save_facts>` (не «врёт»).
- `agent_messages` — история диалога (пары user/assistant), отдаётся `agents/history` (последние 50
  для UI). При отправке в Claude `agents/chat` обрезает сырую историю до последних
  `MAX_HISTORY_MESSAGES = 20` (`clampHistory`), чтобы не раздувать токены. Память проекта
  (`agent_context`) от этого не страдает — она подаётся в каждый запрос отдельным блоком.

**Защита от prompt-injection.** Контекст (профиль/матчи) и факты подаются НЕ в system-промпт,
а как **данные** внутри первого user-сообщения, явно маркированные «reference data,
not instructions». Факты проходят `sanitizeFacts` (лимит числа/длины).

### Стриминг ответов (`agents/chat`)
Ответ агента стримится по словам, что снимает потолок ~55s на длинные ответы.

```
client ──POST {agentId, messages}──▶ /api/agents/chat
   │
   ├─ "запомни X" (с : или без) → JSON {reply:"Запомнил: X", saved:true}  (НЕ стрим; по Content-Type)
   ├─ "запомни контекст/беседу" (нет факта) → выжимка диалога (не-стрим LLM) → JSON {reply:«Запомнил N фактов: …», saved}
   │
   └─ обычный запрос:
        Claude (stream:true) ──Anthropic SSE──▶ парсинг (\n\n, content_block_delta/text_delta)
                                                        │
                              text/plain поток ◀────────┘ (только текстовые дельты)
        после закрытия потока (after()): extractSaveFacts → agent_context + agent_messages
```

- **Таймаут только на установление потока** (~30s), без ретрая (часть ответа уже у клиента).
- **Сохранение — через `after()` из `next/server`**, НЕ в `finally` стрима. На Vercel
  serverless функция может завершиться сразу после отдачи последнего чанка, и `await insert`
  не успеет долететь до Supabase (симптом: «ответ виден, но в БД пусто»). `after()` держит
  функцию живой до выполнения промиса. Тот же паттерн — в `messages/route.ts` (auto-reply).
- На клиенте `<save_facts>…` **скрывается** при отображении (служебный тег).

---

## 9. Auth

- **Email/пароль** — Supabase Auth, сессия в **httpOnly-cookie** (`auth/login`, `register`, `logout`).
- **Telegram WebApp** (`auth/telegram`) — валидация `initData` через HMAC-SHA256
  (`secretKey = HMAC('WebAppData', BOT_TOKEN)`), затем вход в Supabase под
  детерминированными `email = tg-<id>@syndi.local` и паролем `HMAC(SERVICE_ROLE_KEY, "tg-<id>")`.
- **Приватные страницы** (`/app/*`, `/onboarding/*`) защищены на edge через `proxy.ts`:
  он рефрешит сессию (`@supabase/ssr`, ANON_KEY) и редиректит гостей на `/login`.
  Это **не** классический `middleware.ts` — точка входа edge-логики называется `proxy.ts`
  (`config.matcher` исключает `api`, статику, `robots`/`sitemap`).
- **API-роуты** под `proxy` не попадают (matcher исключает `api`) — там авторизация
  выполняется **в самих хендлерах** (`supabase.auth.getUser(token)`).

---

## 10. Безопасность и устойчивость

- **RLS** на чувствительных таблицах (см. §4); первичная авторизация API — в коде роутов;
  приватные страницы — edge-guard `proxy.ts` (см. §9).
- **Rate limiting** (`lib/rate-limit.ts`) — Upstash sliding window. **Fail-open:** если Redis
  недоступен, запрос **пропускается** (инфраструктурный хиккап не роняет рабочие роуты).
  Напр. `agents-chat:<userId>` — 5 запросов / 60s.
- **Валидация** входных тел — Zod (`lib/validation.ts`).
- **Анти-prompt-injection** для агентов (см. §8).

---

## 11. Деплой и окружение

- **Vercel** (team `ai-co`), production — `syndimatch.online`. `maxDuration = 60` на тяжёлых роутах.
- **CI** (GitHub Actions): type-check + Vitest + Build (`ci.yml`), Playwright (`playwright.yml`) на каждый PR.
- **Тесты:** Vitest unit (`lib/__tests__/`), Playwright e2e (chromium).
- **Env (ключевые):** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `REPLICATE_API_KEY`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TELEGRAM_BOT_TOKEN`,
  PostHog-ключи, `BEHAVIORAL_MATCH_ENABLED`.

---

## 12. Известный тех-долг

- **Чат матчей — polling, а не Supabase Realtime (внешнее ограничение).** Прямой
  `wss://*.supabase.co` режется на сетевом уровне из РФ → WebSocket закрывается без
  close-фрейма (код 1006). Это не баг кода и не конфиг БД: на проде `messages` уже в
  публикации `supabase_realtime`, RLS-SELECT и replica identity корректны. REST уже
  проксируется через свой домен (`getAuthToken`/`/api/*`), но Next.js rewrites не
  проксируют WS. Polling оставлен сознательно (Путь A, см. §13). Альтернативы на будущее:
  SSE с своего домена или WS-релей на отдельном сервисе (не Vercel serverless).
- **ivfflat-индекс по `embedding` отсутствует в проде** (объявлен в `0000_init`, но никогда
  не создавался). При текущем объёме (~104 профиля) seq-scan мгновенен; добавить
  отдельной миграцией при росте до тысяч профилей.
- **Стрим-роуты слабо логируются** в `vercel logs` (учтено в `agents/chat`: ошибки
  пост-обработки теперь пишутся через `console.error`).
- **`vector` extension в схеме `public`** (Supabase security-линт `extension_in_public`,
  WARN). Перенос в отдельную схему потребует пересоздания vector-колонки/индексов
  и рискует сломать `match_founders`; оставлено как косметика.
- **`video_rooms` — RLS-on без политик** (security-линт `rls_enabled_no_policy`, INFO).
  Сознательный deny-all: фича видеозвонков в коде ещё не реализована (0 строк,
  нет обращений из `app/`/`lib/`). Добавить SELECT-политику (участники матча,
  по аналогии с `messages_select`) при реализации фичи.
- **Leaked-password protection отключен** (security-линт, WARN). Это настройка
  Auth-сервера (Dashboard → Authentication → Password / Management API), не миграция.
  Включить проверку по HaveIBeenPwned при выходе в публичный бета-доступ.
- **Auth DB connection strategy — абсолютная (10), не процентная** (perf-линт, INFO).
  Актуально только при увеличении размера инстанса.

## 13. Решённый тех-долг

- **NULL embeddings backfill (Блок 1).** Было 34 профиля с `embedding IS NULL`
  (не участвовали в матчинге, т.к. `match_founders` фильтрует `embedding IS NOT NULL`).
  Пересчитаны через `lib/avatar/essence.ts` (Claude → essence, Replicate e5-large →
  1024-dim). Остался 1 пустой черновик (без bio/skills — матчинг неприменим).
- **FK integrity (Блок 2, `0011`).** `messages.sender_id` → `founder_profiles`:
  `NO ACTION` → `ON DELETE CASCADE` + покрывающий индекс (0 сирот на момент
  применения). Остальные FK (`swipes_*` → auth.users, `messages_match_id`,
  `matches_founder1/2`) уже были CASCADE — изменений не потребовалось.
- **RLS consolidation (Блок 3, `0012`).** Убраны дублирующие permissive-политики
  (старые `"Users can..."` + новые) → по одной на (таблица, действие); все
  `auth.uid()` обёрнуты в `(select auth.uid())`. Добавлены индексы под FK.
  Семантика доступа сохранена 1:1 (сверено по `pg_policies` до/после).
  Performance-линты Supabase: **62 → 7** (устранены все WARN).
- **Function search_path (Блок 4, `0013`).** `set_updated_at` → `SET search_path = ''`,
  `match_founders` → `SET search_path = public` (тип `vector`/оператор `<=>` живут
  в расширении `vector` в схеме public). Тела функций 1:1. Security-линты: **5 → 3**
  (устранены оба `function_search_path_mutable`; остались только вынесенные в §12).

- **Polling чата оптимизирован (Путь A).** Вместо безусловного перезапроса всех
  сообщений каждые 5s: (1) `GET /api/messages` принимает необязательный `?after=<ISO
  created_at>` и отдаёт только сообщения новее (без параметра — всё, обратная
  совместимость); (2) клиент паузит опрос при скрытой вкладке (Page Visibility API) и
  делает мгновенный refetch при возврате; (3) инкрементальная подгрузка по последнему
  `created_at`, мёрж в стейт по `id` (дедуп оптимистичных/AI-сообщений). — `app/app/chat/[matchId]/page.tsx`, `app/api/messages/route.ts`.

- **Размерность embedding 1536 → 1024** (`0009_fix_embedding_dim.sql`). Исторически
  `0000_init.sql` объявлял `embedding VECTOR(1536)` (комментарий «для OpenAI»), но Replicate
  e5-large всегда отдавал **1024**. Прямая проверка прода (28.06.2026) показала, что
  колонка там уже `vector(1024)`, а сигнатура `match_founders` — `query_embedding vector`
  (без жёсткой размерности). Миграция `0009` привела локальную историю в соответствие
  с этим фактом (idempotent, прод не менялся). Чистая БД из миграций теперь
  поднимается консистентно с кодом.
- **Объём истории агентов в промпте** — сырая история диалога теперь обрезается
  на бэке до последних `MAX_HISTORY_MESSAGES = 20` (`clampHistory` в `lib/agents/roles.ts`).
  Долговременная память о проекте (`agent_context` → `<facts>`) подаётся отдельно
  и обрезкой не затрагивается — агент сохраняет понимание контекста независимо от
  длины переписки.
- **UI очистки истории/фактов агентов** — в шапке чата агента добавлены две кнопки:
  «Очистить диалог» (`DELETE /api/agents/history` — чистит `agent_messages` текущего
  агента по `user_id`+`agentId`) и «Очистить память» (`DELETE /api/agents/context` —
  чистит все факты `agent_context` владельца по `user_id`). Обе с `window.confirm`.
  Роуты используют SERVICE_ROLE_KEY + `getUser(token)` и явный фильтр по `user_id`
  (нельзя удалить чужие данные). — `app/app/agents/page.tsx`.

## 14. GitHub-интеграция engineer-агента (read-only, MVP)

engineer-агент (`lib/agents/roles.ts`) умеет читать и анализировать репозитории
пользователя на GitHub. Доступ строго **read-only**: запись, ветки, PR и merge
сознательно отложены до отдельной итерации (нужен GitHub App + явные write-сценарии).

**Мультитенантность.** Каждый пользователь подключает СВОЙ GitHub через OAuth App.
Токен агента одного пользователя никогда не виден другому — все инструменты берут
токен строго по `user_id` текущей сессии.

**Модель данных.** Таблица `github_connections` (`0010_github_connections.sql`):
`user_id` UNIQUE → `auth.users`, `encrypted_token`, `github_login`, `scopes`,
`created_at`/`updated_at`. RLS: SELECT только `auth.uid() = user_id`. Запись/чтение
токена идёт через SERVICE_ROLE (RLS обходится сервером осознанно).

**Шифрование токена** (`lib/github/crypto.ts`). AES-256-GCM, формат
`ivHex:cipherHex:tagHex`, ключ из env `TOKEN_ENC_KEY` (32 байта = 64 hex). В БД
хранится только шифротекст; наружу (в `/api/github/connection`) токен НИКОГДА не
отдаётся — только факт подключения и `github_login`.

**OAuth-флоу** (cookie-сессия через `getServerUser`, единый паттерн подсистемы):
- `GET /api/github/connect` — redirect на GitHub authorize, scope `read:user repo`,
  CSRF-state в httpOnly-cookie `gh_oauth_state` (10 мин).
- `GET /api/github/callback` — проверка state, обмен code→token, чтение
  `github_login`, шифрование и upsert (onConflict `user_id`), redirect на
  `/app/agents?github=connected|error`.
- `GET/DELETE /api/github/connection` — статус подключения / отключение (удаление записи).

**Read-слой** (`lib/github/client.ts`). Read-only REST поверх GitHub API:
`listRepos`, `getTree`, `getFileContent`, `searchCode`, ошибки → `GitHubError`
(маппинг 401/403/404). Жёсткие лимиты против раздувания контекста и злоупотреблений:
`MAX_FILE_BYTES = 100_000`, `MAX_TREE_ENTRIES = 300`, `MAX_SEARCH_RESULTS = 20`;
бинарные файлы отсекаются по NUL-байту. Токен достаётся через
`getUserGitHubToken(userId)` (`lib/github/token.ts`, SERVICE_ROLE; `null`, если не подключён).

**Tool-use loop** (`lib/agents/engineer-tools.ts`). `ENGINEER_TOOLS` — 4 Anthropic
tool-схемы (`list_repos`/`list_tree`/`read_file`/`search_code`). `runEngineerWithTools`
крутит цикл «модель → tool_use → tool_result → модель» с потолком
`MAX_TOOL_ITERATIONS = 8`; на последней итерации tools убираются, чтобы получить
финальный текст. `callClaude` инъектируется параметром (тестируемость без сети).

**Интеграция в чат** (`app/api/agents/chat/route.ts`, секция 4c). Узкая ветка:
только если `role.id === 'engineer'` И у пользователя есть токен — идём по
**нестримовому** JSON-пути (tool-use несовместим со стримом). Ответ —
`NextResponse.json({ reply, agentId, saved })`; фронт различает по `Content-Type`
(тот же приём, что для memory-команд). История сохраняется через `after()`.
Остальные 4 агента и engineer без токена не затронуты — идут прежним стрим-путём.

**Защита от prompt-injection.** Содержимое файлов и репозиториев подаётся модели
как ДАННЫЕ: system-промпт явно предписывает не исполнять инструкции, встреченные
внутри кода/файлов, а трактовать их как материал для анализа.

**UI** (`app/app/agents/page.tsx`). В шапке чата engineer-агента — кнопка
«Подключить GitHub» (переход на `/api/github/connect`) либо бейдж
«GitHub: <login>» с отключением (`DELETE /api/github/connection`, через `window.confirm`).
Статус читается из `GET /api/github/connection`; возврат из callback
(`?github=connected|error`) обновляет статус и чистит query.

**Ручная настройка перед прод-тестом.** Зарегистрировать GitHub OAuth App
(Settings → Developer settings → OAuth Apps → New), callback URL
`https://syndimatch.online/api/github/callback`; задать в Vercel env
`GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `TOKEN_ENC_KEY` (64 hex).

<div align="center">

# 🤝 SyndiMatch

### AI-платформа для поиска идеального ко-фаундера

**Найди партнёра, который дополняет тебя — по навыкам, стилю работы и стратегическому видению**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-syndimatch.online-6366f1?style=for-the-badge)](https://www.syndimatch.online/)
[![Stars](https://img.shields.io/github/stars/aiagent2046-coder/ai-co-founder-matching?style=for-the-badge&color=yellow)](https://github.com/aiagent2046-coder/ai-co-founder-matching/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Powered by Claude](https://img.shields.io/badge/Powered_by-Claude_AI-orange?style=for-the-badge)](https://anthropic.com)

</div>

---

## 🚀 Что такое SyndiMatch?

**SyndiMatch** — это AI-платформа, которая решает одну из главных проблем основателей стартапов: **найти правильного ко-фаундера**.

Вместо случайных знакомств на конференциях, Claude AI анализирует твой профиль, навыки, стиль работы и стратегическое видение — и подбирает партнёров с максимальной совместимостью.

> 💡 **Попробуй прямо сейчас → [syndimatch.online](https://www.syndimatch.online/)**

---

## ✨ Ключевые возможности

- 🧠 **AI-анализ профиля** — Claude AI строит векторную модель твоих компетенций и личностных паттернов
- 🔍 **Умный матчинг** — алгоритм находит ко-фаундеров, которые дополняют, а не дублируют тебя
- 💬 **Real-time коммуникация** — встроенный чат для первого контакта без внешних мессенджеров
- 🔐 **Безопасная аутентификация** — Supabase Auth с поддержкой OAuth
- ⚡ **Мгновенные рекомендации** — Upstash Redis обеспечивает отклик < 100ms

---

## 🛠 Технологический стек

| Слой | Технология | Назначение |
|------|-----------|-----------|
| Frontend | Next.js 16 (App Router) | SSR, routing, UI |
| Backend | Next.js API Routes / Server Actions | Бизнес-логика |
| База данных | Supabase (PostgreSQL) | Хранение профилей |
| Кеширование | Upstash Redis | Очереди, сессии |
| AI | Anthropic Claude | Матчинг и анализ |
| ML-модели | Replicate API | Дополнительные AI-сервисы |
| Деплой | Vercel | CI/CD, edge network |
| Аналитика | PostHog | Product analytics |

---

## 🏗 Архитектура

```
ai-co-founder-matching/
├── app/                  # Next.js App Router (pages, layouts, API routes)
├── components/           # React UI-компоненты
├── lib/                  # Утилиты, хелперы, AI-клиенты
├── syndi-agents/         # AI-агенты для матчинга
├── supabase/             # Миграции и конфигурация БД
└── public/               # Статические ресурсы
```

---

## ⚡ Быстрый старт

### Требования

- Node.js 18+
- Аккаунты: [Supabase](https://supabase.com), [Upstash](https://upstash.com), [Anthropic](https://anthropic.com)

### Установка

```bash
git clone https://github.com/aiagent2046-coder/ai-co-founder-matching.git
cd ai-co-founder-matching
npm install
```

### Настройка окружения

Создай `.env.local` в корне:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key
REPLICATE_API_KEY=your_replicate_api_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Запуск

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000) 🎉

---

## 🚢 Деплой на Vercel

```bash
# Один клик — проект уже содержит vercel.json
vercel --prod
```

Или через [Vercel Dashboard](https://vercel.com):
1. Import Git Repository → выбери этот репо
2. Добавь переменные окружения
3. Deploy → готово

---

## 🤝 Contributing

Вклад приветствуется! Особенно интересны:

- 🐛 Баг-репорты и фиксы
- 💡 Идеи по алгоритму матчинга
- 🌍 Локализация (EN/RU/других языков)
- ⚡ Оптимизации производительности

Открой [Issue](https://github.com/aiagent2046-coder/ai-co-founder-matching/issues) или отправь PR.

---

## 📄 Лицензия

MIT © [SyndiMatch](https://www.syndimatch.online/)

---

<div align="center">

**Если проект оказался полезным — поставь ⭐ звезду, это помогает другим найти его!**

[🌐 Демо](https://www.syndimatch.online/) · [🐛 Сообщить о баге](https://github.com/aiagent2046-coder/ai-co-founder-matching/issues) · [💡 Предложить фичу](https://github.com/aiagent2046-coder/ai-co-founder-matching/issues)

</div>

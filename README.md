# Проект

## Запуск

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Установите зависимости:
```bash
npm install
# или
yarn install
# или
pnpm install
```

3. Настройте переменные окружения (см. раздел ниже)

4. Запустите проект в режиме разработки:
```bash
npm run dev
# или
yarn dev
# или
pnpm dev
```

5. Откройте [http://localhost:3000](http://localhost:3000) в браузере

## Переменные окружения

Создайте файл `.env.local` в корне проекта и добавьте следующие переменные:

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

## Стек технологий

- **Next.js 16** - React-фреймворк для production
- **Supabase** - Backend-as-a-Service (база данных, аутентификация)
- **Upstash** - Serverless Redis для кеширования и очередей
- **Anthropic API** - AI-модели Claude
- **Replicate API** - ML-модели и AI-сервисы

## Архитектура

Проект построен на современном стеке с использованием:

- **Frontend**: Next.js 16 с App Router
- **Backend**: Next.js API Routes / Server Actions
- **База данных**: Supabase (PostgreSQL)
- **Кеширование**: Upstash Redis
- **AI интеграции**: Anthropic Claude, Replicate
- **Аутентификация**: Supabase Auth

### Структура проекта

```
.
├── app/              # Next.js App Router
├── components/       # React компоненты
├── lib/             # Утилиты и хелперы
├── public/          # Статические файлы
└── styles/          # Стили
```

## Деплой на Vercel

1. Подключите репозиторий к Vercel:
   - Перейдите на [vercel.com](https://vercel.com)
   - Нажмите "New Project"
   - Импортируйте ваш Git-репозиторий

2. Настройте переменные окружения в Vercel:
   - В настройках проекта перейдите в "Environment Variables"
   - Добавьте все переменные из раздела "Переменные окружения"

3. Деплой произойдет автоматически при каждом push в main/master ветку

4. Для production обновите `NEXT_PUBLIC_APP_URL` на ваш Vercel URL

### Рекомендации для production

- Используйте отдельные Supabase проекты для dev/staging/production
- Настройте Vercel Preview Deployments для тестирования
- Включите Vercel Analytics для мониторинга
- Настройте custom domain в Vercel

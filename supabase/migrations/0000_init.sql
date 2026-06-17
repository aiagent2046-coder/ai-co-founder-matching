-- =====================================================================
-- 0000_init.sql
-- Полная инициализация схемы БД для SyndiMatch
-- =====================================================================

-- 1. Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Таблицы

-- Профили фаундеров
CREATE TABLE IF NOT EXISTS public.founder_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT,
  role TEXT,
  bio TEXT,
  skills TEXT[],
  looking_for TEXT[],
  stage TEXT,
  domain TEXT,
  location TEXT,
  avatar_url TEXT,
  ai_avatar_url TEXT,
  ai_avatar_prompt TEXT,
  big_five JSONB,
  linkedin_url TEXT,
  github_url TEXT,
  onboarding_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  can_teach TEXT[],
  want_to_learn TEXT[],
  not_looking_for TEXT[],
  goals JSONB,
  autonomy_level SMALLINT,
  avatar_image_url TEXT,
  essence_text TEXT,
  embedding VECTOR(1536), -- Стандартный размер для OpenAI/text-embedding
  embedded_at TIMESTAMPTZ,
  telegram_id BIGINT,
  telegram_username TEXT,
  telegram_photo_url TEXT,
  behavioral_profile JSONB,
  intent TEXT,
  birth_month INTEGER,
  birth_day INTEGER,
  birth_year INTEGER CHECK (birth_year IS NULL OR (birth_year >= 1920 AND birth_year <= 2012)),
  is_partner BOOLEAN DEFAULT false
);

-- Свайпы
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_user, to_user)
);

-- Мэтчи
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder1_id UUID NOT NULL REFERENCES public.founder_profiles(id) ON DELETE CASCADE,
  founder2_id UUID NOT NULL REFERENCES public.founder_profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(founder1_id, founder2_id)
);

-- Сообщения
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.founder_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  is_ai_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Видеокомнаты
CREATE TABLE IF NOT EXISTS public.video_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  room_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Взаимодействия аватаров
CREATE TABLE IF NOT EXISTS public.avatar_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  summary TEXT,
  key_points TEXT[],
  next_actions TEXT[],
  sentiment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Индексы
CREATE INDEX IF NOT EXISTS idx_founder_profiles_embedding ON public.founder_profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_user_id ON public.founder_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_from_user ON public.swipes(from_user);
CREATE INDEX IF NOT EXISTS idx_swipes_to_user ON public.swipes(to_user);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);

-- 4. Row Level Security (RLS) - Базовая безопасность (Tier C2)
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.founder_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.founder_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile." ON public.founder_profiles FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their matches." ON public.matches FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.founder_profiles WHERE id = founder1_id)
  OR auth.uid() IN (SELECT user_id FROM public.founder_profiles WHERE id = founder2_id)
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their matches." ON public.messages FOR SELECT USING (
  match_id IN (
    SELECT m.id FROM public.matches m 
    JOIN public.founder_profiles p1 ON m.founder1_id = p1.id 
    JOIN public.founder_profiles p2 ON m.founder2_id = p2.id 
    WHERE p1.user_id = auth.uid() OR p2.user_id = auth.uid()
  )
);
CREATE POLICY "Users can send messages." ON public.messages FOR INSERT WITH CHECK (
  sender_id IN (SELECT id FROM public.founder_profiles WHERE user_id = auth.uid())
);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own swipes." ON public.swipes FOR SELECT USING (auth.uid() = from_user);
CREATE POLICY "Users can create swipes." ON public.swipes FOR INSERT WITH CHECK (auth.uid() = from_user);

-- 5. RPC Функция для матчинга (векторный поиск)
CREATE OR REPLACE FUNCTION public.match_founders(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  role TEXT,
  domain TEXT,
  bio TEXT,
  skills TEXT[],
  big_five JSONB,
  behavioral_profile JSONB,
  intent TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$   SELECT
    p.id,
    p.user_id,
    p.name,
    p.role,
    p.domain,
    p.bio,
    p.skills,
    p.big_five,
    p.behavioral_profile,
    p.intent,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.founder_profiles p
  WHERE p.user_id != exclude_user_id
    AND p.onboarding_done = true
    AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
 $$;
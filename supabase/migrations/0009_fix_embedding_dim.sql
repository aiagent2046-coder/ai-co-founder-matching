-- 0009_fix_embedding_dim.sql
-- Catch-up миграция: приводит схему в соответствие с фактическим продом.
--
-- Контекст (факты, проверенные прямым запросом к проду 28.06.2026):
--   * Колонка founder_profiles.embedding в проде = vector(1024), НЕ vector(1536),
--     как было ошибочно объявлено в 0000_init.sql (комментарий "для OpenAI").
--   * Реальный источник эмбеддингов — Replicate multilingual-e5-large (lib/avatar/essence.ts),
--     который производит ровно 1024-мерные векторы (код жёстко проверяет length === 1024).
--   * RPC match_founders в проде принимает query_embedding БЕЗ фиксированной размерности
--     (vector), а не vector(1536) — это работает с любой длиной, что нам и нужно.
--   * ivfflat-индекса по embedding в проде нет (при текущем объёме не требуется).
--
-- Эта миграция НЕ меняет прод (он уже корректен) — она синхронизирует историю
-- миграций, чтобы чистая БД (CI / staging / новый разработчик) поднималась
-- консистентно с кодом. Идемпотентна.

-- 1. Привести колонку к 1024 (no-op, если уже vector(1024)).
ALTER TABLE public.founder_profiles
  ALTER COLUMN embedding TYPE VECTOR(1024)
  USING embedding::VECTOR(1024);

-- 2. Пересоздать RPC с сигнатурой без жёсткой размерности (как в проде).
--    Тело идентично 0000_init.sql — меняется только тип параметра query_embedding.
CREATE OR REPLACE FUNCTION public.match_founders(
  query_embedding VECTOR,
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
AS $$
  SELECT
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

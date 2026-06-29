-- 0010: подключения GitHub для агента-инженера (MVP — read-only анализ репозитория)
--
-- Каждый владелец подключает свой GitHub через OAuth (мультитенант).
-- Токен хранится ЗАШИФРОВАННЫМ (AES-256-GCM, ключ в env TOKEN_ENC_KEY) — не plain-text.
-- Engineer-агент использует токен текущего user_id для чтения репозиториев через GitHub REST.
-- Один GitHub-аккаунт на владельца (UNIQUE user_id) — расширим при необходимости.
--
-- Стиль соответствует проекту: uuid_generate_v4(), REFERENCES auth.users, RLS auth.uid()=user_id.

CREATE TABLE IF NOT EXISTS public.github_connections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_token TEXT NOT NULL,                 -- AES-256-GCM: ivHex:cipherHex:tagHex
  github_login    TEXT,                          -- логин подключённого GitHub-аккаунта
  scopes          TEXT,                          -- запрошенные OAuth-scopes (напр. "read:user,repo")
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS github_connections_user_id_idx
  ON public.github_connections(user_id);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- Владелец видит только своё подключение. Запись/чтение токена идёт на сервере
-- через SERVICE_ROLE_KEY (обходит RLS); зашифрованный токен НЕ отдаётся клиенту.
CREATE POLICY "Users can view own github connection."
  ON public.github_connections
  FOR SELECT
  USING (auth.uid() = user_id);

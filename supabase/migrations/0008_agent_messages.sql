-- 0008: история диалога с агентами (1a — персист переписки между сессиями)
--
-- У каждого из 5 агентов своя ветка диалога на владельца (ключ user_id + agent_id).
-- Роут пишет пару (user + assistant) после ответа; фронт грузит историю при открытии чата.
--
-- Стиль соответствует проекту: uuid_generate_v4(), REFERENCES auth.users, RLS auth.uid()=user_id.

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id   TEXT NOT NULL,                 -- hr/engineer/marketing/pr/legal
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_messages_user_agent_idx
  ON public.agent_messages(user_id, agent_id, created_at);

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- Владелец видит только свою историю. Запись идёт на сервере через SERVICE_ROLE_KEY (обходит RLS).
CREATE POLICY "Users can view own agent messages."
  ON public.agent_messages
  FOR SELECT
  USING (auth.uid() = user_id);

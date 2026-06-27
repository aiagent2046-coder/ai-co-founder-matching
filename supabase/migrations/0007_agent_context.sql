-- 0007: контекст стартапа для агентов (MVP-2, вариант A)
--
-- Накопленные факты/решения о стартапе, ОБЩИЕ для всех 5 агентов одного владельца.
-- Заполняется явно пользователем (команда "запомни: ..." в чате агента).
-- Перед ответом любой агент подмешивает эти факты в системный промпт.
--
-- Стиль соответствует проекту: uuid_generate_v4(), REFERENCES auth.users, RLS auth.uid()=user_id.

CREATE TABLE IF NOT EXISTS public.agent_context (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_by TEXT,                          -- какой агент записал (hr/engineer/marketing/pr/legal)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_context_user_id_idx ON public.agent_context(user_id);

ALTER TABLE public.agent_context ENABLE ROW LEVEL SECURITY;

-- Владелец видит только свои факты. Запись идёт на сервере через SERVICE_ROLE_KEY (обходит RLS).
CREATE POLICY "Users can view own agent context."
  ON public.agent_context
  FOR SELECT
  USING (auth.uid() = user_id);

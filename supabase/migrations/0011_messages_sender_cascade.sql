-- 0011: messages.sender_id — каскадное удаление при удалении профиля-автора
--
-- Контекст (проверено по проду 2026-06-29):
--   messages.sender_id -> founder_profiles(id) был NO ACTION (блокировал удаление
--   профиля, если у него есть сообщения). Все 291 строк messages.sender_id ссылаются
--   на founder_profiles (0 орфанов), поэтому пересоздание FK безопасно.
--   swipes.from_user/to_user уже имеют FK -> auth.users ON DELETE CASCADE (не трогаем).
--
-- Решение: ON DELETE CASCADE — при удалении профиля удаляются его сообщения
--   (согласуется с уже существующими CASCADE на matches/messages.match_id).
--
-- Индекс на sender_id: линтер Supabase флагнул FK как unindexed; при CASCADE он нужен
--   для эффективного поиска зависимых строк.

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.founder_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messages_sender_id_idx
  ON public.messages(sender_id);

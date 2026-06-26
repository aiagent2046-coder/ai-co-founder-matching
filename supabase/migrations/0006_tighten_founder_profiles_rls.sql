-- 0006: ужесточение RLS на founder_profiles
--
-- Проблема: политика "Public profiles are viewable by everyone." (FOR SELECT USING (true))
-- разрешала ЛЮБОМУ залогиненному (ANON-ключ) читать ЧУЖИЕ профили целиком, включая
-- чувствительные поля: telegram_id, telegram_username, behavioral_profile, big_five,
-- embedding, birth_year/month/day.
--
-- Фикс: SELECT только своей строки (auth.uid() = user_id).
-- Чтение чужих профилей для матчинга/чата/свайпов уже идёт на сервере через
-- SERVICE_ROLE_KEY (обходит RLS): discover/match, matches/list, swipe, messages.
-- После этой миграции ANON-ключом чужие профили недоступны.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.founder_profiles;

CREATE POLICY "Users can view own profile."
  ON public.founder_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

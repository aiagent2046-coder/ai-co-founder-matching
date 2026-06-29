-- 0012_rls_consolidation.sql
-- Чистка RLS (Блок 3 техдолга): убираем дублирующиеся permissive-политики
-- и оборачиваем auth.uid() в (select auth.uid()) для устранения per-row
-- переоценки (auth_rls_initplan). Семантика доступа сохранена 1:1.
-- Все политики — на роль public (как и было в проде), без явного TO.

-- ============================================================
-- founder_profiles
-- ============================================================
-- SELECT: дубля не было, только старая "Users can view own profile."
DROP POLICY IF EXISTS "Users can view own profile." ON public.founder_profiles;
DROP POLICY IF EXISTS founders_select ON public.founder_profiles;
CREATE POLICY founders_select ON public.founder_profiles
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- INSERT: были дубли "Users can insert their own profile." + founders_insert
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.founder_profiles;
DROP POLICY IF EXISTS founders_insert ON public.founder_profiles;
CREATE POLICY founders_insert ON public.founder_profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE: были дубли "Users can update own profile." + founders_update
DROP POLICY IF EXISTS "Users can update own profile." ON public.founder_profiles;
DROP POLICY IF EXISTS founders_update ON public.founder_profiles;
CREATE POLICY founders_update ON public.founder_profiles
  FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- matches
-- ============================================================
-- SELECT: дубли "Users can view their matches." + matches_select
DROP POLICY IF EXISTS "Users can view their matches." ON public.matches;
DROP POLICY IF EXISTS matches_select ON public.matches;
CREATE POLICY matches_select ON public.matches
  FOR SELECT
  USING (
    (select auth.uid()) IN (
      SELECT founder_profiles.user_id
      FROM founder_profiles
      WHERE (founder_profiles.id = ANY (ARRAY[matches.founder1_id, matches.founder2_id]))
    )
  );

-- ============================================================
-- messages
-- ============================================================
-- SELECT: дубли "Users can view messages in their matches." + messages_select
DROP POLICY IF EXISTS "Users can view messages in their matches." ON public.messages;
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM matches m
      WHERE (
        (m.id = messages.match_id)
        AND ((select auth.uid()) IN (
          SELECT founder_profiles.user_id
          FROM founder_profiles
          WHERE (founder_profiles.id = ANY (ARRAY[m.founder1_id, m.founder2_id]))
        ))
      )
    )
  );

-- INSERT: дубли "Users can send messages." + messages_insert
DROP POLICY IF EXISTS "Users can send messages." ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = (
      SELECT founder_profiles.user_id
      FROM founder_profiles
      WHERE (founder_profiles.id = messages.sender_id)
    )
  );

-- ============================================================
-- swipes
-- ============================================================
-- SELECT: дубли "Users can view their own swipes." + swipes_own_select
DROP POLICY IF EXISTS "Users can view their own swipes." ON public.swipes;
DROP POLICY IF EXISTS swipes_own_select ON public.swipes;
CREATE POLICY swipes_own_select ON public.swipes
  FOR SELECT
  USING ((select auth.uid()) = from_user);

-- INSERT: дубли "Users can create swipes." + swipes_own_insert
DROP POLICY IF EXISTS "Users can create swipes." ON public.swipes;
DROP POLICY IF EXISTS swipes_own_insert ON public.swipes;
CREATE POLICY swipes_own_insert ON public.swipes
  FOR INSERT
  WITH CHECK ((select auth.uid()) = from_user);

-- ============================================================
-- Одиночные политики (дублей нет) — только обёртка auth.uid()
-- ============================================================
DROP POLICY IF EXISTS "Users can view own agent context." ON public.agent_context;
CREATE POLICY "Users can view own agent context." ON public.agent_context
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own agent messages." ON public.agent_messages;
CREATE POLICY "Users can view own agent messages." ON public.agent_messages
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own github connection." ON public.github_connections;
CREATE POLICY "Users can view own github connection." ON public.github_connections
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users see own interactions" ON public.avatar_interactions;
CREATE POLICY "users see own interactions" ON public.avatar_interactions
  FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users insert own interactions" ON public.avatar_interactions;
CREATE POLICY "users insert own interactions" ON public.avatar_interactions
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- Индексы под неиндексированные FK (unindexed_foreign_keys)
-- messages_sender_id уже проиндексирован в 0011.
-- ============================================================
CREATE INDEX IF NOT EXISTS matches_founder2_id_idx
  ON public.matches(founder2_id);
CREATE INDEX IF NOT EXISTS messages_match_id_idx
  ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS video_rooms_match_id_idx
  ON public.video_rooms(match_id);

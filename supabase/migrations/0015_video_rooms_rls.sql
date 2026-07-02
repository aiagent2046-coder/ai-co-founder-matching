-- 0015_video_rooms_rls.sql
-- Закрываем video_rooms политикой RLS (N1 техдолга).
-- Таблица создана в 0000_init, индекс добавлен в 0012, но RLS не включался —
-- строки были доступны любому анон/user-клиенту. Запись в таблицу идёт только
-- service_role (app/api/video/room/route.ts, обходит RLS), поэтому клиентам
-- нужен лишь SELECT собственных комнат. INSERT/UPDATE/DELETE-политик нет —
-- их отсутствие корректно блокирует запись с клиента.
-- Паттерн доступа и обёртка (select auth.uid()) — как в messages_select (0012).

ALTER TABLE public.video_rooms ENABLE ROW LEVEL SECURITY;

-- SELECT: пользователь видит комнату, если он участник соответствующего мэтча.
DROP POLICY IF EXISTS video_rooms_select ON public.video_rooms;
CREATE POLICY video_rooms_select ON public.video_rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM matches m
      WHERE (
        (m.id = video_rooms.match_id)
        AND ((select auth.uid()) IN (
          SELECT founder_profiles.user_id
          FROM founder_profiles
          WHERE (founder_profiles.id = ANY (ARRAY[m.founder1_id, m.founder2_id]))
        ))
      )
    )
  );

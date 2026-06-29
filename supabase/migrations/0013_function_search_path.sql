-- 0013_function_search_path.sql
-- Security (Блок 4): фиксируем search_path для функций, чтобы устранить
-- function_search_path_mutable (WARN). Тела функций сохранены 1:1.
-- search_path = '' => все объекты обращаются по полному имени схемы.

-- Триггерная функция: тела с таблицами нет, достаточно зафиксировать search_path.
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Векторный матчинг: читает только public.founder_profiles (уже квалифицировано).
-- search_path = public (а не ''), т.к. тип vector и оператор <=> живут
-- в расширении vector, установленном в схему public.
CREATE OR REPLACE FUNCTION public.match_founders(
  query_embedding vector,
  match_count integer DEFAULT 10,
  exclude_user_id uuid DEFAULT NULL::uuid
)
  RETURNS TABLE(
    id uuid, user_id uuid, name text, role text, domain text, bio text,
    skills text[], big_five jsonb, behavioral_profile jsonb, intent text,
    similarity double precision
  )
  LANGUAGE sql
  STABLE
  SET search_path = public
AS $function$
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
$function$;

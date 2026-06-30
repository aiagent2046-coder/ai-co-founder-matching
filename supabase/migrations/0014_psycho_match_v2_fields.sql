-- 0014_psycho_match_v2_fields.sql
-- Psycho-Match v2 (Р3): новые поля профиля для расширенного скоринга.
-- Все nullable, без дефолтов — существующие 104 профиля не ломаются,
-- скоринг деградирует на нейтральные значения при отсутствии данных.
-- Поля заполняются через онбординг (work-style/tz) и опрос HEXACO.

-- IANA time zone, напр. 'Europe/Moscow'. Автодетект из браузера + подтверждение.
ALTER TABLE public.founder_profiles
  ADD COLUMN IF NOT EXISTS time_zone text;

-- Стиль работы: { pace, structure, communication, risk } — каждый 0..100.
ALTER TABLE public.founder_profiles
  ADD COLUMN IF NOT EXISTS work_style jsonb;

-- HEXACO (гибрид): { domains: {H,E,X,A,C,O}, facets: {fairness,diligence,flexibility} }.
ALTER TABLE public.founder_profiles
  ADD COLUMN IF NOT EXISTS hexaco jsonb;

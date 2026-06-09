-- Снять NOT NULL с пользовательских колонок профиля.
-- Причина: онбординг идёт пошагово (intent → profile → big-five → behavioral → avatar);
-- на шаге intent существует только user_id + intent. Гарантию завершённости профиля
-- даёт флаг onboarding_done=true (discover фильтрует по нему).
alter table public.founder_profiles alter column name   drop not null;
alter table public.founder_profiles alter column role   drop not null;
alter table public.founder_profiles alter column domain drop not null;
alter table public.founder_profiles alter column stage  drop not null;
notify pgrst, 'reload schema';

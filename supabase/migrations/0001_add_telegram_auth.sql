alter table public.founder_profiles
  add column if not exists telegram_id        bigint,
  add column if not exists telegram_username  text,
  add column if not exists telegram_photo_url text;

create unique index if not exists founder_profiles_telegram_id_unique
  on public.founder_profiles(telegram_id) where telegram_id is not null;

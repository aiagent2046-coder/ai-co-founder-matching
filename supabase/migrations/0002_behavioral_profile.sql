alter table public.founder_profiles
  add column if not exists behavioral_profile jsonb;

create index if not exists idx_founder_profiles_behavioral
  on public.founder_profiles using gin (behavioral_profile);

-- Intent сегментация (что юзер предлагает) + дата рождения для биоритмов
alter table public.founder_profiles 
  add column if not exists intent text 
  check (intent in ('has_idea', 'looking_to_join', 'flexible'));

alter table public.founder_profiles 
  add column if not exists birth_month int 
  check (birth_month between 1 and 12);

alter table public.founder_profiles 
  add column if not exists birth_day int 
  check (birth_day between 1 and 31);

update public.founder_profiles set intent = 'has_idea' where intent is null;
notify pgrst, 'reload schema';

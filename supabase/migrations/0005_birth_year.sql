-- Год рождения для честного расчёта биоритмов в Матрице души.
alter table public.founder_profiles 
  add column if not exists birth_year int 
  check (birth_year between 1920 and 2012);
notify pgrst, 'reload schema';

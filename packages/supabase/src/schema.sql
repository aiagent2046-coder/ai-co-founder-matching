-- ─────────────────────────────────────────────
--  SyndiAI — Supabase schema
--  Run in Supabase SQL editor
-- ─────────────────────────────────────────────

-- Extensions
create extension if not exists "uuid-ossp";

-- ── founder_profiles ──────────────────────────
create table public.founder_profiles (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null unique,
  name             text not null,
  role             text not null,
  bio              text default '',
  skills           text[] default '{}',
  looking_for      text[] default '{}',
  stage            text not null default 'idea',
  domain           text not null default 'Other',
  location         text default '',
  avatar_url       text,
  ai_avatar_url    text,
  ai_avatar_prompt text,
  big_five         jsonb,
  linkedin_url     text,
  github_url       text,
  onboarding_done  boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.founder_profiles enable row level security;

create policy "founders_select" on public.founder_profiles for select using (true);
create policy "founders_insert" on public.founder_profiles for insert with check (auth.uid() = user_id);
create policy "founders_update" on public.founder_profiles for update using (auth.uid() = user_id);

-- ── matches ───────────────────────────────────
create table public.matches (
  id          uuid primary key default uuid_generate_v4(),
  founder1_id uuid references public.founder_profiles(id) on delete cascade not null,
  founder2_id uuid references public.founder_profiles(id) on delete cascade not null,
  score       integer not null default 0 check (score >= 0 and score <= 100),
  status      text not null default 'pending' check (status in ('pending','matched','rejected')),
  created_at  timestamptz default now(),
  unique(founder1_id, founder2_id)
);

alter table public.matches enable row level security;

create policy "matches_select" on public.matches for select
  using (
    auth.uid() in (
      select user_id from public.founder_profiles where id in (founder1_id, founder2_id)
    )
  );

-- ── messages ──────────────────────────────────
create table public.messages (
  id         uuid primary key default uuid_generate_v4(),
  match_id   uuid references public.matches(id) on delete cascade not null,
  sender_id  uuid references public.founder_profiles(id) not null,
  content    text not null,
  type       text not null default 'text' check (type in ('text','ai_suggestion','system','video_invite')),
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "messages_select" on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and auth.uid() in (
        select user_id from public.founder_profiles where id in (m.founder1_id, m.founder2_id)
      )
    )
  );

create policy "messages_insert" on public.messages for insert
  with check (
    auth.uid() = (select user_id from public.founder_profiles where id = sender_id)
  );

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;

-- ── video_rooms ───────────────────────────────
create table public.video_rooms (
  id          uuid primary key default uuid_generate_v4(),
  match_id    uuid references public.matches(id) on delete cascade not null,
  room_token  text not null,
  created_at  timestamptz default now(),
  expires_at  timestamptz not null
);

alter table public.video_rooms enable row level security;

-- ── updated_at trigger ────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.founder_profiles
  for each row execute function public.set_updated_at();

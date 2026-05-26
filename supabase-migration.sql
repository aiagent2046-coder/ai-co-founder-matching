-- Phase A: Avatar Identity fields
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS can_teach        text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS want_to_learn    text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS not_looking_for  text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS goals            jsonb    DEFAULT '{"timeline":"3-months","commitment":"full-time","seeking":["co-founder"]}'::jsonb,
  ADD COLUMN IF NOT EXISTS autonomy_level   smallint DEFAULT 1 CHECK (autonomy_level IN (1,2,3)),
  ADD COLUMN IF NOT EXISTS avatar_image_url text;

-- New table: avatar_interactions (memory for L2/L3)
CREATE TABLE IF NOT EXISTS avatar_interactions (
  id          uuid primary key DEFAULT gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  match_id    uuid not null,
  summary     text,
  key_points  text[]   DEFAULT '{}',
  next_actions text[]  DEFAULT '{}',
  sentiment   text CHECK (sentiment IN ('positive','neutral','concerned')),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avatar_interactions_user ON avatar_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_avatar_interactions_match ON avatar_interactions(match_id);

ALTER TABLE avatar_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own interactions"
  ON avatar_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own interactions"
  ON avatar_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

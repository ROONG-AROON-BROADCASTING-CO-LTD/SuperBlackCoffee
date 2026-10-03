ALTER TABLE users
  ADD COLUMN IF NOT EXISTS day_off_policy TEXT NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS day_off_source_branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS weekly_days_off SMALLINT[] NOT NULL DEFAULT ARRAY[]::SMALLINT[],
  ADD COLUMN IF NOT EXISTS custom_days_off DATE[] NOT NULL DEFAULT ARRAY[]::DATE[];

UPDATE users
SET day_off_source_branch_id = branch_id
WHERE day_off_source_branch_id IS NULL
  AND branch_id IS NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_day_off_policy_valid;
ALTER TABLE users
  ADD CONSTRAINT users_day_off_policy_valid
  CHECK (day_off_policy IN ('automatic', 'home_branch', 'work_branch', 'custom'));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_weekly_days_off_valid;
ALTER TABLE users
  ADD CONSTRAINT users_weekly_days_off_valid
  CHECK (weekly_days_off <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[]);

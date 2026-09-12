ALTER TABLE users
  ADD COLUMN IF NOT EXISTS default_second_shift_days INTEGER[] NOT NULL DEFAULT '{}';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_default_second_shift_days_check;

ALTER TABLE users
  ADD CONSTRAINT users_default_second_shift_days_check
  CHECK (default_second_shift_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]);

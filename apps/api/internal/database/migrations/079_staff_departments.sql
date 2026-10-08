ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'cafe';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_department_check;

ALTER TABLE users
  ADD CONSTRAINT users_department_check
  CHECK (department IN ('cafe', 'postal'));

CREATE INDEX IF NOT EXISTS users_branch_department_idx
  ON users (branch_id, department)
  WHERE role IN ('cashier', 'branch_manager');

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT '';

UPDATE users
SET job_title = CASE role
  WHEN 'branch_manager' THEN 'ผู้จัดการสาขา'
  WHEN 'cashier' THEN 'แคชเชียร์'
  ELSE job_title
END
WHERE job_title = '';

ALTER TABLE staff_leave_requests
  ADD COLUMN IF NOT EXISTS approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS staff_leave_requests_status_date_idx
  ON staff_leave_requests(status, leave_date DESC);

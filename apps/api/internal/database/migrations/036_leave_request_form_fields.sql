ALTER TABLE staff_leave_requests
  ADD COLUMN IF NOT EXISTS leave_end_date DATE,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS additional_details TEXT NOT NULL DEFAULT '';

UPDATE staff_leave_requests
SET leave_end_date = leave_date
WHERE leave_end_date IS NULL;

ALTER TABLE staff_leave_requests
  DROP CONSTRAINT IF EXISTS staff_leave_requests_leave_type_check;

ALTER TABLE staff_leave_requests
  ADD CONSTRAINT staff_leave_requests_leave_type_check
  CHECK (leave_type IN ('sick', 'personal', 'vacation', 'other'));

ALTER TABLE staff_leave_requests
  ADD CONSTRAINT staff_leave_requests_date_range_check
  CHECK (leave_end_date IS NULL OR leave_end_date >= leave_date);

CREATE INDEX IF NOT EXISTS staff_leave_requests_user_range_idx
  ON staff_leave_requests(user_id, leave_date, leave_end_date);

ALTER TABLE staff_shifts
  ADD COLUMN IF NOT EXISTS is_time_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS staff_shifts_time_override_idx
  ON staff_shifts (branch_id, shift_date)
  WHERE is_time_override;

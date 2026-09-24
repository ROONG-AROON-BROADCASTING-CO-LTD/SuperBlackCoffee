ALTER TABLE staff_attendance
  ADD COLUMN IF NOT EXISTS check_in_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_accuracy_m DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_accuracy_m DOUBLE PRECISION;

ALTER TABLE staff_attendance
  ADD CONSTRAINT staff_attendance_check_in_location_pair
    CHECK ((check_in_latitude IS NULL) = (check_in_longitude IS NULL)),
  ADD CONSTRAINT staff_attendance_check_out_location_pair
    CHECK ((check_out_latitude IS NULL) = (check_out_longitude IS NULL)),
  ADD CONSTRAINT staff_attendance_check_in_accuracy_positive
    CHECK (check_in_accuracy_m IS NULL OR check_in_accuracy_m >= 0),
  ADD CONSTRAINT staff_attendance_check_out_accuracy_positive
    CHECK (check_out_accuracy_m IS NULL OR check_out_accuracy_m >= 0);

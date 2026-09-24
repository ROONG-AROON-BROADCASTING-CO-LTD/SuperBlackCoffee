ALTER TABLE branches
  ADD COLUMN address TEXT NOT NULL DEFAULT '',
  ADD COLUMN opens_at TIME,
  ADD COLUMN closes_at TIME,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION,
  ADD COLUMN attendance_radius_m INTEGER NOT NULL DEFAULT 100;

ALTER TABLE branches
  ADD CONSTRAINT branches_latitude_range CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT branches_longitude_range CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT branches_location_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
  ADD CONSTRAINT branches_attendance_radius_range CHECK (attendance_radius_m BETWEEN 25 AND 1000);

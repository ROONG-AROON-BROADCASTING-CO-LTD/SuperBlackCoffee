ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS work_days SMALLINT[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5]::SMALLINT[];

ALTER TABLE branches
  ADD CONSTRAINT branches_work_days_valid
  CHECK (
    cardinality(work_days) > 0
    AND work_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::SMALLINT[]
  );

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE INDEX IF NOT EXISTS inventory_items_branch_expiry_date_idx
  ON inventory_items (branch_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

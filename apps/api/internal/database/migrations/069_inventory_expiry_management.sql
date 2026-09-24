-- Fresh lots retain their manufacturing date separately from the receiving date.
-- The alert window belongs to a branch because shelf-life policy can vary by store.
ALTER TABLE fresh_inventory_lots
  ADD COLUMN IF NOT EXISTS manufactured_at DATE;

UPDATE fresh_inventory_lots
SET manufactured_at = received_at
WHERE manufactured_at IS NULL;

ALTER TABLE fresh_inventory_lots
  ALTER COLUMN manufactured_at SET NOT NULL;

ALTER TABLE fresh_inventory_lots
  DROP CONSTRAINT IF EXISTS fresh_inventory_lots_manufactured_before_expiry;

ALTER TABLE fresh_inventory_lots
  ADD CONSTRAINT fresh_inventory_lots_manufactured_before_expiry
  CHECK (manufactured_at <= expiry_date);

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS expiry_warning_days INTEGER NOT NULL DEFAULT 60;

ALTER TABLE branches
  DROP CONSTRAINT IF EXISTS branches_expiry_warning_days_range;

ALTER TABLE branches
  ADD CONSTRAINT branches_expiry_warning_days_range
  CHECK (expiry_warning_days BETWEEN 1 AND 365);

CREATE INDEX IF NOT EXISTS fresh_inventory_lots_expiry_alert_idx
  ON fresh_inventory_lots(branch_id, expiry_date, inventory_item_id)
  WHERE status = 'active' AND quantity_remaining > 0;

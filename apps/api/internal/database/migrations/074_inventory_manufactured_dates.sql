ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS manufactured_at DATE;

ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_manufactured_before_expiry;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_manufactured_before_expiry
  CHECK (
    manufactured_at IS NULL
    OR expiry_date IS NULL
    OR manufactured_at <= expiry_date
  );

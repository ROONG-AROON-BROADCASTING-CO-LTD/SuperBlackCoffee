ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS stock_category TEXT;

UPDATE inventory_items
SET stock_category = 'drink_equipment'
WHERE kind = 'stock' AND stock_category IS NULL;

ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_stock_category_check;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_stock_category_check
  CHECK (
    stock_category IS NULL
    OR stock_category IN ('drink_equipment', 'postal_equipment')
  );

CREATE INDEX IF NOT EXISTS inventory_items_branch_stock_category_idx
  ON inventory_items (branch_id, stock_category, name)
  WHERE kind = 'stock';

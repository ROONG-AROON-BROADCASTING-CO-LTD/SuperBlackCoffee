-- Process water is a recipe cost, not a measurable on-hand inventory balance.
ALTER TABLE inventory_catalog_items
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT true;

UPDATE inventory_catalog_items
SET track_stock = false,
    updated_at = now()
WHERE name IN (
  'น้ำร้อน',
  'น้ำร้อนชงชาเขียว',
  'น้ำร้อนชงมัทฉะ',
  'น้ำร้อนชงโกโก้',
  'น้ำร้อนสกัดชา',
  'น้ำสกัดกาแฟ',
  'น้ำสกัดชา'
);

-- These legacy balances no longer participate in stock counting, alerts, or
-- recipe deduction. Their unit cost remains on the shared catalogue and is
-- still included in recipe costing.
UPDATE inventory_items AS item
SET quantity = 0,
    reorder_level = 0,
    expiry_date = NULL,
    updated_at = now()
FROM inventory_catalog_items AS catalog
WHERE item.catalog_item_id = catalog.id
  AND catalog.track_stock = false;

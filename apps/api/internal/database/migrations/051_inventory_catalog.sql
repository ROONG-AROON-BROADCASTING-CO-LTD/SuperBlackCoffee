-- Canonical definitions are shared by every SBC and franchise branch.
-- inventory_items continues to store only branch-specific stock state and keeps
-- legacy display columns temporarily for backwards-compatible raw SQL clients.
CREATE TABLE IF NOT EXISTS inventory_catalog_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'other',
  stock_category TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('ingredient', 'stock')),
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS catalog_item_id BIGINT;

INSERT INTO inventory_catalog_items(name, category, stock_category, kind, unit, unit_cost, image_url)
SELECT DISTINCT ON (name)
  name, category, stock_category, kind, unit, unit_cost, image_url
FROM inventory_items
ORDER BY name, updated_at DESC, id DESC
ON CONFLICT (name) DO NOTHING;

UPDATE inventory_items item
SET catalog_item_id = catalog.id
FROM inventory_catalog_items catalog
WHERE item.catalog_item_id IS NULL
  AND catalog.name = item.name;

DO $$ BEGIN
  ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_catalog_item_fk
    FOREIGN KEY (catalog_item_id) REFERENCES inventory_catalog_items(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS inventory_items_branch_catalog_item_idx
  ON inventory_items(branch_id, catalog_item_id);

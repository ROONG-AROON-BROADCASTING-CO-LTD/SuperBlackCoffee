-- Central catalogue templates keep standard commercial data separate from
-- each branch's physical stock.  A branch gets one template based on its
-- ownership (SBC or franchise) and size (S/M/L), while quantities, lots,
-- expiry dates, stock movements and orders remain branch-owned records.
CREATE TABLE IF NOT EXISTS catalog_templates (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('sbc', 'franchise')),
  branch_size TEXT NOT NULL CHECK (branch_size IN ('S', 'M', 'L')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, branch_size)
);

-- These rows are template-specific snapshots.  The catalogue item is the
-- stable identity, but pricing, category and alert defaults can differ by
-- template without changing a branch's physical inventory state.
CREATE TABLE IF NOT EXISTS catalog_template_inventory_items (
  template_id BIGINT NOT NULL REFERENCES catalog_templates(id) ON DELETE CASCADE,
  catalog_item_id BIGINT NOT NULL REFERENCES inventory_catalog_items(id) ON DELETE RESTRICT,
  category TEXT NOT NULL DEFAULT 'other',
  stock_category TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('ingredient', 'stock')),
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  reorder_level NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  track_stock BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, catalog_item_id),
  CHECK (stock_category IS NULL OR stock_category IN ('drink_equipment', 'postal_equipment'))
);

CREATE TABLE IF NOT EXISTS catalog_template_menu_items (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES catalog_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  store_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (store_price >= 0),
  store_price_available BOOLEAN NOT NULL DEFAULT true,
  lineman_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (lineman_price >= 0),
  lineman_price_available BOOLEAN NOT NULL DEFAULT true,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  lineman_cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (lineman_cost_price >= 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'soldout')),
  image_url TEXT NOT NULL DEFAULT '',
  preparation_steps TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, name)
);

CREATE TABLE IF NOT EXISTS catalog_template_menu_ingredients (
  template_menu_item_id BIGINT NOT NULL REFERENCES catalog_template_menu_items(id) ON DELETE CASCADE,
  catalog_item_id BIGINT NOT NULL REFERENCES inventory_catalog_items(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL DEFAULT 'storefront' CHECK (channel IN ('storefront', 'lineman')),
  quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  cost_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_amount >= 0),
  PRIMARY KEY (template_menu_item_id, catalog_item_id, channel)
);

-- One current template is assigned to every branch.  Keeping this mapping
-- explicit means a future branch-size change can reassign and sync safely.
CREATE TABLE IF NOT EXISTS branch_catalog_template_assignments (
  branch_id BIGINT PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
  template_id BIGINT NOT NULL REFERENCES catalog_templates(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ
);

-- An exception opts a single branch item out of automatic metadata updates.
-- It deliberately does not encode physical stock fields, which never belong
-- to the template synchronization contract.
CREATE TABLE IF NOT EXISTS branch_catalog_template_exceptions (
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('inventory', 'menu')),
  source_key BIGINT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, entity_type, source_key)
);

CREATE TABLE IF NOT EXISTS catalog_template_sync_events (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT NOT NULL REFERENCES catalog_templates(id) ON DELETE RESTRICT,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep the source relationship on branch rows so switching S/M/L can hide
-- rows that are no longer part of the selected template without deleting
-- balances, lots, recipes, sales, or history.
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS catalog_template_id BIGINT REFERENCES catalog_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS catalog_template_menu_item_id BIGINT REFERENCES catalog_template_menu_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS inventory_items_branch_template_enabled_idx
  ON inventory_items(branch_id, template_enabled);

CREATE INDEX IF NOT EXISTS menu_items_branch_template_enabled_idx
  ON menu_items(branch_id, template_enabled);

CREATE INDEX IF NOT EXISTS catalog_template_sync_events_template_created_idx
  ON catalog_template_sync_events(template_id, created_at DESC);

-- Seed the six authoritative templates.  The editable template rows are
-- populated below from the current catalogue only once, so migration retains
-- every existing branch's real balance, lots and transaction history.
INSERT INTO catalog_templates(scope, branch_size, name, description)
VALUES
  ('sbc', 'S', 'SBC · S', 'แม่แบบกลางสำหรับสาขา SBC ขนาด S'),
  ('sbc', 'M', 'SBC · M', 'แม่แบบกลางสำหรับสาขา SBC ขนาด M'),
  ('sbc', 'L', 'SBC · L', 'แม่แบบกลางสำหรับสาขา SBC ขนาด L'),
  ('franchise', 'S', 'แฟรนไชส์ · S', 'แม่แบบกลางสำหรับแฟรนไชส์ขนาด S'),
  ('franchise', 'M', 'แฟรนไชส์ · M', 'แม่แบบกลางสำหรับแฟรนไชส์ขนาด M'),
  ('franchise', 'L', 'แฟรนไชส์ · L', 'แม่แบบกลางสำหรับแฟรนไชส์ขนาด L')
ON CONFLICT (scope, branch_size) DO NOTHING;

-- Existing branches are assigned immediately.  The migration only records
-- the relationship; it never modifies inventory_items or menu_items here.
INSERT INTO branch_catalog_template_assignments(branch_id, template_id, assigned_at)
SELECT b.id, t.id, now()
FROM branches b
JOIN catalog_templates t
  ON t.scope = CASE WHEN b.franchisee_id IS NULL THEN 'sbc' ELSE 'franchise' END
 AND t.branch_size = COALESCE(b.size, 'S')
ON CONFLICT (branch_id) DO NOTHING;

-- Bootstrap every template from the closest existing branch for its scope and
-- size.  If that scope does not have a branch yet, use the corresponding SBC
-- branch as a safe starting catalogue.  Physical values are intentionally not
-- selected anywhere in the bootstrap.
WITH template_sources AS (
  SELECT
    t.id AS template_id,
    t.branch_size,
    COALESCE(
      (
        SELECT b.id
        FROM branches b
        WHERE (CASE WHEN t.scope = 'sbc' THEN b.franchisee_id IS NULL ELSE b.franchisee_id IS NOT NULL END)
          AND COALESCE(b.size, 'S') = t.branch_size
        ORDER BY b.id
        LIMIT 1
      ),
      (
        SELECT b.id
        FROM branches b
        WHERE b.franchisee_id IS NULL
          AND COALESCE(b.size, 'S') = t.branch_size
        ORDER BY b.id
        LIMIT 1
      ),
      (
        SELECT b.id
        FROM branches b
        WHERE b.franchisee_id IS NULL
        ORDER BY b.id
        LIMIT 1
      )
    ) AS source_branch_id
  FROM catalog_templates t
)
INSERT INTO catalog_template_inventory_items(
  template_id, catalog_item_id, category, stock_category, kind, unit,
  unit_cost, reorder_level, track_stock, image_url
)
SELECT
  source.template_id,
  item.catalog_item_id,
  item.category,
  item.stock_category,
  item.kind,
  item.unit,
  item.unit_cost,
  item.reorder_level,
  catalog.track_stock,
  item.image_url
FROM template_sources source
JOIN inventory_items item ON item.branch_id = source.source_branch_id
JOIN inventory_catalog_items catalog ON catalog.id = item.catalog_item_id
WHERE source.source_branch_id IS NOT NULL
  AND (
    source.branch_size <> 'S'
    OR item.kind = 'stock'
    OR item.category <> 'วัตถุดิบอาหาร'
    OR EXISTS (
      SELECT 1
      FROM menu_item_ingredients recipe
      JOIN menu_items menu ON menu.id = recipe.menu_item_id
      WHERE recipe.inventory_item_id = item.id
        AND menu.branch_id = source.source_branch_id
        AND lower(menu.category) NOT IN ('อาหาร', 'food', 'เบเกอรี่', 'bakery')
    )
  )
ON CONFLICT (template_id, catalog_item_id) DO NOTHING;

WITH template_sources AS (
  SELECT
    t.id AS template_id,
    t.branch_size,
    COALESCE(
      (
        SELECT b.id
        FROM branches b
        WHERE (CASE WHEN t.scope = 'sbc' THEN b.franchisee_id IS NULL ELSE b.franchisee_id IS NOT NULL END)
          AND COALESCE(b.size, 'S') = t.branch_size
        ORDER BY b.id
        LIMIT 1
      ),
      (
        SELECT b.id
        FROM branches b
        WHERE b.franchisee_id IS NULL
          AND COALESCE(b.size, 'S') = t.branch_size
        ORDER BY b.id
        LIMIT 1
      ),
      (
        SELECT b.id FROM branches b WHERE b.franchisee_id IS NULL ORDER BY b.id LIMIT 1
      )
    ) AS source_branch_id
  FROM catalog_templates t
)
INSERT INTO catalog_template_menu_items(
  template_id, name, category, store_price, store_price_available,
  lineman_price, lineman_price_available, cost_price, lineman_cost_price,
  status, image_url, preparation_steps
)
SELECT
  source.template_id,
  menu.name,
  menu.category,
  menu.store_price,
  menu.store_price_available,
  menu.lineman_price,
  menu.lineman_price_available,
  menu.cost_price,
  menu.lineman_cost_price,
  menu.status,
  menu.image_url,
  menu.preparation_steps
FROM template_sources source
JOIN menu_items menu ON menu.branch_id = source.source_branch_id
WHERE source.source_branch_id IS NOT NULL
  AND (
    source.branch_size <> 'S'
    OR lower(menu.category) NOT IN ('อาหาร', 'food', 'เบเกอรี่', 'bakery')
  )
ON CONFLICT (template_id, name) DO NOTHING;

WITH template_sources AS (
  SELECT
    t.id AS template_id,
    COALESCE(
      (
        SELECT b.id
        FROM branches b
        WHERE (CASE WHEN t.scope = 'sbc' THEN b.franchisee_id IS NULL ELSE b.franchisee_id IS NOT NULL END)
          AND COALESCE(b.size, 'S') = t.branch_size
        ORDER BY b.id
        LIMIT 1
      ),
      (
        SELECT b.id
        FROM branches b
        WHERE b.franchisee_id IS NULL
          AND COALESCE(b.size, 'S') = t.branch_size
        ORDER BY b.id
        LIMIT 1
      ),
      (
        SELECT b.id FROM branches b WHERE b.franchisee_id IS NULL ORDER BY b.id LIMIT 1
      )
    ) AS source_branch_id
  FROM catalog_templates t
)
INSERT INTO catalog_template_menu_ingredients(
  template_menu_item_id, catalog_item_id, channel, quantity, unit, cost_amount
)
SELECT
  template_menu.id,
  inventory.catalog_item_id,
  recipe.channel,
  recipe.quantity,
  recipe.unit,
  recipe.cost_amount
FROM template_sources source
JOIN menu_items source_menu
  ON source_menu.branch_id = source.source_branch_id
JOIN catalog_template_menu_items template_menu
  ON template_menu.template_id = source.template_id
 AND template_menu.name = source_menu.name
JOIN menu_item_ingredients recipe ON recipe.menu_item_id = source_menu.id
JOIN inventory_items inventory ON inventory.id = recipe.inventory_item_id
JOIN catalog_template_inventory_items template_inventory
  ON template_inventory.template_id = source.template_id
 AND template_inventory.catalog_item_id = inventory.catalog_item_id
WHERE source.source_branch_id IS NOT NULL
ON CONFLICT (template_menu_item_id, catalog_item_id, channel) DO NOTHING;

-- Link existing branch rows to the template that was bootstrapped from them.
-- This is metadata-only: no quantity, expiry, lot, movement, or order changes.
UPDATE inventory_items item
SET catalog_template_id = assignment.template_id,
    template_enabled = template_item.active
FROM branch_catalog_template_assignments assignment
JOIN catalog_template_inventory_items template_item
  ON template_item.template_id = assignment.template_id
WHERE item.branch_id = assignment.branch_id
  AND item.catalog_item_id = template_item.catalog_item_id;

UPDATE menu_items menu
SET catalog_template_menu_item_id = template_menu.id,
    template_enabled = template_menu.active
FROM branch_catalog_template_assignments assignment
JOIN catalog_template_menu_items template_menu
  ON template_menu.template_id = assignment.template_id
WHERE menu.branch_id = assignment.branch_id
  AND menu.name = template_menu.name;

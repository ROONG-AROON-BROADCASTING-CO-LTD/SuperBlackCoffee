-- Consolidate the six legacy scope/size templates into one catalog. The old
-- rows and sync events remain for audit, but only the central row is active.
-- This migration changes definitions and provenance, never branch balances,
-- expiry dates, lots, movements, purchase orders, or sales history.
ALTER TABLE catalog_templates
  DROP CONSTRAINT IF EXISTS catalog_templates_scope_check,
  DROP CONSTRAINT IF EXISTS catalog_templates_branch_size_check;

ALTER TABLE catalog_templates
  ADD CONSTRAINT catalog_templates_scope_check
    CHECK (scope IN ('sbc', 'franchise', 'central')),
  ADD CONSTRAINT catalog_templates_branch_size_check
    CHECK (branch_size IN ('S', 'M', 'L', 'ALL'));

ALTER TABLE catalog_template_inventory_items
  ADD COLUMN IF NOT EXISTS available_sizes TEXT[] NOT NULL DEFAULT ARRAY['S','M','L']::TEXT[];
ALTER TABLE catalog_template_menu_items
  ADD COLUMN IF NOT EXISTS available_sizes TEXT[] NOT NULL DEFAULT ARRAY['S','M','L']::TEXT[];

ALTER TABLE catalog_template_inventory_items
  ADD CONSTRAINT catalog_inventory_valid_sizes CHECK (
    cardinality(available_sizes) BETWEEN 1 AND 3
    AND available_sizes <@ ARRAY['S','M','L']::TEXT[]
  );
ALTER TABLE catalog_template_menu_items
  ADD CONSTRAINT catalog_menu_valid_sizes CHECK (
    cardinality(available_sizes) BETWEEN 1 AND 3
    AND available_sizes <@ ARRAY['S','M','L']::TEXT[]
  );

INSERT INTO catalog_templates(scope,branch_size,name,description)
VALUES ('central','ALL','สินค้าและคลังกลาง','ข้อมูลสินค้า เมนู สูตร และคลังกลางสำหรับทุกสาขา')
ON CONFLICT (scope,branch_size) DO NOTHING;

-- A stable rule chooses the common definition when historical templates
-- disagree: SBC M, SBC L, SBC S, franchise M, franchise L, franchise S.
-- Membership is the union of active S/M/L rows from either ownership type.
WITH preferred AS (
  SELECT DISTINCT ON (item.catalog_item_id)
    item.catalog_item_id,item.category,item.stock_category,item.kind,item.unit,
    item.unit_cost,item.reorder_level,item.track_stock,item.image_url
  FROM catalog_template_inventory_items item
  JOIN catalog_templates source ON source.id=item.template_id
  WHERE source.scope IN ('sbc','franchise') AND item.active
  ORDER BY item.catalog_item_id,
    CASE source.scope WHEN 'sbc' THEN 0 ELSE 1 END,
    CASE source.branch_size WHEN 'M' THEN 0 WHEN 'L' THEN 1 ELSE 2 END,
    source.id
), membership AS (
  SELECT item.catalog_item_id,array_agg(DISTINCT source.branch_size) AS sizes
  FROM catalog_template_inventory_items item
  JOIN catalog_templates source ON source.id=item.template_id
  WHERE source.scope IN ('sbc','franchise') AND item.active
  GROUP BY item.catalog_item_id
)
INSERT INTO catalog_template_inventory_items(
  template_id,catalog_item_id,category,stock_category,kind,unit,unit_cost,
  reorder_level,track_stock,image_url,available_sizes
)
SELECT central.id,preferred.catalog_item_id,preferred.category,
  preferred.stock_category,preferred.kind,preferred.unit,preferred.unit_cost,
  preferred.reorder_level,preferred.track_stock,preferred.image_url,membership.sizes
FROM preferred
JOIN membership USING (catalog_item_id)
CROSS JOIN catalog_templates central
WHERE central.scope='central' AND central.branch_size='ALL'
ON CONFLICT (template_id,catalog_item_id) DO NOTHING;

WITH preferred AS (
  SELECT DISTINCT ON (item.name)
    item.name,item.category,item.store_price,item.store_price_available,
    item.lineman_price,item.lineman_price_available,item.cost_price,
    item.lineman_cost_price,item.status,item.image_url,item.preparation_steps
  FROM catalog_template_menu_items item
  JOIN catalog_templates source ON source.id=item.template_id
  WHERE source.scope IN ('sbc','franchise') AND item.active
  ORDER BY item.name,
    CASE source.scope WHEN 'sbc' THEN 0 ELSE 1 END,
    CASE source.branch_size WHEN 'M' THEN 0 WHEN 'L' THEN 1 ELSE 2 END,
    source.id
), membership AS (
  SELECT item.name,array_agg(DISTINCT source.branch_size) AS sizes
  FROM catalog_template_menu_items item
  JOIN catalog_templates source ON source.id=item.template_id
  WHERE source.scope IN ('sbc','franchise') AND item.active
  GROUP BY item.name
)
INSERT INTO catalog_template_menu_items(
  template_id,name,category,store_price,store_price_available,lineman_price,
  lineman_price_available,cost_price,lineman_cost_price,status,image_url,
  preparation_steps,available_sizes
)
SELECT central.id,preferred.name,preferred.category,preferred.store_price,
  preferred.store_price_available,preferred.lineman_price,
  preferred.lineman_price_available,preferred.cost_price,
  preferred.lineman_cost_price,preferred.status,preferred.image_url,
  preferred.preparation_steps,membership.sizes
FROM preferred
JOIN membership USING (name)
CROSS JOIN catalog_templates central
WHERE central.scope='central' AND central.branch_size='ALL'
ON CONFLICT (template_id,name) DO NOTHING;

-- Copy recipes from the same preferred source used for menu metadata.
WITH preferred AS (
  SELECT DISTINCT ON (item.name) item.id,item.name
  FROM catalog_template_menu_items item
  JOIN catalog_templates source ON source.id=item.template_id
  WHERE source.scope IN ('sbc','franchise') AND item.active
  ORDER BY item.name,
    CASE source.scope WHEN 'sbc' THEN 0 ELSE 1 END,
    CASE source.branch_size WHEN 'M' THEN 0 WHEN 'L' THEN 1 ELSE 2 END,
    source.id
)
INSERT INTO catalog_template_menu_ingredients(
  template_menu_item_id,catalog_item_id,channel,quantity,unit,cost_amount
)
SELECT target.id,recipe.catalog_item_id,recipe.channel,recipe.quantity,
  recipe.unit,recipe.cost_amount
FROM preferred
JOIN catalog_template_menu_items target ON target.name=preferred.name
JOIN catalog_templates central ON central.id=target.template_id AND central.scope='central'
JOIN catalog_template_menu_ingredients recipe ON recipe.template_menu_item_id=preferred.id
JOIN catalog_template_inventory_items inventory
  ON inventory.template_id=central.id AND inventory.catalog_item_id=recipe.catalog_item_id
ON CONFLICT (template_menu_item_id,catalog_item_id,channel) DO NOTHING;

-- A size that offers a menu must also have its recipe ingredients available.
WITH required AS (
  SELECT recipe.catalog_item_id,array_agg(DISTINCT member.size ORDER BY member.size) AS sizes
  FROM catalog_template_menu_ingredients recipe
  JOIN catalog_template_menu_items menu ON menu.id=recipe.template_menu_item_id
  JOIN catalog_templates central ON central.id=menu.template_id AND central.scope='central'
  CROSS JOIN LATERAL unnest(menu.available_sizes) AS member(size)
  GROUP BY recipe.catalog_item_id
)
UPDATE catalog_template_inventory_items inventory
SET available_sizes=(
  SELECT array_agg(DISTINCT member.size ORDER BY member.size)
  FROM unnest(inventory.available_sizes || required.sizes) AS member(size)
),updated_at=now()
FROM required,catalog_templates central
WHERE central.scope='central' AND inventory.template_id=central.id
  AND inventory.catalog_item_id=required.catalog_item_id;

-- Move explicit menu exceptions and branch provenance to the unified source.
INSERT INTO branch_catalog_template_exceptions(branch_id,entity_type,source_key,reason)
SELECT exception.branch_id,'menu',target.id,exception.reason
FROM branch_catalog_template_exceptions exception
JOIN catalog_template_menu_items legacy ON legacy.id=exception.source_key
JOIN catalog_templates old_source ON old_source.id=legacy.template_id
JOIN catalog_template_menu_items target ON target.name=legacy.name
JOIN catalog_templates central ON central.id=target.template_id AND central.scope='central'
WHERE exception.entity_type='menu' AND old_source.scope IN ('sbc','franchise')
ON CONFLICT (branch_id,entity_type,source_key) DO NOTHING;

DELETE FROM branch_catalog_template_exceptions exception
USING catalog_template_menu_items legacy,catalog_templates old_source
WHERE exception.entity_type='menu'
  AND exception.source_key=legacy.id
  AND old_source.id=legacy.template_id
  AND old_source.scope IN ('sbc','franchise');

UPDATE menu_items branch_menu
SET catalog_template_menu_item_id=target.id
FROM catalog_template_menu_items legacy
JOIN catalog_templates old_source ON old_source.id=legacy.template_id
JOIN catalog_template_menu_items target ON target.name=legacy.name
JOIN catalog_templates central ON central.id=target.template_id AND central.scope='central'
WHERE branch_menu.catalog_template_menu_item_id=legacy.id
  AND old_source.scope IN ('sbc','franchise');

UPDATE inventory_items branch_item
SET catalog_template_id=central.id
FROM catalog_templates central
WHERE central.scope='central' AND central.branch_size='ALL'
  AND branch_item.catalog_template_id IS NOT NULL;

UPDATE branch_catalog_template_assignments assignment
SET template_id=central.id,assigned_at=now(),last_synced_at=NULL
FROM catalog_templates central
WHERE central.scope='central' AND central.branch_size='ALL';

UPDATE catalog_templates SET active=false,updated_at=now()
WHERE scope IN ('sbc','franchise');

-- A branch can opt a central item out without changing any other branch.
CREATE TABLE IF NOT EXISTS branch_catalog_item_selections (
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('inventory','menu')),
  source_key BIGINT NOT NULL,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id,entity_type,source_key)
);

CREATE INDEX IF NOT EXISTS catalog_inventory_sizes_active_idx
  ON catalog_template_inventory_items USING gin (available_sizes) WHERE active;
CREATE INDEX IF NOT EXISTS catalog_menu_sizes_active_idx
  ON catalog_template_menu_items USING gin (available_sizes) WHERE active;
CREATE INDEX IF NOT EXISTS catalog_menu_recipe_catalog_item_idx
  ON catalog_template_menu_ingredients(catalog_item_id);

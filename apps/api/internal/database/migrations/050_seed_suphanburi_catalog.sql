-- Copy the shared SBC catalogue into the seeded Suphanburi franchise branches.
-- Inventory quantities intentionally start at zero; catalogue definitions and recipes are shared.
WITH branch_map(source_code, target_code) AS (
  VALUES ('SBC-AYA-001', 'FR-SUP-001-S'),
         ('SBC-PLK-001', 'FR-SUP-001-M'),
         ('SBC-PLK-001', 'FR-SUP-001-L')
)
INSERT INTO menu_items(
  branch_id, name, category, store_price, lineman_price, cost_price, status,
  image_url, lineman_cost_price, store_price_available, lineman_price_available,
  preparation_steps
)
SELECT target.id, source.name, source.category, source.store_price, source.lineman_price,
       source.cost_price, source.status, source.image_url, source.lineman_cost_price,
       source.store_price_available, source.lineman_price_available, source.preparation_steps
FROM branch_map m
JOIN branches source_branch ON source_branch.code = m.source_code
JOIN branches target ON target.code = m.target_code
JOIN menu_items source ON source.branch_id = source_branch.id
ON CONFLICT (branch_id, name) DO NOTHING;

WITH branch_map(source_code, target_code) AS (
  VALUES ('SBC-AYA-001', 'FR-SUP-001-S'),
         ('SBC-PLK-001', 'FR-SUP-001-M'),
         ('SBC-PLK-001', 'FR-SUP-001-L')
)
INSERT INTO inventory_items(
  branch_id, name, category, quantity, unit, reorder_level, kind, unit_cost,
  image_url, expiry_date, stock_category
)
SELECT target.id, source.name, source.category, 0, source.unit, source.reorder_level,
       source.kind, source.unit_cost, source.image_url, NULL, source.stock_category
FROM branch_map m
JOIN branches source_branch ON source_branch.code = m.source_code
JOIN branches target ON target.code = m.target_code
JOIN inventory_items source ON source.branch_id = source_branch.id
ON CONFLICT (branch_id, name) DO NOTHING;

WITH branch_map(source_code, target_code) AS (
  VALUES ('SBC-AYA-001', 'FR-SUP-001-S'),
         ('SBC-PLK-001', 'FR-SUP-001-M'),
         ('SBC-PLK-001', 'FR-SUP-001-L')
)
INSERT INTO menu_item_ingredients(menu_item_id, inventory_item_id, quantity, unit, cost_amount)
SELECT target_menu.id, target_inventory.id, source_link.quantity, source_link.unit, source_link.cost_amount
FROM branch_map m
JOIN branches source_branch ON source_branch.code = m.source_code
JOIN branches target_branch ON target_branch.code = m.target_code
JOIN menu_items source_menu ON source_menu.branch_id = source_branch.id
JOIN menu_item_ingredients source_link ON source_link.menu_item_id = source_menu.id
JOIN inventory_items source_inventory ON source_inventory.id = source_link.inventory_item_id
JOIN menu_items target_menu ON target_menu.branch_id = target_branch.id AND target_menu.name = source_menu.name
JOIN inventory_items target_inventory ON target_inventory.branch_id = target_branch.id AND target_inventory.name = source_inventory.name
ON CONFLICT (menu_item_id, inventory_item_id) DO NOTHING;

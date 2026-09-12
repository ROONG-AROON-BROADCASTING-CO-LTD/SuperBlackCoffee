-- A channel can have different packaging or ingredient quantities, while both
-- channel recipes deduct from the same branch inventory balance.
ALTER TABLE menu_item_ingredients ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'storefront';
ALTER TABLE menu_item_ingredients DROP CONSTRAINT IF EXISTS menu_item_ingredients_pkey;
ALTER TABLE menu_item_ingredients ADD CONSTRAINT menu_item_ingredients_pkey PRIMARY KEY (menu_item_id, inventory_item_id, channel);
ALTER TABLE menu_item_ingredients DROP CONSTRAINT IF EXISTS menu_item_ingredients_channel_check;
ALTER TABLE menu_item_ingredients ADD CONSTRAINT menu_item_ingredients_channel_check CHECK (channel IN ('storefront', 'lineman'));
INSERT INTO menu_item_ingredients(menu_item_id, inventory_item_id, quantity, unit, cost_amount, channel)
SELECT menu_item_id, inventory_item_id, quantity, unit, cost_amount, 'lineman'
FROM menu_item_ingredients WHERE channel = 'storefront'
ON CONFLICT (menu_item_id, inventory_item_id, channel) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_menu_channel ON menu_item_ingredients(menu_item_id, channel);

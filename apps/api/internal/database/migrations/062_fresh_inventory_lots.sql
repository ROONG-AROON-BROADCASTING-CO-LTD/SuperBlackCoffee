-- Fresh ingredients are stored in batches so one ingredient can carry
-- multiple expiry dates and be consumed using FEFO (first-expire, first-out).
CREATE TABLE IF NOT EXISTS fresh_inventory_lots (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL DEFAULT '',
  received_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  quantity_received NUMERIC(12,2) NOT NULL CHECK (quantity_received > 0),
  quantity_remaining NUMERIC(12,2) NOT NULL CHECK (quantity_remaining >= 0),
  unit_cost NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','discarded')),
  discarded_at TIMESTAMPTZ,
  discarded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  discard_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (quantity_remaining <= quantity_received)
);

CREATE INDEX IF NOT EXISTS fresh_inventory_lots_fefo_idx
  ON fresh_inventory_lots(branch_id, inventory_item_id, expiry_date, received_at, id)
  WHERE status = 'active' AND quantity_remaining > 0;

CREATE TABLE IF NOT EXISTS fresh_inventory_lot_movements (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  lot_id BIGINT NOT NULL REFERENCES fresh_inventory_lots(id) ON DELETE RESTRICT,
  inventory_item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('received','consumed','discarded','adjusted')),
  quantity_delta NUMERIC(12,2) NOT NULL,
  quantity_before NUMERIC(12,2) NOT NULL,
  quantity_after NUMERIC(12,2) NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fresh_inventory_lot_movements_lot_created_idx
  ON fresh_inventory_lot_movements(lot_id, created_at DESC);

-- Preserve existing fresh stock as one opening lot when it already has an
-- expiry date. Legacy rows without an expiry date remain available for manual
-- reconciliation instead of fabricating a date.
INSERT INTO fresh_inventory_lots(
  branch_id, inventory_item_id, received_at, expiry_date,
  quantity_received, quantity_remaining, unit_cost
)
SELECT
  branch_id, id, COALESCE(created_at::date, CURRENT_DATE), expiry_date,
  quantity, quantity, unit_cost
FROM inventory_items
WHERE category = 'fresh'
  AND quantity > 0
  AND expiry_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM fresh_inventory_lots lot
    WHERE lot.inventory_item_id = inventory_items.id
  );

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN (
    'initial', 'purchase_receipt', 'stock_request_receipt', 'adjustment',
    'menu_consumption', 'fresh_lot_receipt', 'fresh_lot_discard'
  ));

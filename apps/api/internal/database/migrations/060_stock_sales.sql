-- A confirmed Stock app consumption is the source of truth for sales. Each
-- batch records the menu prices that were active when stock was cut.
CREATE TABLE IF NOT EXISTS stock_sales (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_sale_items (
  id BIGSERIAL PRIMARY KEY,
  stock_sale_id BIGINT NOT NULL REFERENCES stock_sales(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL CHECK (channel IN ('storefront', 'lineman')),
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS stock_sales_branch_created_idx
  ON stock_sales(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_sale_items_menu_idx
  ON stock_sale_items(menu_item_id);

CREATE TABLE IF NOT EXISTS sales_imports (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  checksum TEXT NOT NULL UNIQUE,
  imported_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_import_lines (
  id BIGSERIAL PRIMARY KEY,
  import_id BIGINT NOT NULL REFERENCES sales_imports(id) ON DELETE CASCADE,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL,
  sold_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('storefront', 'lineman')),
  external_menu_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_import_lines_sold_at_idx
  ON sales_import_lines(sold_at DESC);
CREATE INDEX IF NOT EXISTS sales_import_lines_branch_sold_at_idx
  ON sales_import_lines(branch_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS sales_import_lines_menu_sold_at_idx
  ON sales_import_lines(menu_item_id, sold_at DESC);

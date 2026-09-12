-- Stock counted from sold menus must remain auditable just like receipts and
-- manual adjustments.
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('initial', 'purchase_receipt', 'stock_request_receipt', 'adjustment', 'menu_consumption'));

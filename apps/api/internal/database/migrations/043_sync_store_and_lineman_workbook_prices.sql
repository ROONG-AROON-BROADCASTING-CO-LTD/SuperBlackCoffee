-- Sync entries whose values changed in the supplied store and LINE MAN workbooks.
-- Store cost/price always comes from “ต้นทุน ราคาขาย หน้าร้าน.xlsx”; LINE MAN
-- cost/price always comes from “ต้นทุน ราคาขาย ไลน์แมน.xlsx”.
UPDATE menu_items AS m
SET
  cost_price = v.store_cost_price,
  lineman_cost_price = v.lineman_cost_price,
  store_price = v.store_price,
  store_price_available = true,
  lineman_price = v.lineman_price,
  lineman_price_available = true,
  updated_at = now()
FROM (VALUES
  ('กระเพราพริกแห้ง ทะเล', 51.26, 59.13, 89.00, 129.00),
  ('ชาเขียวมะนาวโซดา', 29.515, 31.305, 75.00, 90.00),
  ('ชาไทย', 22.005, 23.79, 60.00, 75.00),
  ('มัฉฉะลาเต้', 39.24, 41.03, 89.00, 119.00),
  ('สตรอเบอร์รี่มัทฉะลาเต้', 42.54, 44.33, 99.00, 119.00),
  ('สลัดทูน่าอะโวคาโดทองวิมล', 37.91, 45.37, 79.00, 119.00),
  ('หมูมะนาวทองวิมล', 29.90, 38.387, 89.00, 109.00),
  ('ไข่ขยี้คั่วพริกเกลือ ทะเล', 54.40, 73.85, 99.00, 119.00),
  ('ไข่ขยี้คั่วพริกเกลือ หมู', 41.39, 50.04, 79.00, 99.00),
  ('ไข่เจียวกุ้ง ทรงเครื่อง', 60.52, 69.16, 89.00, 109.00)
) AS v(name, store_cost_price, lineman_cost_price, store_price, lineman_price)
WHERE m.name = v.name;

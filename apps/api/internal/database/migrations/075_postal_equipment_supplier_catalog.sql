-- Postal supplies have a supplier-facing commercial record in addition to
-- their internal unit cost. These values are reference data only: branch
-- inventory quantities continue to be owned by each branch.
ALTER TABLE catalog_template_inventory_items
  ADD COLUMN IF NOT EXISTS supplier_sku TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_markup NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (supplier_markup >= 0),
  ADD COLUMN IF NOT EXISTS supplier_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (supplier_price >= 0),
  ADD COLUMN IF NOT EXISTS supplier_stock NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Seed the complete Tangthai postal catalogue supplied by the administrator.
-- A negative source balance is retained verbatim because the supplier uses it
-- to indicate an unavailable/backordered item.
WITH source(supplier_sku,name,category,unit_cost,supplier_markup,supplier_price,supplier_stock) AS (
  VALUES
    ('PDC00006','กล่อง 0','postal_box',1.45,10,11.45,92),
    ('PDC00014','กล่อง 0+4','postal_box',1.80,15,16.80,60),
    ('PDC00001','กล่อง A','postal_box',2.05,15,17.05,277),
    ('PDC00010','กล่อง 2A','postal_box',2.70,15,17.70,63),
    ('PDC00002','กล่อง B','postal_box',3.20,20,23.20,46),
    ('PDC00011','กล่อง 2B','postal_box',4.25,18,22.25,38),
    ('PDC00003','กล่อง C','postal_box',4.35,20,24.35,44),
    ('PDC00017','กล่อง 2C','postal_box',6.60,15,21.60,39),
    ('PDC00004','กล่อง D','postal_box',5.95,20,25.95,39),
    ('PDC00018','กล่อง 2D','postal_box',9.00,18,27.00,50),
    ('PDC00015','กล่อง AA','postal_box',1.95,15,16.95,71),
    ('PDC000012','กล่อง G (31×36×26)','postal_box',14.30,25,39.30,50),
    ('PDC00020','กล่อง M','postal_box',15.00,20,35.00,44),
    ('PDC00021','ซองน้ำตาล A4 (ธรรมดา)','postal_envelope',2.40,10,12.40,6),
    ('PDC00037','บับเบิ้ลแบ่งขาย','postal_envelope',5.00,10,15.00,35),
    ('PDC00038','บับเบิ้ล 1 เมตร','postal_envelope',20.00,35,55.00,50),
    ('PDC00042','ปริ้นงานไฟล์ขาว-ดำ','postal_service',7.50,10,17.50,0),
    ('PDC00027','ซองกันกระแทก 7×10','postal_envelope',6.00,10,16.00,-1),
    ('PDC00024','ซอง 6×9','postal_envelope',1.00,10,11.00,14),
    ('PDC00034','ซองพลาสติก 25×35','postal_envelope',1.27,10,11.27,0),
    ('PDC00033','ซองพลาสติก 17×30','postal_envelope',4.00,10,14.00,0),
    ('PDC00052','กล่อง M+','postal_box',12.00,35,47.00,56),
    ('PDC00007','กล่อง F 31×36×13','postal_box',11.50,20,31.50,51),
    ('PDC00031','ซองกันกระแทกจ่าหน้าซอง 9×13','postal_envelope',9.00,15,24.00,36),
    ('PDC00019','กล่อง Q','postal_box',4.50,15,19.50,46),
    ('PDC00044','กล่อง I','postal_box',42.00,25,67.00,29),
    ('PDC0005','กล่อง E','postal_box',7.45,30,37.45,64),
    ('PDC00067','เทปใส','postal_tape',18.00,10,28.00,10),
    ('PDC00005','กล่อง AB','postal_box',4.10,13,17.10,55),
    ('PDC00034','กล่อง H','postal_box',25.60,10,35.60,46)
), catalog_items AS (
  INSERT INTO inventory_catalog_items(name,category,stock_category,kind,unit,unit_cost,track_stock)
  SELECT name,category,'postal_equipment','stock','ชิ้น',unit_cost,true
  FROM source
  ON CONFLICT (name) DO UPDATE
    SET category=EXCLUDED.category,
        stock_category=EXCLUDED.stock_category,
        kind=EXCLUDED.kind,
        unit=EXCLUDED.unit,
        unit_cost=EXCLUDED.unit_cost,
        track_stock=EXCLUDED.track_stock,
        updated_at=now()
  RETURNING id,name
)
INSERT INTO catalog_template_inventory_items(
  template_id,catalog_item_id,category,stock_category,supplier_sku,
  supplier_markup,supplier_price,supplier_stock,kind,unit,unit_cost,
  reorder_level,track_stock,image_url,available_sizes,active
)
SELECT
  template.id,catalog_item.id,source.category,'postal_equipment',source.supplier_sku,
  source.supplier_markup,source.supplier_price,source.supplier_stock,'stock','ชิ้น',source.unit_cost,
  10,true,'',ARRAY['S','M','L'],true
FROM source
JOIN catalog_items catalog_item ON catalog_item.name=source.name
JOIN catalog_templates template ON template.scope='central' AND template.branch_size='ALL' AND template.active
ON CONFLICT (template_id,catalog_item_id) DO UPDATE
  SET category=EXCLUDED.category,
      stock_category=EXCLUDED.stock_category,
      supplier_sku=EXCLUDED.supplier_sku,
      supplier_markup=EXCLUDED.supplier_markup,
      supplier_price=EXCLUDED.supplier_price,
      supplier_stock=EXCLUDED.supplier_stock,
      kind=EXCLUDED.kind,
      unit=EXCLUDED.unit,
      unit_cost=EXCLUDED.unit_cost,
      reorder_level=EXCLUDED.reorder_level,
      track_stock=EXCLUDED.track_stock,
      available_sizes=EXCLUDED.available_sizes,
      active=true,
      updated_at=now();

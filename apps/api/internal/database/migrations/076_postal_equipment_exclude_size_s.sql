-- Small branches do not provide postal services. Keep postal equipment in the
-- central catalogue for M/L only and hide previously synchronized records at
-- existing Size S branches without deleting their inventory history.
UPDATE catalog_template_inventory_items AS item
SET available_sizes=ARRAY['M','L'],updated_at=now()
FROM catalog_templates AS template
WHERE item.template_id=template.id
  AND template.scope='central'
  AND template.branch_size='ALL'
  AND item.active
  AND item.kind='stock'
  AND item.stock_category='postal_equipment';

UPDATE inventory_items AS item
SET template_enabled=false,updated_at=now()
FROM branches AS branch
WHERE item.branch_id=branch.id
  AND COALESCE(branch.size,'S')='S'
  AND item.kind='stock'
  AND item.stock_category='postal_equipment'
  AND item.template_enabled;

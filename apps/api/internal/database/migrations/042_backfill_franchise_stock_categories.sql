-- Franchise catalogues created by earlier versions copied stock rows without
-- their stock_category, so category-specific stock pages returned no results.
UPDATE inventory_items AS target
SET stock_category = source.stock_category
FROM inventory_items AS source
JOIN branches AS source_branch
  ON source_branch.id = source.branch_id
 AND source_branch.code = 'SBC-AYA-001'
WHERE target.kind = 'stock'
  AND source.kind = 'stock'
  AND target.name = source.name
  AND source.stock_category IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM branches AS franchise_branch
    WHERE franchise_branch.id = target.branch_id
      AND franchise_branch.franchisee_id IS NOT NULL
  )
  AND target.stock_category IS DISTINCT FROM source.stock_category;

package repository

import (
	"context"
	"database/sql"

	"y/internal/model"
)

// ensureInventoryCatalogTx returns the shared definition for an inventory item.
// A catalogue edit is intentionally global; quantities, reorder levels and
// expiry dates remain on the branch-specific inventory_items row.
func ensureInventoryCatalogTx(ctx context.Context, tx *sql.Tx, item model.InventoryItem) (int64, error) {
	var id int64
	err := tx.QueryRowContext(ctx, `
		INSERT INTO inventory_catalog_items(name,category,stock_category,kind,unit,unit_cost,image_url)
		VALUES($1,$2,NULLIF($3,''),$4,$5,$6,$7)
		ON CONFLICT (name) DO UPDATE
		SET category=EXCLUDED.category,
			stock_category=EXCLUDED.stock_category,
			kind=EXCLUDED.kind,
			unit=EXCLUDED.unit,
			unit_cost=EXCLUDED.unit_cost,
			image_url=EXCLUDED.image_url,
			updated_at=now()
		RETURNING id`, item.Name, item.Category, item.StockCategory, item.Kind, item.Unit, item.UnitCost, item.ImageURL).Scan(&id)
	return id, err
}

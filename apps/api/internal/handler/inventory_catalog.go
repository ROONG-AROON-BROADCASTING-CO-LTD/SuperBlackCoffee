package handler

import (
	"context"
	"database/sql"

	"y/internal/model"
)

// ensureInventoryCatalogTx makes item metadata global while stock state remains
// scoped to one branch. Updating a catalogue item therefore updates what every
// branch sees without changing any branch's quantity or expiry date.
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

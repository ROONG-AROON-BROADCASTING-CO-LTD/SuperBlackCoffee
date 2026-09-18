package handler

import (
	"context"
	"database/sql"

	"y/internal/model"
)

// ensureInventoryCatalogTx resolves the stable global identity for a branch
// item. Existing canonical metadata is never changed from a branch CRUD flow;
// shared defaults are edited only through the central-template endpoints.
func ensureInventoryCatalogTx(ctx context.Context, tx *sql.Tx, item model.InventoryItem) (int64, bool, error) {
	var id int64
	var trackStock bool
	err := tx.QueryRowContext(ctx, `
		INSERT INTO inventory_catalog_items(name,category,stock_category,kind,unit,unit_cost,image_url,track_stock)
		VALUES($1,$2,NULLIF($3,''),$4,$5,$6,$7,COALESCE($8,true))
		ON CONFLICT (name) DO UPDATE
		SET name=EXCLUDED.name
		RETURNING id,track_stock`, item.Name, item.Category, item.StockCategory, item.Kind, item.Unit, item.UnitCost, item.ImageURL, item.TrackStock).Scan(&id, &trackStock)
	return id, trackStock, err
}

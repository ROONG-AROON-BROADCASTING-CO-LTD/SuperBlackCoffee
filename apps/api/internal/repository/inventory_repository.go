package repository

import (
	"context"
	"database/sql"
	"time"

	"y/internal/model"
)

type InventoryRepository interface {
	List(ctx context.Context, branchID int64, kind string) ([]model.InventoryItem, error)
	Create(ctx context.Context, branchID int64, item model.InventoryItem) (int64, error)
	Update(ctx context.Context, branchID, id int64, item model.InventoryItem) (bool, error)
	Delete(ctx context.Context, branchID, id int64) (bool, error)
}

type postgresInventoryRepository struct{ db *sql.DB }

func NewPostgresInventoryRepository(db *sql.DB) InventoryRepository {
	return &postgresInventoryRepository{db: db}
}

func (r *postgresInventoryRepository) List(ctx context.Context, branchID int64, kind string) ([]model.InventoryItem, error) {
	query := `SELECT i.id,COALESCE(c.name,i.name),COALESCE(c.category,i.category),COALESCE(c.stock_category,i.stock_category,''),COALESCE(c.kind,i.kind),i.quantity,COALESCE(c.unit,i.unit),i.reorder_level,COALESCE(c.unit_cost,i.unit_cost),COALESCE(c.image_url,i.image_url),COALESCE(c.track_stock,true),CASE WHEN COALESCE(c.category,i.category)='fresh' AND fresh_lot.has_lots THEN fresh_lot.next_expiry ELSE i.expiry_date END,i.created_at,i.updated_at,COALESCE(last_movement.created_at,i.created_at) FROM inventory_items i LEFT JOIN inventory_catalog_items c ON c.id=i.catalog_item_id LEFT JOIN LATERAL (SELECT COUNT(*) > 0 AS has_lots,MIN(expiry_date) FILTER (WHERE status='active' AND quantity_remaining>0 AND expiry_date>=CURRENT_DATE) AS next_expiry FROM fresh_inventory_lots WHERE branch_id=i.branch_id AND inventory_item_id=i.id) fresh_lot ON COALESCE(c.category,i.category)='fresh' LEFT JOIN LATERAL (SELECT MAX(created_at) AS created_at FROM stock_movements WHERE branch_id=i.branch_id AND inventory_item_id=i.id) last_movement ON TRUE WHERE i.branch_id=$1`
	args := []any{branchID}
	if kind != "" {
		query += ` AND COALESCE(c.kind,i.kind)=$2`
		args = append(args, kind)
	}
	query += ` ORDER BY COALESCE(c.name,i.name)`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.InventoryItem, 0)
	for rows.Next() {
		var item model.InventoryItem
		var trackStock bool
		var lastMovementAt time.Time
		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.StockCategory, &item.Kind, &item.Quantity, &item.Unit, &item.ReorderLevel, &item.UnitCost, &item.ImageURL, &trackStock, &item.ExpiryDate, &item.CreatedAt, &item.UpdatedAt, &lastMovementAt); err != nil {
			return nil, err
		}
		item.TrackStock = &trackStock
		now := time.Now().UTC()
		item.Status = inventoryStatus(trackStock, item.Quantity, item.ReorderLevel, lastMovementAt, now)
		item.ExpiryStatus = inventoryExpiryStatus(item.ExpiryDate, now)
		items = append(items, item)
	}
	return items, rows.Err()
}

const staleInventoryAfterDays = 30

func inventoryStatus(trackStock bool, quantity, reorderLevel float64, lastMovementAt, now time.Time) string {
	if !trackStock {
		return "cost_only"
	}
	if quantity <= 0 {
		return "out"
	}
	if quantity <= reorderLevel {
		return "low"
	}
	if !lastMovementAt.After(now.AddDate(0, 0, -staleInventoryAfterDays)) {
		return "stale"
	}
	return "ready"
}

func (r *postgresInventoryRepository) Create(ctx context.Context, branchID int64, item model.InventoryItem) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	catalogID, err := ensureInventoryCatalogTx(ctx, tx, item)
	if err != nil {
		return 0, err
	}
	var id int64
	err = tx.QueryRowContext(ctx, `INSERT INTO inventory_items(branch_id,catalog_item_id,name,category,stock_category,kind,quantity,unit,reorder_level,unit_cost,expiry_date) VALUES($1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,$9,$10,$11) RETURNING id`, branchID, catalogID, item.Name, item.Category, item.StockCategory, item.Kind, item.Quantity, item.Unit, item.ReorderLevel, item.UnitCost, item.ExpiryDate).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *postgresInventoryRepository) Update(ctx context.Context, branchID, id int64, item model.InventoryItem) (bool, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	catalogID, err := ensureInventoryCatalogTx(ctx, tx, item)
	if err != nil {
		return false, err
	}
	result, err := tx.ExecContext(ctx, `UPDATE inventory_items SET catalog_item_id=$1,quantity=$2,reorder_level=$3,expiry_date=$4,updated_at=now() WHERE id=$5 AND branch_id=$6`, catalogID, item.Quantity, item.ReorderLevel, item.ExpiryDate, id, branchID)
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	if err != nil || n == 0 {
		return n > 0, err
	}
	return true, tx.Commit()
}

func inventoryExpiryStatus(expiryDate *time.Time, now time.Time) string {
	if expiryDate == nil {
		return "none"
	}
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	expiresOn := expiryDate.UTC()
	if expiresOn.Before(today) {
		return "expired"
	}
	if !expiresOn.After(today.AddDate(0, 0, 7)) {
		return "expiring_soon"
	}
	return "none"
}

func (r *postgresInventoryRepository) Delete(ctx context.Context, branchID, id int64) (bool, error) {
	result, err := r.db.ExecContext(ctx, `DELETE FROM inventory_items WHERE id=$1 AND branch_id=$2`, id, branchID)
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	return n > 0, err
}

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
	query := `SELECT id,name,category,COALESCE(stock_category,''),kind,quantity,unit,reorder_level,unit_cost,image_url,expiry_date,created_at,updated_at FROM inventory_items WHERE branch_id=$1`
	args := []any{branchID}
	if kind != "" {
		query += ` AND kind=$2`
		args = append(args, kind)
	}
	query += ` ORDER BY name`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]model.InventoryItem, 0)
	for rows.Next() {
		var item model.InventoryItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.StockCategory, &item.Kind, &item.Quantity, &item.Unit, &item.ReorderLevel, &item.UnitCost, &item.ImageURL, &item.ExpiryDate, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		if item.Quantity <= 0 {
			item.Status = "out"
		} else if item.Quantity <= item.ReorderLevel {
			item.Status = "low"
		} else {
			item.Status = "ready"
		}
		item.ExpiryStatus = inventoryExpiryStatus(item.ExpiryDate, time.Now().UTC())
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *postgresInventoryRepository) Create(ctx context.Context, branchID int64, item model.InventoryItem) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `INSERT INTO inventory_items(branch_id,name,category,stock_category,kind,quantity,unit,reorder_level,unit_cost,expiry_date) VALUES($1,$2,$3,NULLIF($4,''),$5,$6,$7,$8,$9,$10) RETURNING id`, branchID, item.Name, item.Category, item.StockCategory, item.Kind, item.Quantity, item.Unit, item.ReorderLevel, item.UnitCost, item.ExpiryDate).Scan(&id)
	return id, err
}

func (r *postgresInventoryRepository) Update(ctx context.Context, branchID, id int64, item model.InventoryItem) (bool, error) {
	result, err := r.db.ExecContext(ctx, `UPDATE inventory_items SET name=$1,category=$2,stock_category=NULLIF($3,''),kind=$4,quantity=$5,unit=$6,reorder_level=$7,unit_cost=$8,expiry_date=$9,updated_at=now() WHERE id=$10 AND branch_id=$11`, item.Name, item.Category, item.StockCategory, item.Kind, item.Quantity, item.Unit, item.ReorderLevel, item.UnitCost, item.ExpiryDate, id, branchID)
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	return n > 0, err
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

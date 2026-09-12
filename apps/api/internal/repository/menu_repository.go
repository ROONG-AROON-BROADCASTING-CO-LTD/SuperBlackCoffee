package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"y/internal/model"
)

type MenuRepository interface {
	List(context.Context, int64) ([]model.MenuItem, error)
}
type postgresMenuRepository struct{ db *sql.DB }

func NewPostgresMenuRepository(db *sql.DB) MenuRepository { return &postgresMenuRepository{db: db} }
func (r *postgresMenuRepository) List(ctx context.Context, branchID int64) ([]model.MenuItem, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT m.id,m.name,m.category,m.store_price,m.store_price_available,m.lineman_price,m.lineman_price_available,m.cost_price,m.lineman_cost_price,m.status,m.image_url,m.preparation_steps,COALESCE(json_agg(json_build_object('inventoryItemId',i.id,'name',COALESCE(c.name,i.name),'quantity',mi.quantity,'unit',mi.unit,'costAmount',mi.cost_amount) ORDER BY COALESCE(c.name,i.name)) FILTER (WHERE i.id IS NOT NULL),'[]') FROM menu_items m LEFT JOIN menu_item_ingredients mi ON mi.menu_item_id=m.id LEFT JOIN inventory_items i ON i.id=mi.inventory_item_id LEFT JOIN inventory_catalog_items c ON c.id=i.catalog_item_id WHERE m.branch_id=$1 GROUP BY m.id ORDER BY m.category,m.name`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.MenuItem{}
	for rows.Next() {
		var item model.MenuItem
		var ingredients []byte
		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.StorePrice, &item.StorePriceAvailable, &item.LinemanPrice, &item.LinemanPriceAvailable, &item.CostPrice, &item.LinemanCostPrice, &item.Status, &item.ImageURL, &item.PreparationSteps, &ingredients); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(ingredients, &item.Ingredients); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

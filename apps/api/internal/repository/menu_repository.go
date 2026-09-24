package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"y/internal/model"
)

type MenuRepository interface {
	List(context.Context, int64) ([]model.MenuItem, error)
}
type postgresMenuRepository struct{ db *sql.DB }

func NewPostgresMenuRepository(db *sql.DB) MenuRepository { return &postgresMenuRepository{db: db} }
func (r *postgresMenuRepository) List(ctx context.Context, branchID int64) ([]model.MenuItem, error) {
	rows, err := r.db.QueryContext(ctx, `WITH recipe_by_menu AS (
		SELECT mi.menu_item_id,
			COALESCE(json_agg(json_build_object('inventoryItemId',i.id,'name',COALESCE(c.name,i.name),'quantity',mi.quantity,'unit',mi.unit,'inventoryQuantity',i.quantity,'inventoryUnit',i.unit,'costAmount',mi.cost_amount) ORDER BY COALESCE(c.name,i.name)) FILTER (WHERE i.id IS NOT NULL AND mi.channel='storefront'),'[]') AS storefront_ingredients,
			COALESCE(json_agg(json_build_object('inventoryItemId',i.id,'name',COALESCE(c.name,i.name),'quantity',mi.quantity,'unit',mi.unit,'inventoryQuantity',i.quantity,'inventoryUnit',i.unit,'costAmount',mi.cost_amount) ORDER BY COALESCE(c.name,i.name)) FILTER (WHERE i.id IS NOT NULL AND mi.channel='lineman'),'[]') AS lineman_ingredients
		FROM menu_item_ingredients mi
		JOIN menu_items scoped_menu ON scoped_menu.id=mi.menu_item_id AND scoped_menu.branch_id=$1 AND scoped_menu.template_enabled
		LEFT JOIN inventory_items i ON i.id=mi.inventory_item_id
		LEFT JOIN inventory_catalog_items c ON c.id=i.catalog_item_id
		GROUP BY mi.menu_item_id
	)
	SELECT m.id,m.name,m.category,m.store_price,m.store_price_available,m.lineman_price,m.lineman_price_available,m.cost_price,m.lineman_cost_price,m.status,octet_length(m.image_url)>0,m.preparation_steps,
		COALESCE(r.storefront_ingredients,'[]'), COALESCE(r.lineman_ingredients,'[]')
	FROM menu_items m
	LEFT JOIN recipe_by_menu r ON r.menu_item_id=m.id
	WHERE m.branch_id=$1 AND m.template_enabled
	ORDER BY m.category,m.name`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.MenuItem{}
	for rows.Next() {
		var item model.MenuItem
		var hasImage bool
		var ingredients, linemanIngredients []byte
		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.StorePrice, &item.StorePriceAvailable, &item.LinemanPrice, &item.LinemanPriceAvailable, &item.CostPrice, &item.LinemanCostPrice, &item.Status, &hasImage, &item.PreparationSteps, &ingredients, &linemanIngredients); err != nil {
			return nil, err
		}
		if hasImage {
			item.ImageURL = fmt.Sprintf("/api/v1/menu-items/%d/image?branchId=%d", item.ID, branchID)
		}
		if err := json.Unmarshal(ingredients, &item.Ingredients); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(linemanIngredients, &item.LinemanIngredients); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

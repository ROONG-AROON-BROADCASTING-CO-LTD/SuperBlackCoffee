package handler

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"y/internal/dto"
	"y/internal/model"
)

// menuRecipeStatusTx confirms that every recipe line belongs to the selected
// branch and has enough on-hand stock. Empty recipes remain valid drafts, but
// are never sellable.
func menuRecipeStatusTx(ctx context.Context, tx *sql.Tx, branchID int64, ingredients []dto.MenuIngredientRequest) (model.MenuRecipeStatus, error) {
	if len(ingredients) == 0 {
		return model.MenuRecipeMissing, nil
	}

	type requestedIngredient struct {
		quantity float64
		unit     string
	}
	requested := make(map[int64]requestedIngredient, len(ingredients))
	for _, ingredient := range ingredients {
		unit := normalizeInventoryUnit(ingredient.Unit)
		if ingredient.InventoryItemID < 1 || ingredient.Quantity <= 0 || unit == "" {
			return "", fmt.Errorf("ข้อมูลวัตถุดิบไม่ถูกต้อง")
		}
		if existing, ok := requested[ingredient.InventoryItemID]; ok {
			if existing.unit != unit {
				return "", fmt.Errorf("วัตถุดิบรายการเดียวกันต้องใช้หน่วยเดียวกัน")
			}
			existing.quantity += ingredient.Quantity
			requested[ingredient.InventoryItemID] = existing
			continue
		}
		requested[ingredient.InventoryItemID] = requestedIngredient{
			quantity: ingredient.Quantity,
			unit:     unit,
		}
	}

	status := model.MenuRecipeReady
	for inventoryItemID, ingredient := range requested {
		var quantity float64
		var unit, category string
		var trackStock bool
		var expired bool
		err := tx.QueryRowContext(ctx, `SELECT i.quantity,i.unit,i.category,COALESCE(c.track_stock,true),i.expiry_date IS NOT NULL AND i.expiry_date < CURRENT_DATE FROM inventory_items i LEFT JOIN inventory_catalog_items c ON c.id=i.catalog_item_id WHERE i.id=$1 AND i.branch_id=$2 AND i.template_enabled`, inventoryItemID, branchID).Scan(&quantity, &unit, &category, &trackStock, &expired)
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("ไม่พบวัตถุดิบในสาขาที่เลือก")
		}
		if err != nil {
			return "", err
		}
		if !trackStock {
			continue
		}
		if category == "fresh" {
			var hasTrackedLots bool
			if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM fresh_inventory_lots WHERE branch_id=$1 AND inventory_item_id=$2)`, branchID, inventoryItemID).Scan(&hasTrackedLots); err != nil {
				return "", err
			}
			if hasTrackedLots {
				if err = tx.QueryRowContext(ctx, `SELECT COALESCE(SUM(quantity_remaining),0) FROM fresh_inventory_lots WHERE branch_id=$1 AND inventory_item_id=$2 AND status='active' AND quantity_remaining>0 AND expiry_date >= CURRENT_DATE`, branchID, inventoryItemID).Scan(&quantity); err != nil {
					return "", err
				}
				expired = false
			}
		}
		if expired || normalizeInventoryUnit(unit) != ingredient.unit || quantity < ingredient.quantity {
			status = model.MenuRecipeInsufficientStock
		}
	}
	return status, nil
}

func normalizeInventoryUnit(unit string) string {
	return strings.Trim(strings.ToLower(strings.TrimSpace(unit)), ".")
}

func (h *PlatformHandler) applyMenuRecipeStatuses(ctx context.Context, branchID int64, items []model.MenuItem) error {
	rows, err := h.db.QueryContext(ctx, `
		SELECT m.id, COALESCE(mi.channel, 'storefront'),
			CASE
				WHEN COUNT(mi.inventory_item_id) = 0 THEN 'missing_recipe'
				WHEN BOOL_AND(COALESCE(c.track_stock,true) OR (i.id IS NOT NULL AND i.branch_id=m.branch_id AND lower(trim(trailing '.' FROM i.unit)) = lower(trim(trailing '.' FROM mi.unit)) AND i.quantity >= mi.quantity AND (i.category='fresh' OR i.expiry_date IS NULL OR i.expiry_date >= CURRENT_DATE) AND (i.category <> 'fresh' OR NOT EXISTS (SELECT 1 FROM fresh_inventory_lots legacy_lot WHERE legacy_lot.branch_id=i.branch_id AND legacy_lot.inventory_item_id=i.id) OR COALESCE((SELECT SUM(lot.quantity_remaining) FROM fresh_inventory_lots lot WHERE lot.branch_id=i.branch_id AND lot.inventory_item_id=i.id AND lot.status='active' AND lot.quantity_remaining>0 AND lot.expiry_date>=CURRENT_DATE),0) >= mi.quantity))) THEN 'ready'
				ELSE 'insufficient_stock'
			END
		FROM menu_items m
		LEFT JOIN menu_item_ingredients mi ON mi.menu_item_id=m.id
		LEFT JOIN inventory_items i ON i.id=mi.inventory_item_id
		LEFT JOIN inventory_catalog_items c ON c.id=i.catalog_item_id
		WHERE m.branch_id=$1 AND m.template_enabled
		GROUP BY m.id, mi.channel`, branchID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type recipeStatuses struct {
		storefront model.MenuRecipeStatus
		lineman    model.MenuRecipeStatus
		hasLineman bool
	}
	statuses := make(map[int64]recipeStatuses, len(items))
	for rows.Next() {
		var id int64
		var channel string
		var status model.MenuRecipeStatus
		if err := rows.Scan(&id, &channel, &status); err != nil {
			return err
		}
		current := statuses[id]
		if channel == "lineman" {
			current.lineman = status
			current.hasLineman = true
		} else {
			current.storefront = status
		}
		statuses[id] = current
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for index := range items {
		current := statuses[items[index].ID]
		if !current.hasLineman {
			current.lineman = current.storefront
		}
		items[index].RecipeStatus = current.storefront
		items[index].LinemanRecipeStatus = current.lineman
		items[index].Sellable = items[index].Status == model.MenuStatusAvailable && items[index].RecipeStatus == model.MenuRecipeReady
		items[index].LinemanSellable = items[index].Status == model.MenuStatusAvailable && items[index].LinemanRecipeStatus == model.MenuRecipeReady
	}
	return nil
}

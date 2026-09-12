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
		var unit string
		err := tx.QueryRowContext(ctx, `SELECT quantity,unit FROM inventory_items WHERE id=$1 AND branch_id=$2`, inventoryItemID, branchID).Scan(&quantity, &unit)
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("ไม่พบวัตถุดิบในสาขาที่เลือก")
		}
		if err != nil {
			return "", err
		}
		if normalizeInventoryUnit(unit) != ingredient.unit || quantity < ingredient.quantity {
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
		SELECT m.id,
			CASE
				WHEN COUNT(mi.inventory_item_id) = 0 THEN 'missing_recipe'
				WHEN BOOL_AND(i.id IS NOT NULL AND i.branch_id=m.branch_id AND lower(trim(trailing '.' FROM i.unit)) = lower(trim(trailing '.' FROM mi.unit)) AND i.quantity >= mi.quantity) THEN 'ready'
				ELSE 'insufficient_stock'
			END
		FROM menu_items m
		LEFT JOIN menu_item_ingredients mi ON mi.menu_item_id=m.id
		LEFT JOIN inventory_items i ON i.id=mi.inventory_item_id
		WHERE m.branch_id=$1
		GROUP BY m.id`, branchID)
	if err != nil {
		return err
	}
	defer rows.Close()

	statuses := make(map[int64]model.MenuRecipeStatus, len(items))
	for rows.Next() {
		var id int64
		var status model.MenuRecipeStatus
		if err := rows.Scan(&id, &status); err != nil {
			return err
		}
		statuses[id] = status
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for index := range items {
		items[index].RecipeStatus = statuses[items[index].ID]
		items[index].Sellable = items[index].Status == model.MenuStatusAvailable && items[index].RecipeStatus == model.MenuRecipeReady
	}
	return nil
}

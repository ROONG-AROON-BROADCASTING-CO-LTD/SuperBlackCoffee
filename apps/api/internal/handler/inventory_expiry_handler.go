package handler

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const defaultExpiryWarningDays = 60

type expiryWarningSettingsInput struct {
	WarningDays int `json:"warningDays" binding:"required,min=1,max=365"`
}

func normalizeExpiryWarningDays(days int) int {
	if days < 1 {
		return defaultExpiryWarningDays
	}
	return days
}

func expiryStatusForDays(expiryDate, now time.Time, warningDays int) string {
	today := now.UTC().Truncate(24 * time.Hour)
	if expiryDate.Before(today) {
		return "expired"
	}
	if !expiryDate.After(today.AddDate(0, 0, normalizeExpiryWarningDays(warningDays))) {
		return "expiring_soon"
	}
	return "ready"
}

func (h *PlatformHandler) expiryWarningDays(c *gin.Context, branchID int64) (int, bool) {
	var warningDays int
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT expiry_warning_days FROM branches WHERE id=$1`, branchID).Scan(&warningDays); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่ระบุ"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านการตั้งค่าแจ้งเตือนได้"})
		}
		return 0, false
	}
	return normalizeExpiryWarningDays(warningDays), true
}

func (h *PlatformHandler) GetExpiryWarningSettings(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	warningDays, ok := h.expiryWarningDays(c, branchID)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"warningDays": warningDays}})
}

func (h *PlatformHandler) UpdateExpiryWarningSettings(c *gin.Context) {
	if h.unavailable(c) || !h.ensureCatalogWriteAllowed(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	var input expiryWarningSettingsInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "จำนวนวันแจ้งเตือนต้องอยู่ระหว่าง 1–365 วัน"})
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `UPDATE branches SET expiry_warning_days=$1 WHERE id=$2`, input.WarningDays, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกการตั้งค่าแจ้งเตือนได้"})
		return
	}
	if rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่ระบุ"})
		return
	}
	h.recordAudit(c, branchID, "branch_expiry_settings", branchID, "updated", gin.H{"warningDays": input.WarningDays})
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"warningDays": input.WarningDays}})
}

// ListExpiryAlerts returns the actionable alerts shown to staff. It includes both
// lot-managed stock and legacy fresh stock that has an expiry date but no lot yet.
func (h *PlatformHandler) ListExpiryAlerts(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	warningDays, ok := h.expiryWarningDays(c, branchID)
	if !ok {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		WITH expiring_stock AS (
			SELECT lot.id AS lot_id, lot.inventory_item_id, COALESCE(c.name,item.name) AS ingredient_name,
				lot.lot_number, lot.manufactured_at, lot.expiry_date, lot.quantity_remaining,
				COALESCE(c.unit,item.unit) AS unit
			FROM fresh_inventory_lots lot
			JOIN inventory_items item ON item.id=lot.inventory_item_id
			LEFT JOIN inventory_catalog_items c ON c.id=item.catalog_item_id
			WHERE lot.branch_id=$1 AND lot.status='active' AND lot.quantity_remaining>0
				AND lot.expiry_date <= CURRENT_DATE + $2
			UNION ALL
			SELECT 0::bigint AS lot_id, item.id AS inventory_item_id, COALESCE(c.name,item.name) AS ingredient_name,
				''::text AS lot_number, item.created_at::date AS manufactured_at, item.expiry_date,
				item.quantity AS quantity_remaining, COALESCE(c.unit,item.unit) AS unit
			FROM inventory_items item
			LEFT JOIN inventory_catalog_items c ON c.id=item.catalog_item_id
			WHERE item.branch_id=$1 AND COALESCE(c.category,item.category)='fresh'
				AND item.quantity>0 AND item.expiry_date IS NOT NULL
				AND item.expiry_date <= CURRENT_DATE + $2
				AND NOT EXISTS (
					SELECT 1 FROM fresh_inventory_lots lot
					WHERE lot.branch_id=item.branch_id AND lot.inventory_item_id=item.id
						AND lot.status='active' AND lot.quantity_remaining>0
				)
		)
		SELECT lot_id,inventory_item_id,ingredient_name,lot_number,manufactured_at,expiry_date,quantity_remaining,unit,
			(expiry_date - CURRENT_DATE)::integer
		FROM expiring_stock
		ORDER BY expiry_date, ingredient_name, lot_id`, branchID, warningDays)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านการแจ้งเตือนวันหมดอายุได้"})
		return
	}
	defer rows.Close()
	alerts := make([]gin.H, 0)
	for rows.Next() {
		var lotID, inventoryItemID int64
		var ingredientName, lotNumber, unit string
		var manufacturedAt, expiryDate time.Time
		var quantityRemaining float64
		var daysUntilExpiry int
		if err := rows.Scan(&lotID, &inventoryItemID, &ingredientName, &lotNumber, &manufacturedAt, &expiryDate, &quantityRemaining, &unit, &daysUntilExpiry); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านการแจ้งเตือนวันหมดอายุได้"})
			return
		}
		alerts = append(alerts, gin.H{
			"lotId": lotID, "inventoryItemId": inventoryItemID, "ingredientName": ingredientName,
			"lotNumber": lotNumber, "manufacturedAt": manufacturedAt.Format("2006-01-02"),
			"expiryDate": expiryDate.Format("2006-01-02"), "quantityRemaining": quantityRemaining,
			"unit": unit, "daysUntilExpiry": daysUntilExpiry,
			"expiryStatus": expiryStatusForDays(expiryDate, time.Now(), warningDays),
		})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านการแจ้งเตือนวันหมดอายุได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"warningDays": warningDays, "alerts": alerts}})
}

// ListExpiryPromotionSuggestions connects unexpired fresh stock to menu recipes.
// A suggested discount is deliberately conservative and is only a draft for a manager to review.
func (h *PlatformHandler) ListExpiryPromotionSuggestions(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	warningDays, ok := h.expiryWarningDays(c, branchID)
	if !ok {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		WITH expiring_stock AS (
			SELECT lot.id AS lot_id, lot.inventory_item_id, COALESCE(c.name,item.name) AS ingredient_name,
				lot.lot_number, lot.expiry_date, lot.quantity_remaining, COALESCE(c.unit,item.unit) AS unit
			FROM fresh_inventory_lots lot
			JOIN inventory_items item ON item.id=lot.inventory_item_id
			LEFT JOIN inventory_catalog_items c ON c.id=item.catalog_item_id
			WHERE lot.branch_id=$1 AND lot.status='active' AND lot.quantity_remaining>0
				AND lot.expiry_date >= CURRENT_DATE AND lot.expiry_date <= CURRENT_DATE + $2
			UNION ALL
			SELECT 0::bigint AS lot_id, item.id AS inventory_item_id, COALESCE(c.name,item.name) AS ingredient_name,
				''::text AS lot_number, item.expiry_date, item.quantity AS quantity_remaining,
				COALESCE(c.unit,item.unit) AS unit
			FROM inventory_items item
			LEFT JOIN inventory_catalog_items c ON c.id=item.catalog_item_id
			WHERE item.branch_id=$1 AND COALESCE(c.category,item.category)='fresh'
				AND item.quantity>0 AND item.expiry_date IS NOT NULL
				AND item.expiry_date >= CURRENT_DATE AND item.expiry_date <= CURRENT_DATE + $2
				AND NOT EXISTS (
					SELECT 1 FROM fresh_inventory_lots lot
					WHERE lot.branch_id=item.branch_id AND lot.inventory_item_id=item.id
						AND lot.status='active' AND lot.quantity_remaining>0
				)
		)
		SELECT DISTINCT m.id,m.name,m.category,m.store_price,
			stock.lot_id,stock.inventory_item_id,stock.ingredient_name,stock.lot_number,
			stock.expiry_date,stock.quantity_remaining,stock.unit,
			(stock.expiry_date - CURRENT_DATE)::integer
		FROM expiring_stock stock
		JOIN menu_item_ingredients recipe ON recipe.inventory_item_id=stock.inventory_item_id
		JOIN menu_items m ON m.id=recipe.menu_item_id AND m.branch_id=$1
		WHERE m.template_enabled AND m.status='available'
		ORDER BY stock.expiry_date, m.name, stock.lot_id
		LIMIT 50`, branchID, warningDays)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างคำแนะนำโปรโมชันได้"})
		return
	}
	defer rows.Close()
	suggestions := make([]gin.H, 0)
	for rows.Next() {
		var menuID, lotID, inventoryItemID int64
		var menuName, category, ingredientName, lotNumber, unit string
		var storePrice, quantityRemaining float64
		var expiryDate time.Time
		var daysUntilExpiry int
		if err := rows.Scan(&menuID, &menuName, &category, &storePrice, &lotID, &inventoryItemID, &ingredientName, &lotNumber, &expiryDate, &quantityRemaining, &unit, &daysUntilExpiry); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างคำแนะนำโปรโมชันได้"})
			return
		}
		discountPercent := 10
		if daysUntilExpiry <= 7 {
			discountPercent = 25
		} else if daysUntilExpiry <= 14 {
			discountPercent = 20
		} else if daysUntilExpiry <= 30 {
			discountPercent = 15
		}
		suggestions = append(suggestions, gin.H{
			"menuId": menuID, "menuName": menuName, "category": category, "storePrice": storePrice,
			"lotId": lotID, "inventoryItemId": inventoryItemID, "ingredientName": ingredientName,
			"lotNumber": lotNumber, "expiryDate": expiryDate.Format("2006-01-02"),
			"quantityRemaining": quantityRemaining, "unit": unit, "daysUntilExpiry": daysUntilExpiry,
			"suggestedDiscountPercent": discountPercent,
			"reason":                   "ใช้ " + ingredientName + " จากล็อตใกล้หมดอายุ",
		})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างคำแนะนำโปรโมชันได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"warningDays": warningDays, "suggestions": suggestions}})
}

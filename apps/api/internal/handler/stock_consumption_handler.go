package handler

import (
	"database/sql"
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

type stockConsumptionItem struct {
	MenuItemID int64   `json:"menuItemId" binding:"required,gt=0"`
	Quantity   float64 `json:"quantity" binding:"required,gt=0"`
	// Channel is optional for backwards compatibility. Excel imports send it per
	// row so storefront and LINE MAN recipes remain separate in one atomic cut.
	Channel string `json:"channel" binding:"omitempty,oneof=storefront lineman"`
}
type stockConsumptionInput struct {
	Items   []stockConsumptionItem `json:"items" binding:"required,min=1,dive"`
	Note    string                 `json:"note" binding:"required,max=500"`
	Channel string                 `json:"channel" binding:"required,oneof=storefront lineman"`
}

// ConsumeStockFromMenus calculates recipe consumption server-side and records it atomically.
func (h *PlatformHandler) ConsumeStockFromMenus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input stockConsumptionInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลเมนูที่ขายไม่ถูกต้อง"})
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดสต๊อกได้"})
		return
	}
	defer tx.Rollback()
	required := map[int64]float64{}
	channels := map[string]bool{}
	for _, item := range input.Items {
		itemChannel := input.Channel
		if item.Channel != "" {
			itemChannel = item.Channel
		}
		channels[itemChannel] = true
		var name, status string
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT name,status FROM menu_items WHERE id=$1 AND branch_id=$2`, item.MenuItemID, branchID).Scan(&name, &status); err == sql.ErrNoRows {
			c.JSON(404, gin.H{"success": false, "message": "ไม่พบเมนูที่เลือก"})
			return
		} else if err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
			return
		}
		if status != "available" {
			c.JSON(400, gin.H{"success": false, "message": "เมนู " + name + " ไม่พร้อมขาย"})
			return
		}
		rows, queryErr := tx.QueryContext(c.Request.Context(), `SELECT inventory_item_id,quantity FROM menu_item_ingredients WHERE menu_item_id=$1 AND channel=$2`, item.MenuItemID, itemChannel)
		if queryErr != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
			return
		}
		hasRecipe := false
		for rows.Next() {
			var inventoryID int64
			var amount float64
			if err = rows.Scan(&inventoryID, &amount); err != nil {
				rows.Close()
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
				return
			}
			required[inventoryID] += amount * item.Quantity
			hasRecipe = true
		}
		rows.Close()
		// Legacy menus may only have a storefront recipe. LINE MAN inherits
		// that recipe until an administrator saves a channel-specific one.
		if !hasRecipe && itemChannel == "lineman" {
			fallbackRows, fallbackErr := tx.QueryContext(c.Request.Context(), `SELECT inventory_item_id,quantity FROM menu_item_ingredients WHERE menu_item_id=$1 AND channel='storefront'`, item.MenuItemID)
			if fallbackErr != nil {
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
				return
			}
			for fallbackRows.Next() {
				var inventoryID int64
				var amount float64
				if err = fallbackRows.Scan(&inventoryID, &amount); err != nil {
					fallbackRows.Close()
					c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
					return
				}
				required[inventoryID] += amount * item.Quantity
				hasRecipe = true
			}
			fallbackRows.Close()
		}
		if !hasRecipe {
			channelName := "หน้าร้าน"
			if itemChannel == "lineman" {
				channelName = "LINE MAN"
			}
			c.JSON(400, gin.H{"success": false, "message": "เมนู " + name + " ยังไม่มีสูตรวัตถุดิบสำหรับ " + channelName})
			return
		}
	}
	ids := make([]int64, 0, len(required))
	for id := range required {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	claims := middleware.ClaimsFrom(c)
	for _, inventoryID := range ids {
		var before float64
		var name string
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT quantity,name FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, inventoryID, branchID).Scan(&before, &name); err != nil {
			c.JSON(400, gin.H{"success": false, "message": "ไม่พบวัตถุดิบในสูตร"})
			return
		}
		after := before - required[inventoryID]
		if after < 0 {
			c.JSON(400, gin.H{"success": false, "message": "วัตถุดิบ " + name + " คงเหลือไม่พอ"})
			return
		}
		if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=$1,updated_at=now() WHERE id=$2`, after, inventoryID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดสต๊อกได้"})
			return
		}
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, inventoryID, "menu_consumption", -required[inventoryID], before, after, "stock_menu_consumption", nil, input.Note, claims.UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติสต๊อกได้"})
			return
		}
	}
	menuQuantity := 0.0
	for _, item := range input.Items {
		menuQuantity += item.Quantity
	}
	auditChannel := input.Channel
	if len(channels) > 1 {
		auditChannel = "mixed"
	}
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "stock_consumption", 0, "consumed", gin.H{"itemCount": len(input.Items), "menuQuantity": menuQuantity, "channel": auditChannel, "note": input.Note}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดสต๊อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"menuCount": len(input.Items)}})
}

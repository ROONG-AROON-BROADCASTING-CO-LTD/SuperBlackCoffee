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
}
type stockConsumptionInput struct {
	Items []stockConsumptionItem `json:"items" binding:"required,min=1,dive"`
	Note  string                 `json:"note" binding:"required,max=500"`
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
	for _, item := range input.Items {
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
		rows, queryErr := tx.QueryContext(c.Request.Context(), `SELECT inventory_item_id,quantity FROM menu_item_ingredients WHERE menu_item_id=$1`, item.MenuItemID)
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
		if !hasRecipe {
			c.JSON(400, gin.H{"success": false, "message": "เมนู " + name + " ยังไม่มีสูตรวัตถุดิบ"})
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
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "stock_consumption", 0, "consumed", gin.H{"itemCount": len(input.Items), "note": input.Note}); err != nil {
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

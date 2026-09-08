package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/dto"
	"y/internal/middleware"
	"y/internal/model"
)

func (h *PlatformHandler) ListMenuItems(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok {
		return
	}
	cacheKey := "sbc:menu:" + strconv.FormatInt(branchID, 10) + ":" + plan
	var cached []model.MenuItem
	if h.cache.GetJSON(c, cacheKey, &cached) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": cached})
		return
	}
	result, err := h.menu.List(c.Request.Context(), branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงรายการเมนูได้"})
		return
	}
	result = h.filterMenuForPlan(plan, result)
	h.cache.SetJSON(c, cacheKey, result, 30*time.Second)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

// CreateMenuItem creates a menu item and its recipe atomically for the selected branch.
func (h *PlatformHandler) CreateMenuItem(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	if !h.ensureCatalogWriteAllowed(c) {
		return
	}
	var input dto.MenuRequest
	if err := c.ShouldBindJSON(&input); err != nil || input.Name == "" || input.Category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลเมนูไม่ถูกต้อง"})
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok {
		return
	}
	if !menuAllowedForPlan(plan, input.Category) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "แพ็กเกจแฟรนไชส์นี้ไม่รองรับหมวดหมู่เมนูดังกล่าว"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างเมนูได้"})
		return
	}
	defer tx.Rollback()
	var id int64
	err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,lineman_cost_price,status) VALUES($1,$2,$3,$4,$5,$6,$7,'available') RETURNING id`, branchID, input.Name, input.Category, input.StorePrice, input.LinemanPrice, input.CostPrice, input.LinemanCostPrice).Scan(&id)
	for _, ingredient := range input.Ingredients {
		if err != nil {
			break
		}
		_, err = tx.ExecContext(c.Request.Context(), `INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount) VALUES($1,$2,$3,$4,0)`, id, ingredient.InventoryItemID, ingredient.Quantity, ingredient.Unit)
	}
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างเมนูได้"})
		return
	}
	if err = recordAuditTx(c, tx, branchID, middleware.ClaimsFrom(c).UserID, "menu_item", id, "created", gin.H{"name": input.Name}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างเมนูได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) UpdateMenuItem(c *gin.Context) { h.writeMenuItem(c) }
func (h *PlatformHandler) writeMenuItem(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	if !h.ensureCatalogWriteAllowed(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสเมนูไม่ถูกต้อง"})
		return
	}
	var input dto.MenuRequest
	if c.ShouldBindJSON(&input) != nil || input.Name == "" || input.Category == "" {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลเมนูไม่ถูกต้อง"})
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok {
		return
	}
	if !menuAllowedForPlan(plan, input.Category) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "แพ็กเกจแฟรนไชส์นี้ไม่รองรับหมวดหมู่เมนูดังกล่าว"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขเมนูได้"})
		return
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(c.Request.Context(), `UPDATE menu_items SET name=$1,category=$2,store_price=$3,store_price_available=true,lineman_price=$4,lineman_price_available=true,cost_price=$5,lineman_cost_price=$6,updated_at=now() WHERE id=$7 AND branch_id=$8`, input.Name, input.Category, input.StorePrice, input.LinemanPrice, input.CostPrice, input.LinemanCostPrice, id, branchID)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบเมนู"})
		return
	}
	_, err = tx.ExecContext(c.Request.Context(), `DELETE FROM menu_item_ingredients WHERE menu_item_id=$1`, id)
	for _, ingredient := range input.Ingredients {
		if err != nil {
			break
		}
		_, err = tx.ExecContext(c.Request.Context(), `INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount) VALUES($1,$2,$3,$4,0)`, id, ingredient.InventoryItemID, ingredient.Quantity, ingredient.Unit)
	}
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขเมนูได้"})
		return
	}
	if err = recordAuditTx(c, tx, branchID, middleware.ClaimsFrom(c).UserID, "menu_item", id, "updated", gin.H{"name": input.Name}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขเมนูได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(200, gin.H{"success": true, "data": gin.H{"id": id}})
}
func (h *PlatformHandler) DeleteMenuItem(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	if !h.ensureCatalogWriteAllowed(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสเมนูไม่ถูกต้อง"})
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok || !h.ensureMenuDeleteAllowed(c, plan, branchID, id) {
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `DELETE FROM menu_items WHERE id=$1 AND branch_id=$2`, id, branchID)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบเมนู"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.Status(http.StatusNoContent)
}

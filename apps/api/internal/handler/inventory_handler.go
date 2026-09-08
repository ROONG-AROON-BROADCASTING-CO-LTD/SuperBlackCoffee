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

func (h *PlatformHandler) ListInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	kind := c.Query("kind")
	if kind != "" && kind != "ingredient" && kind != "stock" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "kind ต้องเป็น ingredient หรือ stock"})
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok {
		return
	}
	if plan != franchisePlanL && kind == "stock" {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "แพ็กเกจแฟรนไชส์นี้ไม่มีสิทธิ์เข้าถึงสต็อก"})
		return
	}
	cacheKey := "sbc:inventory:" + strconv.FormatInt(branchID, 10)
	if kind != "" {
		cacheKey += ":" + kind
	}
	cacheKey += ":" + plan
	var cached []model.InventoryItem
	if h.cache.GetJSON(c, cacheKey, &cached) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": cached})
		return
	}
	result, err := h.inventory.List(c.Request.Context(), branchID, kind)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดึงรายการสต็อกได้"})
		return
	}
	result, err = h.filterInventoryForPlan(c, plan, branchID, result)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถกรองรายการตามแพ็กเกจแฟรนไชส์ได้"})
		return
	}
	h.cache.SetJSON(c, cacheKey, result, 30*time.Second)
	c.JSON(200, gin.H{"success": true, "data": result})
}

type inventoryInput = dto.InventoryRequest

func (h *PlatformHandler) CreateInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	if !h.ensureCatalogWriteAllowed(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	var input inventoryInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลรายการสต็อกไม่ถูกต้อง"})
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok {
		return
	}
	item := model.InventoryItem{Name: input.Name, Category: defaultString(input.Category, "other"), Kind: model.InventoryKind(defaultString(input.Kind, "ingredient")), Quantity: input.Quantity, Unit: input.Unit, ReorderLevel: input.ReorderLevel, UnitCost: input.UnitCost}
	if plan != franchisePlanL && item.Kind == model.InventoryKindStock {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "แพ็กเกจแฟรนไชส์นี้ไม่มีสิทธิ์จัดการสต็อก"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างรายการสต็อกได้"})
		return
	}
	defer tx.Rollback()
	var id int64
	err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO inventory_items(branch_id,name,category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, branchID, item.Name, item.Category, item.Kind, item.Quantity, item.Unit, item.ReorderLevel, item.UnitCost).Scan(&id)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างรายการสต็อกได้"})
		return
	}
	if item.Quantity != 0 {
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, id, "initial", item.Quantity, 0, item.Quantity, "inventory_item", &id, "ยอดตั้งต้นของรายการสต๊อก", middleware.ClaimsFrom(c).UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติรายการสต๊อกได้"})
			return
		}
	}
	if err = recordAuditTx(c, tx, branchID, middleware.ClaimsFrom(c).UserID, "inventory_item", id, "created", gin.H{"name": item.Name, "quantity": item.Quantity, "unit": item.Unit}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติรายการสต็อกได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างรายการสต็อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) UpdateInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	if !h.ensureCatalogWriteAllowed(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสรายการสต็อกไม่ถูกต้อง"})
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok || !h.ensureInventoryWriteAllowed(c, plan, branchID, id) {
		return
	}
	var input inventoryInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลรายการสต็อกไม่ถูกต้อง"})
		return
	}
	item := model.InventoryItem{Name: input.Name, Category: defaultString(input.Category, "other"), Kind: model.InventoryKind(defaultString(input.Kind, "ingredient")), Quantity: input.Quantity, Unit: input.Unit, ReorderLevel: input.ReorderLevel, UnitCost: input.UnitCost}
	if plan != franchisePlanL && item.Kind == model.InventoryKindStock {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "แพ็กเกจแฟรนไชส์นี้ไม่มีสิทธิ์จัดการสต็อก"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขรายการสต็อกได้"})
		return
	}
	defer tx.Rollback()
	var previousQuantity float64
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT quantity FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, id, branchID).Scan(&previousQuantity); err != nil {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบรายการสต็อก"})
		return
	}
	result, err := tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET name=$1,category=$2,kind=$3,quantity=$4,unit=$5,reorder_level=$6,unit_cost=$7,updated_at=now() WHERE id=$8 AND branch_id=$9`, item.Name, item.Category, item.Kind, item.Quantity, item.Unit, item.ReorderLevel, item.UnitCost, id, branchID)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขรายการสต็อกได้"})
		return
	}
	if item.Quantity != previousQuantity {
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, id, "adjustment", item.Quantity-previousQuantity, previousQuantity, item.Quantity, "inventory_item", &id, "ปรับยอดผ่านการแก้ไขรายการสต๊อก", middleware.ClaimsFrom(c).UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติรายการสต๊อกได้"})
			return
		}
	}
	if err = recordAuditTx(c, tx, branchID, middleware.ClaimsFrom(c).UserID, "inventory_item", id, "updated", gin.H{"name": item.Name, "quantity": item.Quantity, "unit": item.Unit}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติรายการสต็อกได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขรายการสต็อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(200, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) DeleteInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	if !h.ensureCatalogWriteAllowed(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสรายการสต็อกไม่ถูกต้อง"})
		return
	}
	plan, ok := h.requestPlan(c)
	if !ok || !h.ensureInventoryWriteAllowed(c, plan, branchID, id) {
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถลบรายการสต็อกได้"})
		return
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(c.Request.Context(), `DELETE FROM inventory_items WHERE id=$1 AND branch_id=$2`, id, branchID)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบรายการสต็อก"})
		return
	}
	if err = recordAuditTx(c, tx, branchID, middleware.ClaimsFrom(c).UserID, "inventory_item", id, "deleted", nil); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติรายการสต็อกได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถลบรายการสต็อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.Status(http.StatusNoContent)
}

type requestItemInput = dto.StockRequestItem
type requestInput = dto.StockRequest

package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
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
	stockCategory := c.Query("stockCategory")
	if stockCategory != "" && kind != "stock" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "stockCategory ใช้ได้กับ kind=stock เท่านั้น"})
		return
	}
	if stockCategory != "" && stockCategory != "drink_equipment" && stockCategory != "postal_equipment" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "stockCategory ไม่ถูกต้อง"})
		return
	}
	plan, ok := h.requestPlan(c, branchID)
	if !ok {
		return
	}
	cacheKey := "sbc:inventory:" + strconv.FormatInt(branchID, 10)
	if kind != "" {
		cacheKey += ":" + kind
	}
	if stockCategory != "" {
		cacheKey += ":" + stockCategory
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
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถกรองรายการตามขนาดสาขาได้"})
		return
	}
	if stockCategory != "" {
		filtered := make([]model.InventoryItem, 0, len(result))
		for _, item := range result {
			if item.StockCategory == stockCategory {
				filtered = append(filtered, item)
			}
		}
		result = filtered
	}
	h.cache.SetJSON(c, cacheKey, result, 30*time.Second)
	c.JSON(200, gin.H{"success": true, "data": result})
}

type inventoryInput = dto.InventoryRequest

func inventoryDeleteError(err error) (int, string) {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return http.StatusConflict, "ลบไม่ได้ เพราะวัตถุดิบนี้ถูกใช้งานอยู่ในสูตรหรือประวัติสต๊อก"
	}
	return http.StatusInternalServerError, "ไม่สามารถลบรายการสต๊อกได้"
}

func expiryDateFromInput(input inventoryInput) (*time.Time, error) {
	if input.ExpiryDate == nil || strings.TrimSpace(*input.ExpiryDate) == "" {
		return nil, nil
	}
	expiryDate, err := time.Parse("2006-01-02", strings.TrimSpace(*input.ExpiryDate))
	if err != nil {
		return nil, err
	}
	return &expiryDate, nil
}

func inventoryItemFromInput(input inventoryInput, expiryDate *time.Time) model.InventoryItem {
	kind := model.InventoryKind(defaultString(input.Kind, "ingredient"))
	stockCategory := ""
	if kind == model.InventoryKindStock {
		stockCategory = defaultString(input.StockCategory, "drink_equipment")
	}
	return model.InventoryItem{
		Name:          input.Name,
		Category:      defaultString(input.Category, "other"),
		StockCategory: stockCategory,
		Kind:          kind,
		Quantity:      input.Quantity,
		Unit:          input.Unit,
		ReorderLevel:  input.ReorderLevel,
		UnitCost:      input.UnitCost,
		TrackStock:    input.TrackStock,
		ImageURL:      input.ImageURL,
		ExpiryDate:    expiryDate,
	}
}

// applyCatalogTracking keeps branch-only stock fields aligned with the
// effective catalog setting. The catalog is authoritative because another
// branch can create the same named item without sending trackStock.
func applyCatalogTracking(item *model.InventoryItem, trackStock bool) {
	if trackStock {
		return
	}
	item.Quantity = 0
	item.ReorderLevel = 0
	item.ExpiryDate = nil
}

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
	expiryDate, err := expiryDateFromInput(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันหมดอายุต้องอยู่ในรูปแบบ YYYY-MM-DD"})
		return
	}
	_, ok = h.requestPlan(c, branchID)
	if !ok {
		return
	}
	item := inventoryItemFromInput(input, expiryDate)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างรายการสต็อกได้"})
		return
	}
	defer tx.Rollback()
	catalogID, trackStock, err := ensureInventoryCatalogTx(c.Request.Context(), tx, item)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกข้อมูลกลางของรายการสต็อกได้"})
		return
	}
	applyCatalogTracking(&item, trackStock)
	if item.Category == "fresh" && item.Quantity > 0 && item.ExpiryDate == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วัตถุดิบของสดที่มีจำนวนตั้งต้นต้องระบุวันหมดอายุ"})
		return
	}
	var id int64
	err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO inventory_items(branch_id,catalog_item_id,name,category,stock_category,kind,quantity,unit,reorder_level,unit_cost,expiry_date) VALUES($1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,$9,$10,$11) RETURNING id`, branchID, catalogID, item.Name, item.Category, item.StockCategory, item.Kind, item.Quantity, item.Unit, item.ReorderLevel, item.UnitCost, item.ExpiryDate).Scan(&id)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างรายการสต็อกได้"})
		return
	}
	if trackStock && item.Quantity != 0 {
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, id, "initial", item.Quantity, 0, item.Quantity, "inventory_item", &id, "ยอดตั้งต้นของรายการสต๊อก", middleware.ClaimsFrom(c).UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติรายการสต๊อกได้"})
			return
		}
	}
	if item.Category == "fresh" && item.Quantity > 0 {
		var lotID int64
		if err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO fresh_inventory_lots(branch_id,inventory_item_id,manufactured_at,received_at,expiry_date,quantity_received,quantity_remaining,unit_cost) VALUES($1,$2,CURRENT_DATE,CURRENT_DATE,$3,$4,$4,$5) RETURNING id`, branchID, id, item.ExpiryDate, item.Quantity, item.UnitCost).Scan(&lotID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างล็อตตั้งต้นของวัตถุดิบสดได้"})
			return
		}
		if err = recordFreshLotMovementTx(c, tx, branchID, lotID, id, "received", item.Quantity, 0, item.Quantity, "ยอดตั้งต้นของวัตถุดิบสด", middleware.ClaimsFrom(c).UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติลอตตั้งต้นของวัตถุดิบสดได้"})
			return
		}
	}
	if err = recordAuditTx(c, tx, branchID, middleware.ClaimsFrom(c).UserID, "inventory_item", id, "created", gin.H{"name": item.Name, "quantity": item.Quantity, "unit": item.Unit, "expiryDate": item.ExpiryDate}); err != nil {
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
	plan, ok := h.requestPlan(c, branchID)
	if !ok || !h.ensureInventoryWriteAllowed(c, plan, branchID, id) {
		return
	}
	var input inventoryInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลรายการสต็อกไม่ถูกต้อง"})
		return
	}
	expiryDate, err := expiryDateFromInput(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันหมดอายุต้องอยู่ในรูปแบบ YYYY-MM-DD"})
		return
	}
	item := inventoryItemFromInput(input, expiryDate)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขรายการสต็อกได้"})
		return
	}
	defer tx.Rollback()
	catalogID, trackStock, err := ensureInventoryCatalogTx(c.Request.Context(), tx, item)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกข้อมูลกลางของรายการสต็อกได้"})
		return
	}
	applyCatalogTracking(&item, trackStock)
	var previousQuantity float64
	var previousCategory string
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT quantity,category FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, id, branchID).Scan(&previousQuantity, &previousCategory); err != nil {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบรายการสต็อก"})
		return
	}
	if previousCategory == "fresh" {
		var hasLots bool
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM fresh_inventory_lots WHERE branch_id=$1 AND inventory_item_id=$2)`, branchID, id).Scan(&hasLots); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบล็อตของสดได้"})
			return
		}
		if hasLots && item.Quantity != previousQuantity {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "โปรดใช้การรับล็อตหรือตัดทิ้งล็อตเพื่อปรับยอดวัตถุดิบของสด"})
			return
		}
	}
	result, err := tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET catalog_item_id=$1,quantity=$2,reorder_level=$3,expiry_date=$4,updated_at=now() WHERE id=$5 AND branch_id=$6`, catalogID, item.Quantity, item.ReorderLevel, item.ExpiryDate, id, branchID)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถแก้ไขรายการสต็อกได้"})
		return
	}
	if trackStock && item.Quantity != previousQuantity {
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, id, "adjustment", item.Quantity-previousQuantity, previousQuantity, item.Quantity, "inventory_item", &id, "ปรับยอดผ่านการแก้ไขรายการสต๊อก", middleware.ClaimsFrom(c).UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติรายการสต๊อกได้"})
			return
		}
	}
	if err = recordAuditTx(c, tx, branchID, middleware.ClaimsFrom(c).UserID, "inventory_item", id, "updated", gin.H{"name": item.Name, "quantity": item.Quantity, "unit": item.Unit, "expiryDate": item.ExpiryDate}); err != nil {
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
	plan, ok := h.requestPlan(c, branchID)
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
	if err != nil {
		status, message := inventoryDeleteError(err)
		c.JSON(status, gin.H{"success": false, "message": message})
		return
	}
	if rowsAffected(result) == 0 {
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

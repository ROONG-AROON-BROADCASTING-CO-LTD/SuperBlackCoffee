package handler

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

type freshLotReceiptInput struct {
	LotNumber      string  `json:"lotNumber" binding:"max=120"`
	ManufacturedAt string  `json:"manufacturedAt" binding:"required"`
	ReceivedAt     string  `json:"receivedAt" binding:"required"`
	ExpiryDate     string  `json:"expiryDate" binding:"required"`
	Quantity       float64 `json:"quantity" binding:"required,gt=0"`
	UnitCost       float64 `json:"unitCost" binding:"gte=0"`
	Note           string  `json:"note" binding:"max=500"`
}

type freshLotDiscardInput struct {
	Quantity float64 `json:"quantity" binding:"required,gt=0"`
	Note     string  `json:"note" binding:"max=500"`
}

func freshLotDate(value string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(value))
}

func freshLotExpiryStatus(expiryDate, now time.Time) string {
	return expiryStatusForDays(expiryDate, now, defaultExpiryWarningDays)
}

func recordFreshLotMovementTx(ctx *gin.Context, tx *sql.Tx, branchID, lotID, inventoryItemID int64, movementType string, delta, before, after float64, note string, actorID int64) error {
	_, err := tx.ExecContext(ctx.Request.Context(), `INSERT INTO fresh_inventory_lot_movements(branch_id,lot_id,inventory_item_id,movement_type,quantity_delta,quantity_before,quantity_after,note,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, branchID, lotID, inventoryItemID, movementType, delta, before, after, note, actorID)
	return err
}

func (h *PlatformHandler) ListFreshInventoryLots(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	inventoryID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || inventoryID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสวัตถุดิบไม่ถูกต้อง"})
		return
	}
	warningDays, ok := h.expiryWarningDays(c, branchID)
	if !ok {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,lot_number,manufactured_at,received_at,expiry_date,quantity_received,quantity_remaining,unit_cost,status,discard_reason,created_at FROM fresh_inventory_lots WHERE inventory_item_id=$1 AND branch_id=$2 ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END, expiry_date, received_at, id`, inventoryID, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านล็อตของสดได้"})
		return
	}
	defer rows.Close()
	result := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var lotNumber, status, discardReason string
		var manufacturedAt, receivedAt, expiryDate, createdAt time.Time
		var quantityReceived, quantityRemaining, unitCost float64
		if err := rows.Scan(&id, &lotNumber, &manufacturedAt, &receivedAt, &expiryDate, &quantityReceived, &quantityRemaining, &unitCost, &status, &discardReason, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านล็อตของสดได้"})
			return
		}
		expiryStatus := expiryStatusForDays(expiryDate, time.Now(), warningDays)
		result = append(result, gin.H{"id": id, "lotNumber": lotNumber, "manufacturedAt": manufacturedAt.Format("2006-01-02"), "receivedAt": receivedAt.Format("2006-01-02"), "expiryDate": expiryDate.Format("2006-01-02"), "quantityReceived": quantityReceived, "quantityRemaining": quantityRemaining, "unitCost": unitCost, "status": status, "expiryStatus": expiryStatus, "discardReason": discardReason, "createdAt": createdAt})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านล็อตของสดได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) ReceiveFreshInventoryLot(c *gin.Context) {
	if h.unavailable(c) || !h.ensureCatalogWriteAllowed(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	inventoryID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || inventoryID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสวัตถุดิบไม่ถูกต้อง"})
		return
	}
	var input freshLotReceiptInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลล็อตของสดไม่ถูกต้อง"})
		return
	}
	receivedAt, err := freshLotDate(input.ReceivedAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันที่รับเข้าต้องอยู่ในรูปแบบ YYYY-MM-DD"})
		return
	}
	manufacturedAt, err := freshLotDate(input.ManufacturedAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันผลิตต้องอยู่ในรูปแบบ YYYY-MM-DD"})
		return
	}
	expiryDate, err := freshLotDate(input.ExpiryDate)
	if err != nil || expiryDate.Before(manufacturedAt) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันหมดอายุต้องไม่ก่อนวันผลิต"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถรับของสดเข้าสต๊อกได้"})
		return
	}
	defer tx.Rollback()
	var before float64
	var name, unit, category string
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT quantity,name,unit,category FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, inventoryID, branchID).Scan(&before, &name, &unit, &category); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบวัตถุดิบของสด"})
		return
	}
	if category != "fresh" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รับล็อตได้เฉพาะวัตถุดิบของสด"})
		return
	}
	var lotID int64
	if err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO fresh_inventory_lots(branch_id,inventory_item_id,lot_number,manufactured_at,received_at,expiry_date,quantity_received,quantity_remaining,unit_cost) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8) RETURNING id`, branchID, inventoryID, strings.TrimSpace(input.LotNumber), manufacturedAt, receivedAt, expiryDate, input.Quantity, input.UnitCost).Scan(&lotID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกล็อตของสดได้"})
		return
	}
	after := before + input.Quantity
	claims := middleware.ClaimsFrom(c)
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=$1,updated_at=now() WHERE id=$2`, after, inventoryID); err == nil {
		err = recordFreshLotMovementTx(c, tx, branchID, lotID, inventoryID, "received", input.Quantity, 0, input.Quantity, input.Note, claims.UserID)
	}
	if err == nil {
		err = recordStockMovementTx(c.Request.Context(), tx, branchID, inventoryID, "fresh_lot_receipt", input.Quantity, before, after, "fresh_inventory_lot", &lotID, input.Note, claims.UserID)
	}
	if err == nil {
		err = recordAuditTx(c, tx, branchID, claims.UserID, "fresh_inventory_lot", lotID, "received", gin.H{
			"inventoryItemId": inventoryID, "name": name, "lotNumber": strings.TrimSpace(input.LotNumber),
			"quantity": input.Quantity, "unit": unit, "quantityBefore": before, "quantityAfter": after,
			"manufacturedAt": manufacturedAt, "receivedAt": receivedAt, "expiryDate": expiryDate,
			"unitCost": input.UnitCost, "note": input.Note,
		})
	}
	if err != nil || tx.Commit() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถรับของสดเข้าสต๊อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": lotID, "quantity": after}})
}

func (h *PlatformHandler) DiscardFreshInventoryLot(c *gin.Context) {
	if h.unavailable(c) || !h.ensureCatalogWriteAllowed(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	lotID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || lotID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสล็อตของสดไม่ถูกต้อง"})
		return
	}
	var input freshLotDiscardInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลการตัดทิ้งไม่ถูกต้อง"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตัดทิ้งของสดได้"})
		return
	}
	defer tx.Rollback()
	var inventoryID int64
	var lotBefore, inventoryBefore float64
	var status, name, lotNumber, unit string
	var lotExpiry time.Time
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT lot.inventory_item_id,lot.quantity_remaining,lot.status,item.quantity,item.name,lot.lot_number,lot.expiry_date,item.unit FROM fresh_inventory_lots lot JOIN inventory_items item ON item.id=lot.inventory_item_id WHERE lot.id=$1 AND lot.branch_id=$2 FOR UPDATE`, lotID, branchID).Scan(&inventoryID, &lotBefore, &status, &inventoryBefore, &name, &lotNumber, &lotExpiry, &unit); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบล็อตของสด"})
		return
	}
	if status != "active" || input.Quantity > lotBefore || input.Quantity > inventoryBefore {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "จำนวนที่ตัดทิ้งไม่ถูกต้อง"})
		return
	}
	lotAfter := lotBefore - input.Quantity
	inventoryAfter := inventoryBefore - input.Quantity
	claims := middleware.ClaimsFrom(c)
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE fresh_inventory_lots SET quantity_remaining=$1,status=CASE WHEN $1=0 THEN 'discarded' ELSE status END,discarded_at=CASE WHEN $1=0 THEN now() ELSE discarded_at END,discarded_by=CASE WHEN $1=0 THEN $2 ELSE discarded_by END,discard_reason=CASE WHEN $1=0 THEN $3 ELSE discard_reason END,updated_at=now() WHERE id=$4`, lotAfter, claims.UserID, strings.TrimSpace(input.Note), lotID); err == nil {
		err = recordFreshLotMovementTx(c, tx, branchID, lotID, inventoryID, "discarded", -input.Quantity, lotBefore, lotAfter, input.Note, claims.UserID)
	}
	if err == nil {
		_, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=$1,updated_at=now() WHERE id=$2`, inventoryAfter, inventoryID)
	}
	if err == nil {
		err = recordStockMovementTx(c.Request.Context(), tx, branchID, inventoryID, "fresh_lot_discard", -input.Quantity, inventoryBefore, inventoryAfter, "fresh_inventory_lot", &lotID, input.Note, claims.UserID)
	}
	if err == nil {
		err = recordAuditTx(c, tx, branchID, claims.UserID, "fresh_inventory_lot", lotID, "discarded", gin.H{
			"inventoryItemId": inventoryID, "name": name, "lotNumber": lotNumber, "expiryDate": lotExpiry,
			"quantity": input.Quantity, "unit": unit,
			"quantityBefore": lotBefore, "quantityAfter": lotAfter,
			"inventoryQuantityBefore": inventoryBefore, "inventoryQuantityAfter": inventoryAfter,
			"note": input.Note,
		})
	}
	if err != nil || tx.Commit() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตัดทิ้งของสดได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": lotID, "quantity": lotAfter}})
}

package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func (h *PlatformHandler) CreateStockRequest(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input requestInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ต้องระบุรายการที่ขออย่างน้อย 1 รายการ"})
		return
	}
	branchID, ok := h.requestBranchScope(c, input.BranchID)
	if !ok {
		return
	}
	claims := middleware.ClaimsFrom(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if offset < 0 {
		offset = 0
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างคำขอได้"})
		return
	}
	defer tx.Rollback()
	var requestID int64
	err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO stock_requests(branch_id,note,requested_by) VALUES($1,$2,$3) RETURNING id`, branchID, input.Note, claims.UserID).Scan(&requestID)
	for _, item := range input.Items {
		if err != nil {
			break
		}
		itemName, itemUnit := item.Name, item.Unit
		if item.InventoryItemID != nil {
			err = tx.QueryRowContext(c.Request.Context(), `SELECT name,unit FROM inventory_items WHERE id=$1 AND branch_id=$2`, *item.InventoryItemID, branchID).Scan(&itemName, &itemUnit)
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(400, gin.H{"success": false, "message": "รายการสต็อกไม่อยู่ในสาขาที่ระบุ"})
				return
			}
			if err != nil {
				break
			}
		}
		_, err = tx.ExecContext(c.Request.Context(), `INSERT INTO stock_request_items(stock_request_id,inventory_item_id,item_name,quantity,unit) VALUES($1,$2,$3,$4,$5)`, requestID, item.InventoryItemID, itemName, item.Quantity, itemUnit)
	}
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกคำขอได้"})
		return
	}
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "stock_request", requestID, "created", gin.H{"itemCount": len(input.Items)}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติคำขอได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกคำขอได้"})
		return
	}
	h.cache.Publish(c, "sbc:events", gin.H{"type": "stock.request.created", "requestId": requestID, "branchId": branchID})
	h.cache.Enqueue(c, "sbc:jobs", map[string]any{"type": "stock.request.notify", "requestId": requestID})
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": requestID, "status": "pending"}})
}

func (h *PlatformHandler) ListStockRequests(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if offset < 0 {
		offset = 0
	}
	query := `SELECT r.id,r.status,r.note,r.created_at,b.id,b.name,b.franchisee_id IS NOT NULL,
		COALESCE(json_agg(json_build_object('name',i.item_name,'quantity',i.quantity,'unit',i.unit) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL),'[]')
		FROM stock_requests r JOIN branches b ON b.id=r.branch_id LEFT JOIN stock_request_items i ON i.stock_request_id=r.id`
	args := []any{}
	if claims.Role != "admin" {
		branchID, ok := h.branchScope(c)
		if !ok {
			return
		}
		query += ` WHERE r.branch_id=$1`
		args = append(args, branchID)
	}
	query += ` GROUP BY r.id,b.id ORDER BY r.created_at DESC`
	args = append(args, limit, offset)
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)-1, len(args))
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดึงรายการคำขอได้"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id, branchID int64
		var status, note, branchName string
		var isFranchise bool
		var created time.Time
		var items []byte
		if err := rows.Scan(&id, &status, &note, &created, &branchID, &branchName, &isFranchise, &items); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านรายการคำขอได้"})
			return
		}
		result = append(result, gin.H{"id": id, "status": status, "note": note, "createdAt": created, "branch": gin.H{"id": branchID, "name": branchName, "isFranchise": isFranchise}, "items": json.RawMessage(items)})
	}
	c.JSON(200, gin.H{"success": true, "data": result, "pagination": gin.H{"limit": limit, "offset": offset}})
}

func (h *PlatformHandler) UpdateStockRequestStatus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, parseErr := strconv.ParseInt(c.Param("id"), 10, 64)
	if parseErr != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสคำขอไม่ถูกต้อง"})
		return
	}
	var input struct {
		Status string `json:"status" binding:"required,oneof=approved preparing completed rejected"`
	}
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "สถานะที่ระบุไม่ถูกต้อง"})
		return
	}
	claims := middleware.ClaimsFrom(c)
	validCurrentStatuses := map[string][]string{"approved": {"pending"}, "rejected": {"pending"}, "preparing": {"pending", "approved"}, "completed": {"preparing"}}
	if input.Status != "completed" {
		tx, err := h.db.BeginTx(c.Request.Context(), nil)
		if err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะคำขอได้"})
			return
		}
		defer tx.Rollback()
		var branchID int64
		err = tx.QueryRowContext(c.Request.Context(), `UPDATE stock_requests SET status=$1,approved_by=$2,updated_at=now() WHERE id=$3 AND status = ANY($4) RETURNING branch_id`, input.Status, claims.UserID, id, validCurrentStatuses[input.Status]).Scan(&branchID)
		if err != nil {
			c.JSON(409, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะคำขอนี้ได้"})
			return
		}
		if err = recordAuditTx(c, tx, branchID, claims.UserID, "stock_request", id, input.Status, nil); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติคำขอได้"})
			return
		}
		if err = tx.Commit(); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะคำขอได้"})
			return
		}
		h.cache.Publish(c, "sbc:events", gin.H{"type": "stock.request.updated", "requestId": id, "status": input.Status})
		h.cache.Enqueue(c, "sbc:jobs", map[string]any{"type": "stock.request.notify", "requestId": id})
		c.JSON(200, gin.H{"success": true, "data": gin.H{"id": id, "status": input.Status}})
		return
	}

	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
		return
	}
	defer tx.Rollback()
	var branchID int64
	err = tx.QueryRowContext(c.Request.Context(), `SELECT branch_id FROM stock_requests WHERE id=$1 AND status = ANY($2) FOR UPDATE`, id, validCurrentStatuses[input.Status]).Scan(&branchID)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(409, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะคำขอนี้ได้"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
		return
	}
	rows, err := tx.QueryContext(c.Request.Context(), `SELECT inventory_item_id,item_name,quantity,unit FROM stock_request_items WHERE stock_request_id=$1`, id)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
		return
	}
	type receivedItem struct {
		inventoryItemID *int64
		name, unit      string
		quantity        float64
	}
	items := make([]receivedItem, 0)
	for rows.Next() {
		var inventoryItemID *int64
		var name, unit string
		var quantity float64
		if err := rows.Scan(&inventoryItemID, &name, &quantity, &unit); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
			return
		}
		items = append(items, receivedItem{inventoryItemID: inventoryItemID, name: name, quantity: quantity, unit: unit})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
		return
	}
	if err := rows.Close(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
		return
	}
	for _, item := range items {
		var result sql.Result
		var updateErr error
		var inventoryItemID int64
		var before float64
		if item.inventoryItemID != nil {
			inventoryItemID = *item.inventoryItemID
			updateErr = tx.QueryRowContext(c.Request.Context(), `SELECT quantity FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, inventoryItemID, branchID).Scan(&before)
			if updateErr != nil {
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถรับสินค้าเข้าสต็อกได้"})
				return
			}
			result, updateErr = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=quantity+$1,updated_at=now() WHERE id=$2 AND branch_id=$3`, item.quantity, *item.inventoryItemID, branchID)
		} else {
			updateErr = tx.QueryRowContext(c.Request.Context(), `SELECT id,quantity FROM inventory_items WHERE branch_id=$1 AND name=$2 AND unit=$3 FOR UPDATE`, branchID, item.name, item.unit).Scan(&inventoryItemID, &before)
			if errors.Is(updateErr, sql.ErrNoRows) {
				updateErr = nil
				before = 0
			} else if updateErr != nil {
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถรับสินค้าเข้าสต็อกได้"})
				return
			}
			result, updateErr = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=quantity+$1,updated_at=now() WHERE branch_id=$2 AND name=$3 AND unit=$4`, item.quantity, branchID, item.name, item.unit)
		}
		if updateErr != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถรับสินค้าเข้าสต็อกได้"})
			return
		}
		if rowsAffected(result) == 0 {
			if insertErr := tx.QueryRowContext(c.Request.Context(), `INSERT INTO inventory_items(branch_id,name,category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,$2,'other','ingredient',$3,$4,0,0) RETURNING id`, branchID, item.name, item.quantity, item.unit).Scan(&inventoryItemID); insertErr != nil {
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถรับสินค้าเข้าสต็อกได้"})
				return
			}
		}
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, inventoryItemID, "stock_request_receipt", item.quantity, before, before+item.quantity, "stock_request", &id, "รับสินค้าตามคำขอเติมของ", claims.UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติสต๊อกได้"})
			return
		}
	}
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE stock_requests SET status='completed',approved_by=$1,updated_at=now() WHERE id=$2`, claims.UserID, id); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
		return
	}
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "stock_request", id, "completed", nil); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติคำขอได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดำเนินการรับสินค้าให้เสร็จสิ้นได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	h.cache.Publish(c, "sbc:events", gin.H{"type": "stock.request.updated", "requestId": id, "branchId": branchID, "status": input.Status})
	h.cache.Enqueue(c, "sbc:jobs", map[string]any{"type": "stock.request.notify", "requestId": id})
	c.JSON(200, gin.H{"success": true, "data": gin.H{"id": id, "status": input.Status}})
}

package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/dto"
	"y/internal/middleware"
)

func (h *PlatformHandler) ListSuppliers(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,name,contact_name,phone,email,address,status,created_at,updated_at FROM suppliers ORDER BY name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงรายชื่อผู้ขายได้"})
		return
	}
	defer rows.Close()
	result := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var name, contactName, phone, email, address, status string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&id, &name, &contactName, &phone, &email, &address, &status, &createdAt, &updatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายชื่อผู้ขายได้"})
			return
		}
		result = append(result, gin.H{"id": id, "name": name, "contactName": contactName, "phone": phone, "email": email, "address": address, "status": status, "createdAt": createdAt, "updatedAt": updatedAt})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) CreateSupplier(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input dto.SupplierRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลผู้ขายไม่ถูกต้อง"})
		return
	}
	status := defaultString(input.Status, "active")
	var id int64
	err := h.db.QueryRowContext(c.Request.Context(), `INSERT INTO suppliers(name,contact_name,phone,email,address,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, input.Name, input.ContactName, input.Phone, input.Email, input.Address, status).Scan(&id)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่สามารถสร้างผู้ขายได้ ชื่อผู้ขายอาจซ้ำ"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) UpdateSupplier(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสผู้ขายไม่ถูกต้อง"})
		return
	}
	var input dto.SupplierRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลผู้ขายไม่ถูกต้อง"})
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `UPDATE suppliers SET name=$1,contact_name=$2,phone=$3,email=$4,address=$5,status=$6,updated_at=now() WHERE id=$7`, input.Name, input.ContactName, input.Phone, input.Email, input.Address, defaultString(input.Status, "active"), id)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบผู้ขาย"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) CreatePurchaseOrder(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input dto.PurchaseOrderRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลใบสั่งซื้อไม่ถูกต้อง"})
		return
	}
	branchID, ok := h.requestBranchScope(c, input.BranchID)
	if !ok {
		return
	}
	claims := middleware.ClaimsFrom(c)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างใบสั่งซื้อได้"})
		return
	}
	defer tx.Rollback()
	var active bool
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT status='active' FROM suppliers WHERE id=$1`, input.SupplierID).Scan(&active); err != nil || !active {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบผู้ขายหรือผู้ขายถูกปิดใช้งาน"})
		return
	}
	var id int64
	if err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO purchase_orders(branch_id,supplier_id,note,ordered_by) VALUES($1,$2,$3,$4) RETURNING id`, branchID, input.SupplierID, input.Note, claims.UserID).Scan(&id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างใบสั่งซื้อได้"})
		return
	}
	for _, item := range input.Items {
		var name, unit string
		err = tx.QueryRowContext(c.Request.Context(), `SELECT name,unit FROM inventory_items WHERE id=$1 AND branch_id=$2`, item.InventoryItemID, branchID).Scan(&name, &unit)
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "มีรายการสต๊อกที่ไม่อยู่ในสาขาที่เลือก"})
			return
		}
		if err != nil {
			break
		}
		_, err = tx.ExecContext(c.Request.Context(), `INSERT INTO purchase_order_items(purchase_order_id,inventory_item_id,item_name,quantity_ordered,unit,unit_cost) VALUES($1,$2,$3,$4,$5,$6)`, id, item.InventoryItemID, name, item.Quantity, unit, item.UnitCost)
		if err != nil {
			break
		}
	}
	if err == nil {
		err = recordAuditTx(c, tx, branchID, claims.UserID, "purchase_order", id, "created", gin.H{"supplierId": input.SupplierID, "itemCount": len(input.Items)})
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกใบสั่งซื้อได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกใบสั่งซื้อได้"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "status": "draft"}})
}

func (h *PlatformHandler) ListPurchaseOrders(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	query := `SELECT p.id,p.branch_id,b.name,p.supplier_id,s.name,p.status,p.note,p.created_at,p.ordered_at,p.received_at,
		COALESCE(json_agg(json_build_object('id',i.id,'inventoryItemId',i.inventory_item_id,'name',i.item_name,'quantityOrdered',i.quantity_ordered,'quantityReceived',i.quantity_received,'unit',i.unit,'unitCost',i.unit_cost) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL),'[]')
		FROM purchase_orders p JOIN branches b ON b.id=p.branch_id JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN purchase_order_items i ON i.purchase_order_id=p.id`
	args := []any{}
	if branchID := c.Query("branchId"); branchID != "" {
		id, err := strconv.ParseInt(branchID, 10, 64)
		if err != nil || id < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
			return
		}
		query += ` WHERE p.branch_id=$1`
		args = append(args, id)
	}
	query += ` GROUP BY p.id,b.id,s.id ORDER BY p.created_at DESC,p.id DESC`
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงใบสั่งซื้อได้"})
		return
	}
	defer rows.Close()
	result := make([]gin.H, 0)
	for rows.Next() {
		var id, branchID, supplierID int64
		var branchName, supplierName, status, note string
		var createdAt time.Time
		var orderedAt, receivedAt *time.Time
		var items []byte
		if err := rows.Scan(&id, &branchID, &branchName, &supplierID, &supplierName, &status, &note, &createdAt, &orderedAt, &receivedAt, &items); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านใบสั่งซื้อได้"})
			return
		}
		result = append(result, gin.H{"id": id, "branchId": branchID, "branchName": branchName, "supplierId": supplierID, "supplierName": supplierName, "status": status, "note": note, "createdAt": createdAt, "orderedAt": orderedAt, "receivedAt": receivedAt, "items": json.RawMessage(items)})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) UpdatePurchaseOrderStatus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสใบสั่งซื้อไม่ถูกต้อง"})
		return
	}
	var input dto.PurchaseOrderStatusRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "สถานะใบสั่งซื้อไม่ถูกต้อง"})
		return
	}
	allowed := map[string][]string{"submitted": {"draft"}, "approved": {"submitted"}, "ordered": {"approved"}, "cancelled": {"draft", "submitted", "approved", "ordered"}}
	claims := middleware.ClaimsFrom(c)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะใบสั่งซื้อได้"})
		return
	}
	defer tx.Rollback()
	var branchID int64
	err = tx.QueryRowContext(c.Request.Context(), `UPDATE purchase_orders SET status=$1,approved_by=CASE WHEN $1 IN ('approved','ordered') THEN $2 ELSE approved_by END,ordered_at=CASE WHEN $1='ordered' THEN now() ELSE ordered_at END,updated_at=now() WHERE id=$3 AND status = ANY($4) RETURNING branch_id`, input.Status, claims.UserID, id, allowed[input.Status]).Scan(&branchID)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะใบสั่งซื้อนี้ได้"})
		return
	}
	if err != nil || recordAuditTx(c, tx, branchID, claims.UserID, "purchase_order", id, input.Status, nil) != nil || tx.Commit() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะใบสั่งซื้อได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": input.Status}})
}

func (h *PlatformHandler) ReceivePurchaseOrder(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสใบสั่งซื้อไม่ถูกต้อง"})
		return
	}
	var input dto.PurchaseOrderReceiptRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลรับสินค้าไม่ถูกต้อง"})
		return
	}
	claims := middleware.ClaimsFrom(c)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถรับสินค้าได้"})
		return
	}
	defer tx.Rollback()
	var branchID int64
	var status string
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT branch_id,status FROM purchase_orders WHERE id=$1 FOR UPDATE`, id).Scan(&branchID, &status); err != nil || (status != "ordered" && status != "partially_received") {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ใบสั่งซื้อนี้ยังไม่พร้อมรับสินค้า"})
		return
	}
	for _, receipt := range input.Items {
		var inventoryID int64
		var ordered, received, orderCost float64
		err = tx.QueryRowContext(c.Request.Context(), `SELECT inventory_item_id,quantity_ordered,quantity_received,unit_cost FROM purchase_order_items WHERE id=$1 AND purchase_order_id=$2 FOR UPDATE`, receipt.ItemID, id).Scan(&inventoryID, &ordered, &received, &orderCost)
		if err != nil || receipt.Quantity+received > ordered {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "จำนวนรับสินค้าเกินกว่าจำนวนที่สั่ง หรือไม่พบรายการ"})
			return
		}
		var before, previousCost float64
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT quantity,unit_cost FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, inventoryID, branchID).Scan(&before, &previousCost); err != nil {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่พบรายการสต๊อกสำหรับรับสินค้า"})
			return
		}
		after := before + receipt.Quantity
		unitCost := orderCost
		if after > 0 {
			unitCost = ((before * previousCost) + (receipt.Quantity * orderCost)) / after
		}
		if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=$1,unit_cost=$2,updated_at=now() WHERE id=$3`, after, unitCost, inventoryID); err != nil {
			break
		}
		if _, err = tx.ExecContext(c.Request.Context(), `UPDATE purchase_order_items SET quantity_received=quantity_received+$1 WHERE id=$2`, receipt.Quantity, receipt.ItemID); err != nil {
			break
		}
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, inventoryID, "purchase_receipt", receipt.Quantity, before, after, "purchase_order", &id, input.Note, claims.UserID); err != nil {
			break
		}
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถรับสินค้าเข้าสต๊อกได้"})
		return
	}
	var remaining int
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id=$1 AND quantity_received < quantity_ordered`, id).Scan(&remaining); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบยอดรับสินค้าได้"})
		return
	}
	newStatus := "partially_received"
	if remaining == 0 {
		newStatus = "received"
	}
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE purchase_orders SET status=$1,received_at=CASE WHEN $1='received' THEN now() ELSE received_at END,updated_at=now() WHERE id=$2`, newStatus, id); err == nil {
		err = recordAuditTx(c, tx, branchID, claims.UserID, "purchase_order", id, "received", gin.H{"status": newStatus, "itemCount": len(input.Items)})
	}
	if err != nil || tx.Commit() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถรับสินค้าเข้าสต๊อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": newStatus}})
}

func (h *PlatformHandler) AdjustInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสรายการสต๊อกไม่ถูกต้อง"})
		return
	}
	var input dto.StockAdjustmentRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลปรับยอดสต๊อกไม่ถูกต้อง"})
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	claims := middleware.ClaimsFrom(c)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถปรับยอดสต๊อกได้"})
		return
	}
	defer tx.Rollback()
	var before float64
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT quantity FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, id, branchID).Scan(&before); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบรายการสต๊อก"})
		return
	}
	if before == input.Quantity {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ยอดใหม่เท่ากับยอดเดิม จึงไม่ต้องปรับสต๊อก"})
		return
	}
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=$1,updated_at=now() WHERE id=$2`, input.Quantity, id); err == nil {
		err = recordStockMovementTx(c.Request.Context(), tx, branchID, id, "adjustment", input.Quantity-before, before, input.Quantity, "inventory_adjustment", nil, input.Note, claims.UserID)
	}
	if err == nil {
		err = recordAuditTx(c, tx, branchID, claims.UserID, "inventory_item", id, "adjusted", gin.H{"before": before, "after": input.Quantity, "note": input.Note})
	}
	if err != nil || tx.Commit() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถปรับยอดสต๊อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "quantity": input.Quantity}})
}

func (h *PlatformHandler) ListStockMovements(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	if limit < 1 || limit > 100 {
		limit = 100
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT m.id,m.inventory_item_id,i.name,m.movement_type,m.quantity_delta,m.quantity_before,m.quantity_after,m.reference_type,m.reference_id,m.note,m.created_at FROM stock_movements m JOIN inventory_items i ON i.id=m.inventory_item_id WHERE m.branch_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT $2`, branchID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงประวัติสต๊อกได้"})
		return
	}
	defer rows.Close()
	result := make([]gin.H, 0)
	for rows.Next() {
		var id, inventoryID int64
		var name, movementType, referenceType, note string
		var delta, before, after float64
		var referenceID *int64
		var createdAt time.Time
		if err := rows.Scan(&id, &inventoryID, &name, &movementType, &delta, &before, &after, &referenceType, &referenceID, &note, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติสต๊อกได้"})
			return
		}
		result = append(result, gin.H{"id": id, "inventoryItemId": inventoryID, "inventoryItemName": name, "movementType": movementType, "quantityDelta": delta, "quantityBefore": before, "quantityAfter": after, "referenceType": referenceType, "referenceId": referenceID, "note": note, "createdAt": createdAt})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

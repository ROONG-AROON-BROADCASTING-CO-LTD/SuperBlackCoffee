package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ListAuditEvents gives administrators an operational history for inventory and
// stock-request changes. It is deliberately read-only and paginated.
func (h *PlatformHandler) ListAuditEvents(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
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
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT e.id,e.branch_id,COALESCE(b.name,''),e.actor_id,COALESCE(u.name,''),e.entity_type,e.entity_id,e.action,e.metadata,e.created_at,
		COALESCE((SELECT json_agg(json_build_object(
			'name',i.name,'unit',i.unit,'movementType',m.movement_type,'quantityDelta',m.quantity_delta,
			'quantityBefore',m.quantity_before,'quantityAfter',m.quantity_after,'note',m.note
			) ORDER BY m.id)
			FROM stock_movements m JOIN inventory_items i ON i.id=m.inventory_item_id
			WHERE m.branch_id=e.branch_id AND m.actor_id=e.actor_id AND m.created_at=e.created_at AND (
				(e.entity_type='stock_consumption' AND m.movement_type='menu_consumption') OR
				(e.entity_type='stock_request' AND m.reference_type='stock_request' AND m.reference_id=e.entity_id) OR
				(e.entity_type='purchase_order' AND m.reference_type='purchase_order' AND m.reference_id=e.entity_id) OR
				(e.entity_type='fresh_inventory_lot' AND m.reference_type='fresh_inventory_lot' AND m.reference_id=e.entity_id) OR
				(e.entity_type='inventory_item' AND m.inventory_item_id=e.entity_id AND m.movement_type='adjustment')
			)), '[]'::json) AS stock_movements,
		COALESCE((SELECT json_agg(json_build_object(
			'name',i.name,'lotNumber',l.lot_number,'movementType',m.movement_type,'quantityDelta',m.quantity_delta,
			'quantityBefore',m.quantity_before,'quantityAfter',m.quantity_after,'note',m.note,'expiryDate',l.expiry_date
			) ORDER BY m.id)
			FROM fresh_inventory_lot_movements m JOIN fresh_inventory_lots l ON l.id=m.lot_id
			JOIN inventory_items i ON i.id=m.inventory_item_id
			WHERE m.branch_id=e.branch_id AND m.actor_id=e.actor_id AND m.created_at=e.created_at AND (
				(e.entity_type='stock_consumption' AND m.movement_type='consumed') OR
				(e.entity_type='fresh_inventory_lot' AND m.lot_id=e.entity_id)
			)), '[]'::json) AS lot_movements
		FROM audit_events e
		LEFT JOIN branches b ON b.id=e.branch_id
		LEFT JOIN users u ON u.id=e.actor_id
		ORDER BY e.created_at DESC, e.id DESC LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงประวัติการทำรายการได้"})
		return
	}
	defer rows.Close()
	events := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var branchID, actorID *int64
		var branchName, actorName, entityType, action string
		var entityID *int64
		var metadata []byte
		var stockMovements, lotMovements []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &branchID, &branchName, &actorID, &actorName, &entityType, &entityID, &action, &metadata, &createdAt, &stockMovements, &lotMovements); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติการทำรายการได้"})
			return
		}
		var eventMetadata map[string]any
		if err := json.Unmarshal(metadata, &eventMetadata); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายละเอียดประวัติได้"})
			return
		}
		var stockDetails, lotDetails []any
		if err := json.Unmarshal(stockMovements, &stockDetails); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายละเอียดความเคลื่อนไหวสต็อกได้"})
			return
		}
		if err := json.Unmarshal(lotMovements, &lotDetails); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายละเอียดล็อตวัตถุดิบได้"})
			return
		}
		if len(stockDetails) > 0 {
			eventMetadata["stockMovements"] = stockDetails
		}
		if len(lotDetails) > 0 {
			eventMetadata["lotMovements"] = lotDetails
		}
		events = append(events, gin.H{"id": id, "branchId": branchID, "branchName": branchName, "actorId": actorID, "actorName": actorName, "entityType": entityType, "entityId": entityID, "action": action, "metadata": eventMetadata, "createdAt": createdAt})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติการทำรายการได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": events, "pagination": gin.H{"limit": limit, "offset": offset}})
}

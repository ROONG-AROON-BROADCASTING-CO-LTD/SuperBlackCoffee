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
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT e.id,e.branch_id,COALESCE(b.name,''),e.actor_id,COALESCE(u.name,''),e.entity_type,e.entity_id,e.action,e.metadata,e.created_at
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
		var createdAt time.Time
		if err := rows.Scan(&id, &branchID, &branchName, &actorID, &actorName, &entityType, &entityID, &action, &metadata, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติการทำรายการได้"})
			return
		}
		events = append(events, gin.H{"id": id, "branchId": branchID, "branchName": branchName, "actorId": actorID, "actorName": actorName, "entityType": entityType, "entityId": entityID, "action": action, "metadata": json.RawMessage(metadata), "createdAt": createdAt})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติการทำรายการได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": events, "pagination": gin.H{"limit": limit, "offset": offset}})
}

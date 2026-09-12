package handler

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
)

// Dashboard reports stock-app activity. It deliberately does not claim this is POS revenue.
func (h *PlatformHandler) Dashboard(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchCode := strings.TrimSpace(c.Query("branchCode"))
	var branchID any
	if branchCode != "" {
		var id int64
		if err := h.db.QueryRowContext(c.Request.Context(), `SELECT id FROM branches WHERE code=$1`, branchCode).Scan(&id); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่เลือก"})
			return
		}
		branchID = id
	}
	var menuCount float64
	var entries int
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT COALESCE(SUM(COALESCE((metadata->>'menuQuantity')::numeric,(metadata->>'itemCount')::numeric,0)),0),COUNT(*) FROM audit_events WHERE entity_type='stock_consumption' AND action='consumed' AND created_at >= date_trunc('day', now()) AND ($1::bigint IS NULL OR branch_id=$1)`, branchID).Scan(&menuCount, &entries)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสรุปการตัดสต๊อกวันนี้ได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"todaySales": 0, "todayOrders": 0, "todayMenuStockCuts": menuCount, "todayStockEntries": entries}})
}

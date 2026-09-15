package handler

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
)

type dashboardTrendPeriod struct {
	unit     string
	interval string
	buckets  int
	step     string
	format   string
}

func dashboardTrendConfig(period string) (dashboardTrendPeriod, bool) {
	switch period {
	case "day":
		return dashboardTrendPeriod{unit: "day", interval: "6 days", buckets: 7, step: "1 day", format: "DD Mon"}, true
	case "month":
		return dashboardTrendPeriod{unit: "month", interval: "11 months", buckets: 12, step: "1 month", format: "Mon YY"}, true
	case "year":
		return dashboardTrendPeriod{unit: "year", interval: "4 years", buckets: 5, step: "1 year", format: "YYYY"}, true
	default:
		return dashboardTrendPeriod{}, false
	}
}

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

// DashboardTrend returns stock-consumption volume grouped into a time series.
// POS revenue is not available in this application, so the metric remains
// explicit about representing menu stock cuts.
func (h *PlatformHandler) DashboardTrend(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	config, ok := dashboardTrendConfig(strings.TrimSpace(c.DefaultQuery("period", "day")))
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ช่วงเวลาที่เลือกไม่ถูกต้อง"})
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
	query := fmt.Sprintf(`WITH buckets AS (
		SELECT generate_series(
			date_trunc('%[1]s', now()) - interval '%[2]s',
			date_trunc('%[1]s', now()),
			interval '%[3]s'
		) AS bucket
	)
	SELECT to_char(b.bucket, '%[4]s'),
		COALESCE(SUM(COALESCE((a.metadata->>'menuQuantity')::numeric,(a.metadata->>'itemCount')::numeric,0)),0)
	FROM buckets b
	LEFT JOIN audit_events a ON a.entity_type='stock_consumption'
		AND a.action='consumed'
		AND a.created_at >= b.bucket
		AND a.created_at < b.bucket + interval '%[3]s'
		AND ($1::bigint IS NULL OR a.branch_id=$1)
	GROUP BY b.bucket
	ORDER BY b.bucket`, config.unit, config.interval, config.step, config.format)
	rows, err := h.db.QueryContext(c.Request.Context(), query, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดแนวโน้มการตัดสต๊อกได้"})
		return
	}
	defer rows.Close()
	result := make([]gin.H, 0, config.buckets)
	for rows.Next() {
		var label string
		var quantity float64
		if err := rows.Scan(&label, &quantity); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านแนวโน้มการตัดสต๊อกได้"})
			return
		}
		result = append(result, gin.H{"label": label, "quantity": quantity})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านแนวโน้มการตัดสต๊อกได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

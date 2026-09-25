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
	start    string
	end      string
}

func dashboardTrendConfig(period string) (dashboardTrendPeriod, bool) {
	switch period {
	case "day":
		return dashboardTrendPeriod{
			unit:     "day",
			interval: "6 days",
			buckets:  7,
			step:     "1 day",
			format:   "YYYY-MM-DD",
			start:    "date_trunc('week', now())",
			end:      "date_trunc('week', now()) + interval '6 days'",
		}, true
	case "month":
		return dashboardTrendPeriod{unit: "month", interval: "11 months", buckets: 12, step: "1 month", format: "YYYY-MM-DD"}, true
	case "year":
		return dashboardTrendPeriod{unit: "year", interval: "4 years", buckets: 5, step: "1 year", format: "YYYY-MM-DD"}, true
	default:
		return dashboardTrendPeriod{}, false
	}
}

// dashboardScopeClause keeps platform-owned branches and franchise branches
// separate for every overview aggregate. The scope value is validated before
// it reaches these static SQL fragments.
func dashboardScopeClause(branchColumn string) string {
	return fmt.Sprintf(`($2::text='all' OR EXISTS (
		SELECT 1 FROM branches dashboard_branch
		WHERE dashboard_branch.id=%s AND (
			($2::text='sbc' AND dashboard_branch.franchisee_id IS NULL AND NOT COALESCE(dashboard_branch.is_headquarters,false)) OR
			($2::text='franchise' AND dashboard_branch.franchisee_id IS NOT NULL)
		)
	))`, branchColumn)
}

func dashboardReportScope(c *gin.Context) (string, bool) {
	scope := strings.TrimSpace(c.DefaultQuery("scope", "all"))
	switch scope {
	case "all", "sbc", "franchise":
		return scope, true
	default:
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ขอบเขตสาขาที่เลือกไม่ถูกต้อง"})
		return "", false
	}
}

// Dashboard reports stock-app activity. It deliberately does not claim this is POS revenue.
func (h *PlatformHandler) Dashboard(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.salesBranchID(c)
	if !ok {
		return
	}
	scope, ok := dashboardReportScope(c)
	if !ok {
		return
	}
	var menuCount float64
	var entries int
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT COALESCE(SUM(COALESCE((metadata->>'menuQuantity')::numeric,(metadata->>'itemCount')::numeric,0)),0),COUNT(*) FROM audit_events WHERE entity_type='stock_consumption' AND action='consumed' AND created_at >= date_trunc('day', now()) AND ($1::bigint IS NULL OR branch_id=$1) AND `+dashboardScopeClause("branch_id"), branchID, scope).Scan(&menuCount, &entries)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสรุปการตัดสต๊อกวันนี้ได้"})
		return
	}
	var todaySales float64
	var todayOrders int
	var weekSales float64
	var monthSales float64
	var yearSales float64
	err = h.db.QueryRowContext(c.Request.Context(), `SELECT
		COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('day', now()) AND created_at < date_trunc('day', now()) + interval '1 day'),0),
		COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()) AND created_at < date_trunc('day', now()) + interval '1 day'),
		COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('week', now()) AND created_at < date_trunc('week', now()) + interval '1 week'),0),
		COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('month', now()) AND created_at < date_trunc('month', now()) + interval '1 month'),0),
		COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('year', now()) AND created_at < date_trunc('year', now()) + interval '1 year'),0)
		FROM stock_sales WHERE ($1::bigint IS NULL OR branch_id=$1) AND `+dashboardScopeClause("branch_id"), branchID, scope).Scan(&todaySales, &todayOrders, &weekSales, &monthSales, &yearSales)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสรุปยอดขายวันนี้ได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"todaySales": todaySales, "todayOrders": todayOrders, "weekSales": weekSales, "monthSales": monthSales, "yearSales": yearSales, "todayMenuStockCuts": menuCount, "todayStockEntries": entries}})
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
	scope, ok := dashboardReportScope(c)
	if !ok {
		return
	}
	var branchID any
	if branchCode != "" {
		var id int64
		if err := h.db.QueryRowContext(c.Request.Context(), `SELECT id FROM branches WHERE code=$1`, branchCode).Scan(&id); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่เลือก"})
			return
		}
		branchID = id
	}
	start := fmt.Sprintf("date_trunc('%s', now()) - interval '%s'", config.unit, config.interval)
	end := fmt.Sprintf("date_trunc('%s', now())", config.unit)
	if config.start != "" {
		start = config.start
		end = config.end
	}
	query := fmt.Sprintf(`WITH buckets AS (
		SELECT generate_series(
			%[1]s,
			%[2]s,
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
		AND `+dashboardScopeClause("a.branch_id")+`
	GROUP BY b.bucket
	ORDER BY b.bucket`, start, end, config.step, config.format)
	rows, err := h.db.QueryContext(c.Request.Context(), query, branchID, scope)
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

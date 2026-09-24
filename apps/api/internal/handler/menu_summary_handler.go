package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type menuBranchSummary struct {
	BranchCode     string `json:"branchCode"`
	BranchName     string `json:"branchName"`
	MenuCount      int64  `json:"menuCount"`
	AvailableCount int64  `json:"availableCount"`
}

type menuSummaryPage struct {
	Items    []menuBranchSummary `json:"items"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"pageSize"`
}

// ListMenuItemSummary reads one page of branch counts without loading recipes or images.
// The detailed menu endpoint remains scoped to a single branch.
func (h *PlatformHandler) ListMenuItemSummary(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 || page > 100000 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "เลขหน้าไม่ถูกต้อง"})
		return
	}
	pageSize, err := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if err != nil || pageSize < 1 || pageSize > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "จำนวนรายการต่อหน้าไม่ถูกต้อง"})
		return
	}
	scope := c.DefaultQuery("scope", "sbc")
	if scope != "sbc" && scope != "franchise" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ประเภทสาขาไม่ถูกต้อง"})
		return
	}
	franchise := scope == "franchise"
	cacheKey := "sbc:menu-summary:" + scope + ":" + strconv.Itoa(page) + ":" + strconv.Itoa(pageSize)
	var result menuSummaryPage
	if h.cache.GetJSON(c, cacheKey, &result) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
		return
	}
	result = menuSummaryPage{Items: []menuBranchSummary{}, Page: page, PageSize: pageSize}
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT count(*) FROM branches WHERE (franchisee_id IS NOT NULL)=$1`, franchise).Scan(&result.Total); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถนับจำนวนสาขาได้"})
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		WITH page_branches AS (
			SELECT id,code,name,size FROM branches
			WHERE (franchisee_id IS NOT NULL)=$1
			ORDER BY name,id LIMIT $2 OFFSET $3
		)
		SELECT b.code,b.name,count(m.id),count(m.id) FILTER (WHERE m.status='available')
		FROM page_branches b
		LEFT JOIN menu_items m ON m.branch_id=b.id AND m.template_enabled
			AND (b.size<>'S' OR lower(m.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery'))
		GROUP BY b.id,b.code,b.name
		ORDER BY b.name,b.id`, franchise, pageSize, (page-1)*pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงข้อมูลสรุปเมนูได้"})
		return
	}
	defer rows.Close()
	for rows.Next() {
		var item menuBranchSummary
		if err := rows.Scan(&item.BranchCode, &item.BranchName, &item.MenuCount, &item.AvailableCount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลสรุปเมนูได้"})
			return
		}
		result.Items = append(result.Items, item)
	}
	if rows.Err() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลสรุปเมนูได้"})
		return
	}
	h.cache.SetJSON(c, cacheKey, result, 60*time.Second)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

package handler

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"y/internal/authorization"
	"y/internal/middleware"
)

func (h *PlatformHandler) branchScope(c *gin.Context) (int64, bool) {
	return authorization.BranchID(c, h.db)
}

func (h *PlatformHandler) requestBranchScope(c *gin.Context, requested *int64) (int64, bool) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "กรุณาเข้าสู่ระบบ"})
		return 0, false
	}
	if claims.Role == "admin" {
		if requested == nil || *requested < 1 {
			c.JSON(400, gin.H{"success": false, "message": "ต้องระบุ branchId"})
			return 0, false
		}
		return *requested, true
	}
	return h.branchScope(c)
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func rowsAffected(result sql.Result) int64 {
	value, _ := result.RowsAffected()
	return value
}

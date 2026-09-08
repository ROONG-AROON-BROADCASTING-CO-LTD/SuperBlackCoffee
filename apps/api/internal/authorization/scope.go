package authorization

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

// BranchID resolves the branch visible to the current user. Admins may select a branch;
// other roles are always constrained to the branch in their JWT claims.
func BranchID(c *gin.Context, db *sql.DB) (int64, bool) {
	claims := middleware.ClaimsFrom(c)
	if claims.Role == "admin" {
		if code := strings.TrimSpace(c.Query("branchCode")); code != "" {
			var id int64
			if err := db.QueryRowContext(c.Request.Context(), `SELECT id FROM branches WHERE code=$1`, code).Scan(&id); err != nil {
				c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่ระบุ"})
				return 0, false
			}
			return id, true
		}
		id, err := strconv.ParseInt(c.Query("branchId"), 10, 64)
		if err != nil || id < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ต้องระบุ branchId"})
			return 0, false
		}
		return id, true
	}
	if claims.BranchID == nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "บัญชีนี้ไม่มีสิทธิ์เข้าถึงสาขา"})
		return 0, false
	}
	return *claims.BranchID, true
}

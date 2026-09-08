package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
	"y/internal/model"
)

// ListStaffUsers returns staff accounts visible to the current workspace.
func (h *PlatformHandler) ListStaffUsers(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	query := `SELECT id,name,username,email,role,franchisee_id,branch_id,default_starts_at::text,default_ends_at::text,COALESCE(default_second_starts_at::text,''),COALESCE(default_second_ends_at::text,'') FROM users WHERE role IN ('cashier','branch_manager')`
	args := []any{}
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok {
			return
		}
		query += ` AND branch_id=$1`
		args = append(args, branchID)
	} else {
		// Admin's staff workspace is for company staff; franchise staff remain in their portal.
		query += ` AND franchisee_id IS NULL`
	}
	query += ` ORDER BY name,id`
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงข้อมูลพนักงานได้"})
		return
	}
	defer rows.Close()
	users := make([]model.User, 0)
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Username, &user.Email, &user.Role, &user.FranchiseeID, &user.BranchID, &user.DefaultStartsAt, &user.DefaultEndsAt, &user.DefaultSecondStartsAt, &user.DefaultSecondEndsAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลพนักงานได้"})
			return
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลพนักงานได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "ดึงข้อมูลพนักงานสำเร็จ", "data": users})
}

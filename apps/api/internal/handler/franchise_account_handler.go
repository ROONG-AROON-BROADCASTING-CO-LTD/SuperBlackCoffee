package handler

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"y/internal/middleware"
)

type franchiseAccountPasswordInput struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=8"`
}

// GetFranchiseAccountSettings returns account and branch information for the
// currently signed-in franchise owner. This endpoint exposes no editable fields.
func (h *PlatformHandler) GetFranchiseAccountSettings(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	if claims == nil || claims.FranchiseeID == nil || claims.BranchID == nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "ไม่พบสิทธิ์บัญชีแฟรนไชส์"})
		return
	}
	var accountName, username, email, franchiseName, branchName, branchCode, plan string
	err := h.db.QueryRowContext(c.Request.Context(), `
		SELECT u.name,u.username,u.email,f.name,b.name,b.code,b.size
		FROM users u
		JOIN franchisees f ON f.id=u.franchisee_id
		JOIN branches b ON b.id=u.branch_id AND b.franchisee_id=f.id
		WHERE u.id=$1 AND u.role='franchise_owner' AND f.id=$2 AND b.id=$3`,
		claims.UserID, *claims.FranchiseeID, *claims.BranchID,
	).Scan(&accountName, &username, &email, &franchiseName, &branchName, &branchCode, &plan)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบข้อมูลบัญชีแฟรนไชส์"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดการตั้งค่าระบบได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"accountName": accountName, "username": username, "email": email, "franchiseName": franchiseName, "branchName": branchName, "branchCode": branchCode, "plan": plan}})
}

// UpdateFranchiseAccountPassword lets a franchise owner rotate only their own
// password after confirming their current password.
func (h *PlatformHandler) UpdateFranchiseAccountPassword(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	if claims == nil || claims.FranchiseeID == nil || claims.BranchID == nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "ไม่พบสิทธิ์บัญชีแฟรนไชส์"})
		return
	}
	var input franchiseAccountPasswordInput
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.NewPassword) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"})
		return
	}
	var passwordHash string
	var branchID int64
	err := h.db.QueryRowContext(c.Request.Context(), `
		SELECT password_hash,branch_id FROM users
		WHERE id=$1 AND role='franchise_owner' AND franchisee_id=$2 AND branch_id=$3`,
		claims.UserID, *claims.FranchiseeID, *claims.BranchID,
	).Scan(&passwordHash, &branchID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบบัญชีแฟรนไชส์"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนรหัสผ่านได้"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.CurrentPassword)) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสผ่านปัจจุบันไม่ถูกต้อง"})
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนรหัสผ่านได้"})
		return
	}
	if _, err = h.db.ExecContext(c.Request.Context(), `UPDATE users SET password_hash=$1 WHERE id=$2`, string(newHash), claims.UserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนรหัสผ่านได้"})
		return
	}
	h.recordAudit(c, branchID, "franchise_account", claims.UserID, "password_changed", gin.H{})
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": claims.UserID}})
}

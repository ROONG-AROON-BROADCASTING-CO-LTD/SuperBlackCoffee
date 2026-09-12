package handler

import (
	"database/sql"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"y/internal/middleware"
)

// StockLogin starts a dedicated stock-taking session for a branch employee.
// It intentionally uses its own cookie so opening the stock app never logs the
// employee out of the attendance app.
func (h *PlatformHandler) StockLogin(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input attendanceLoginInput
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.Username) == "" || input.PIN == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ต้องระบุชื่อผู้ใช้และ PIN"})
		return
	}
	if len(input.PIN) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "PIN ต้องเป็นตัวเลข 6 หลัก"})
		return
	}

	var userID, branchID int64
	var name, role, branchName string
	var pinHash *string
	err := h.db.QueryRowContext(c.Request.Context(), `
		SELECT u.id,u.name,u.role,u.branch_id,b.name,u.attendance_pin_hash
		FROM users u JOIN branches b ON b.id=u.branch_id
		WHERE lower(u.username)=lower($1) AND u.role IN ('cashier','branch_manager')`, strings.TrimSpace(input.Username)).Scan(&userID, &name, &role, &branchID, &branchName, &pinHash)
	if err == sql.ErrNoRows || pinHash == nil || *pinHash == "" || bcrypt.CompareHashAndPassword([]byte(*pinHash), []byte(input.PIN)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "ชื่อผู้ใช้หรือ PIN ไม่ถูกต้อง"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเข้าสู่ระบบได้"})
		return
	}
	h.respondStockSession(c, userID, branchID, name, role, branchName)
}

func (h *PlatformHandler) respondStockSession(c *gin.Context, userID, branchID int64, name, role, branchName string) {
	claims := middleware.Claims{UserID: userID, Role: role, BranchID: &branchID, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(12 * time.Hour)), IssuedAt: jwt.NewNumericDate(time.Now())}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้าง access token ได้"})
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sbc_stock_session", token, 12*60*60, "/api/v1", "", os.Getenv("APP_ENV") == "production", true)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": gin.H{"id": userID, "name": name, "role": role, "branchId": branchID, "branchName": branchName}}})
}

func (h *PlatformHandler) StockSession(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	if claims == nil || claims.BranchID == nil || (claims.Role != "cashier" && claims.Role != "branch_manager") {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "บัญชีนี้ไม่สามารถจัดการสต๊อกได้"})
		return
	}
	var name, role, branchName string
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT u.name,u.role,b.name FROM users u JOIN branches b ON b.id=u.branch_id WHERE u.id=$1 AND u.branch_id=$2 AND u.role IN ('cashier','branch_manager')`, claims.UserID, *claims.BranchID).Scan(&name, &role, &branchName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "เซสชันพนักงานไม่พร้อมใช้งาน"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": gin.H{"id": claims.UserID, "name": name, "role": role, "branchId": *claims.BranchID, "branchName": branchName}}})
}

func (h *PlatformHandler) StockLogout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sbc_stock_session", "", -1, "/api/v1", "", os.Getenv("APP_ENV") == "production", true)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

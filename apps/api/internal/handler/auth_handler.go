package handler

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"y/internal/dto"
	"y/internal/middleware"
	"y/internal/service"
)

type loginInput = dto.LoginRequest

const platformSessionTTL = 12 * time.Hour

func platformSessionCookieName(role string) string {
	switch role {
	case "admin":
		return "sbc_admin_session"
	case "franchise_owner":
		return "sbc_franchise_session"
	default:
		return ""
	}
}

func (h *PlatformHandler) setPlatformSessionCookie(c *gin.Context, name, value string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(name, value, maxAge, "/api/v1", "", os.Getenv("APP_ENV") == "production", true)
}

func (h *PlatformHandler) Login(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input loginInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ต้องระบุชื่อผู้ใช้และรหัสผ่าน"})
		return
	}
	loginKey := "sbc:login:limit:" + c.ClientIP() + ":" + strings.ToLower(strings.TrimSpace(input.Username))
	if !h.cache.AllowLogin(c, loginKey, 10, 15*time.Minute) {
		c.JSON(http.StatusTooManyRequests, gin.H{"success": false, "message": "ลองเข้าสู่ระบบใหม่ภายหลัง"})
		return
	}
	user, err := h.auth.Authenticate(c, input.Username, input.Password)
	if err == service.ErrInvalidCredentials {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเข้าสู่ระบบได้"})
		return
	}
	h.cache.Reset(c, loginKey)
	claims := middleware.Claims{UserID: int64(user.ID), Role: user.Role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(platformSessionTTL)), IssuedAt: jwt.NewNumericDate(time.Now())}}
	claims.FranchiseeID = user.FranchiseeID
	claims.BranchID = user.BranchID
	plan := ""
	if user.FranchiseeID != nil {
		if user.BranchID == nil {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "บัญชีแฟรนไชส์ยังไม่ได้เปิดใช้งาน"})
			return
		}
		err = h.db.QueryRowContext(c, `SELECT f.plan FROM franchisees f JOIN branches b ON b.franchisee_id=f.id WHERE f.id=$1 AND b.id=$2 AND f.status='active' AND b.status='active'`, *user.FranchiseeID, *user.BranchID).Scan(&plan)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "บัญชีแฟรนไชส์ยังไม่ได้เปิดใช้งาน"})
			return
		}
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้าง access token ได้"})
		return
	}
	if cookieName := platformSessionCookieName(user.Role); cookieName != "" {
		for _, name := range []string{"sbc_admin_session", "sbc_franchise_session"} {
			if name != cookieName {
				h.setPlatformSessionCookie(c, name, "", -1)
			}
		}
		h.setPlatformSessionCookie(c, cookieName, token, int(platformSessionTTL.Seconds()))
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"user": gin.H{"id": user.ID, "name": user.Name, "role": user.Role, "franchiseeId": claims.FranchiseeID, "branchId": claims.BranchID, "plan": plan}}})
}

func (h *PlatformHandler) Session(c *gin.Context) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "ไม่พบเซสชัน"})
		return
	}
	plan := ""
	if claims.FranchiseeID != nil && claims.BranchID != nil {
		if h.db == nil || h.db.QueryRowContext(c, `SELECT f.plan FROM franchisees f JOIN branches b ON b.franchisee_id=f.id WHERE f.id=$1 AND b.id=$2 AND f.status='active' AND b.status='active'`, *claims.FranchiseeID, *claims.BranchID).Scan(&plan) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "เซสชันแฟรนไชส์ไม่พร้อมใช้งาน"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": gin.H{"id": claims.UserID, "role": claims.Role, "franchiseeId": claims.FranchiseeID, "branchId": claims.BranchID, "plan": plan}}})
}

func (h *PlatformHandler) Logout(c *gin.Context) {
	for _, name := range []string{"sbc_admin_session", "sbc_franchise_session"} {
		h.setPlatformSessionCookie(c, name, "", -1)
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

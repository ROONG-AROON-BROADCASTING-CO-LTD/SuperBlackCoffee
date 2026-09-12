package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID       int64  `json:"userId"`
	Role         string `json:"role"`
	FranchiseeID *int64 `json:"franchiseeId,omitempty"`
	BranchID     *int64 `json:"branchId,omitempty"`
	jwt.RegisteredClaims
}

func RequireAuth(secret string, roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawTokens := []string{strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")}
		cookieNames := []string{"sbc_admin_session", "sbc_franchise_session", "sbc_attendance_session", "sbc_stock_session"}
		switch c.GetHeader("X-SBC-Session-Role") {
		case "admin":
			cookieNames = []string{"sbc_admin_session"}
		case "franchise_owner":
			cookieNames = []string{"sbc_franchise_session"}
		case "stock":
			cookieNames = []string{"sbc_stock_session"}
		}
		for _, name := range cookieNames {
			if value, err := c.Cookie(name); err == nil {
				rawTokens = append(rawTokens, value)
			}
		}
		var authorized *Claims
		hasValidSession := false
		for _, raw := range rawTokens {
			if raw == "" {
				continue
			}
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
				if t.Method != jwt.SigningMethodHS256 {
					return nil, fmt.Errorf("รูปแบบการลงนามของ token ไม่ถูกต้อง: %s", t.Method.Alg())
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				continue
			}
			hasValidSession = true
			if len(roles) == 0 {
				authorized = claims
				break
			}
			for _, role := range roles {
				if claims.Role == role {
					authorized = claims
					break
				}
			}
			if authorized != nil {
				break
			}
		}
		if authorized == nil {
			status, message := http.StatusUnauthorized, "ไม่พบเซสชันหรือเซสชันหมดอายุ"
			if hasValidSession {
				status, message = http.StatusForbidden, "คุณไม่มีสิทธิ์ดำเนินการนี้"
			}
			c.AbortWithStatusJSON(status, gin.H{"success": false, "message": message})
			return
		}
		c.Set("claims", authorized)
		c.Next()
	}
}

func ClaimsFrom(c *gin.Context) *Claims {
	claims, _ := c.Get("claims")
	result, _ := claims.(*Claims)
	return result
}

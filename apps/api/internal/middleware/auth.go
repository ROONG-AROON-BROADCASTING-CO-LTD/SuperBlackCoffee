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
		raw := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		if raw == "" {
			raw, _ = c.Cookie("sbc_attendance_session")
		}
		if raw == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "ไม่พบ access token"})
			return
		}
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
			if t.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("รูปแบบการลงนามของ token ไม่ถูกต้อง: %s", t.Method.Alg())
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "access token ไม่ถูกต้องหรือหมดอายุ"})
			return
		}
		if len(roles) > 0 {
			allowed := false
			for _, role := range roles {
				if claims.Role == role {
					allowed = true
					break
				}
			}
			if !allowed {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "คุณไม่มีสิทธิ์ดำเนินการนี้"})
				return
			}
		}
		c.Set("claims", claims)
		c.Next()
	}
}

func ClaimsFrom(c *gin.Context) *Claims {
	claims, _ := c.Get("claims")
	result, _ := claims.(*Claims)
	return result
}

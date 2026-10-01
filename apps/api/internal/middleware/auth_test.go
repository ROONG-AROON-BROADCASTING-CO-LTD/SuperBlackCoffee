package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func TestRequireAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	validToken := signedToken(t, secret, "admin", time.Now().Add(time.Hour))
	expiredToken := signedToken(t, secret, "admin", time.Now().Add(-time.Hour))
	tests := []struct {
		name       string
		authorize  string
		cookieName string
		cookie     string
		roles      []string
		wantStatus int
	}{
		{name: "missing token", wantStatus: http.StatusUnauthorized},
		{name: "expired token", authorize: "Bearer " + expiredToken, wantStatus: http.StatusUnauthorized},
		{name: "token signed with another secret", authorize: "Bearer " + signedToken(t, "other-secret", "admin", time.Now().Add(time.Hour)), roles: []string{"admin"}, wantStatus: http.StatusUnauthorized},
		{name: "role is denied", authorize: "Bearer " + validToken, roles: []string{"cashier"}, wantStatus: http.StatusForbidden},
		{name: "valid token", authorize: "Bearer " + validToken, roles: []string{"admin"}, wantStatus: http.StatusNoContent},
		{name: "admin session cookie", cookieName: "sbc_admin_session", cookie: validToken, roles: []string{"admin"}, wantStatus: http.StatusNoContent},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			r := gin.New()
			r.GET("/protected", RequireAuth(secret, test.roles...), func(c *gin.Context) {
				if ClaimsFrom(c) == nil {
					t.Fatal("expected claims to be stored")
				}
				c.Status(http.StatusNoContent)
			})
			req := httptest.NewRequest(http.MethodGet, "/protected", nil)
			if test.authorize != "" {
				req.Header.Set("Authorization", test.authorize)
			}
			if test.cookie != "" {
				req.AddCookie(&http.Cookie{Name: test.cookieName, Value: test.cookie})
			}
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, test.wantStatus)
			}
		})
	}
}

func TestRequireAuthRejectsAnUnsignedToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	claims := Claims{
		UserID: 7,
		Role:   "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	unsigned, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("create unsigned token: %v", err)
	}

	router := gin.New()
	router.GET("/protected", RequireAuth("test-secret", "admin"), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+unsigned)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

func TestRequireAuthSelectsMatchingRoleWhenMultipleSessionCookiesExist(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	r := gin.New()
	r.GET("/attendance", RequireAuth(secret, "cashier", "branch_manager"), func(c *gin.Context) {
		claims := ClaimsFrom(c)
		if claims == nil || claims.Role != "cashier" {
			t.Fatalf("claims = %#v, want cashier", claims)
		}
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/attendance", nil)
	req.AddCookie(&http.Cookie{Name: "sbc_admin_session", Value: signedToken(t, secret, "admin", time.Now().Add(time.Hour))})
	req.AddCookie(&http.Cookie{Name: "sbc_attendance_session", Value: signedToken(t, secret, "cashier", time.Now().Add(time.Hour))})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
	}
}

func TestRequireAuthSessionRoleHeaderDoesNotFallbackToAnotherPlatformCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	r := gin.New()
	r.GET("/platform", RequireAuth(secret, "admin"), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/platform", nil)
	req.Header.Set("X-SBC-Session-Role", "admin")
	req.AddCookie(&http.Cookie{
		Name:  "sbc_franchise_session",
		Value: signedToken(t, secret, "franchise_owner", time.Now().Add(time.Hour)),
	})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

func TestRequireAuthStockSessionHeaderOnlyAcceptsDedicatedStockCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	r := gin.New()
	r.GET("/stock", RequireAuth(secret, "cashier", "branch_manager"), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	for _, test := range []struct {
		name       string
		cookieName string
		wantStatus int
	}{
		{name: "attendance cookie cannot unlock stock", cookieName: "sbc_attendance_session", wantStatus: http.StatusUnauthorized},
		{name: "dedicated stock cookie is accepted", cookieName: "sbc_stock_session", wantStatus: http.StatusNoContent},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/stock", nil)
			req.Header.Set("X-SBC-Session-Role", "stock")
			req.AddCookie(&http.Cookie{Name: test.cookieName, Value: signedToken(t, secret, "cashier", time.Now().Add(time.Hour))})
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, test.wantStatus)
			}
		})
	}
}

func TestRequireSessionRoleCannotBeBypassedWithBearerToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	router := gin.New()
	router.GET("/staff-session", RequireSessionRole("attendance"), RequireAuth(secret, "cashier"), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	validCashierToken := signedToken(t, secret, "cashier", time.Now().Add(time.Hour))

	for _, test := range []struct {
		name          string
		bearer        string
		cookieName    string
		cookieValue   string
		requestedRole string
		wantStatus    int
	}{
		{name: "bearer alone cannot replace the staff cookie", bearer: validCashierToken, wantStatus: http.StatusUnauthorized},
		{name: "another cookie and spoofed session role cannot replace the staff cookie", bearer: validCashierToken, cookieName: "sbc_stock_session", cookieValue: validCashierToken, requestedRole: "stock", wantStatus: http.StatusUnauthorized},
		{name: "wrong role in staff cookie remains forbidden", cookieName: "sbc_attendance_session", cookieValue: signedToken(t, secret, "admin", time.Now().Add(time.Hour)), wantStatus: http.StatusForbidden},
		{name: "staff cookie still works alongside a bearer", bearer: validCashierToken, cookieName: "sbc_attendance_session", cookieValue: validCashierToken, wantStatus: http.StatusNoContent},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/staff-session", nil)
			if test.bearer != "" {
				req.Header.Set("Authorization", "Bearer "+test.bearer)
			}
			if test.requestedRole != "" {
				req.Header.Set("X-SBC-Session-Role", test.requestedRole)
			}
			if test.cookieName != "" {
				req.AddCookie(&http.Cookie{Name: test.cookieName, Value: test.cookieValue})
			}
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)
			if res.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, test.wantStatus)
			}
		})
	}
}

func TestRequireAuthImageSessionRoleQueryUsesDedicatedStockCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "test-secret"
	r := gin.New()
	r.GET("/menu-items/1/image", RequireAuth(secret, "cashier", "branch_manager"), func(c *gin.Context) {
		claims := ClaimsFrom(c)
		if claims == nil || claims.Role != "cashier" {
			t.Fatalf("claims = %#v, want cashier", claims)
		}
		c.Status(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/menu-items/1/image?sessionRole=stock", nil)
	req.AddCookie(&http.Cookie{Name: "sbc_admin_session", Value: signedToken(t, secret, "admin", time.Now().Add(time.Hour))})
	req.AddCookie(&http.Cookie{Name: "sbc_stock_session", Value: signedToken(t, secret, "cashier", time.Now().Add(time.Hour))})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
	}
}

func TestRequireAuthAllowsCashierStockRequestWithDedicatedStockSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/stock-requests", RequireAuth("secret", "cashier"), func(c *gin.Context) {
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodPost, "/stock-requests", nil)
	req.Header.Set("X-SBC-Session-Role", "stock")
	req.AddCookie(&http.Cookie{Name: "sbc_stock_session", Value: signedToken(t, "secret", "cashier", time.Now().Add(time.Hour))})
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusCreated)
	}
}

func signedToken(t *testing.T, secret, role string, expiresAt time.Time) string {
	t.Helper()
	claims := Claims{UserID: 7, Role: role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(expiresAt)}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

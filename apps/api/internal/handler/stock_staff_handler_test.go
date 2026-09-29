package handler

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestStockLoginRejectsMalformedPINBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, pin := range []string{"12345", "1234567", "12a456", "１２３４５６"} {
		t.Run(pin, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodPost, "/stock/login", strings.NewReader(`{"username":"staff","pin":"`+pin+`"}`))
			context.Request.Header.Set("Content-Type", "application/json")

			(&PlatformHandler{db: &sql.DB{}}).StockLogin(context)
			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d; want bad request before database access", response.Code)
			}
		})
	}
}

func TestStockSessionRejectsUnscopedAndNonStaffClaimsBeforeReadingUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	branchID := int64(12)
	for _, test := range []struct {
		name   string
		claims *middleware.Claims
	}{
		{name: "missing claims"},
		{name: "cashier without branch", claims: &middleware.Claims{Role: "cashier"}},
		{name: "franchise owner with branch", claims: &middleware.Claims{Role: "franchise_owner", BranchID: &branchID}},
		{name: "admin with branch", claims: &middleware.Claims{Role: "admin", BranchID: &branchID}},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/stock/session", nil)
			if test.claims != nil {
				context.Set("claims", test.claims)
			}

			(&PlatformHandler{db: &sql.DB{}}).StockSession(context)
			if response.Code != http.StatusForbidden {
				t.Fatalf("status = %d; want forbidden before reading user", response.Code)
			}
		})
	}
}

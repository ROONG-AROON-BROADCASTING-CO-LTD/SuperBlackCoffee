package handler

import (
	"bytes"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestFranchiseAccountEndpointsRejectClaimsWithoutTenantOwnership(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &PlatformHandler{db: &sql.DB{}}
	for _, tc := range []struct {
		name, method, path string
		handle             func(*gin.Context)
	}{
		{"settings read", http.MethodGet, "/franchise/account-settings", h.GetFranchiseAccountSettings},
		{"password update", http.MethodPatch, "/franchise/account-settings/password", h.UpdateFranchiseAccountPassword},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, claims := range []*middleware.Claims{nil, {Role: "franchise_owner", UserID: 7}} {
				response := httptest.NewRecorder()
				ctx, _ := gin.CreateTestContext(response)
				ctx.Request = httptest.NewRequest(tc.method, tc.path, nil)
				if claims != nil {
					ctx.Set("claims", claims)
				}
				tc.handle(ctx)
				if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), `"success":false`) {
					t.Fatalf("claims=%+v status=%d body=%s; want forbidden envelope", claims, response.Code, response.Body.String())
				}
			}
		})
	}
}

func TestFranchisePasswordUpdateRejectsMalformedAndShortPasswordsBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &PlatformHandler{db: &sql.DB{}}
	franchiseID, branchID := int64(2), int64(3)
	for _, body := range []string{
		`{`,
		`{}`,
		`{"currentPassword":"correct","newPassword":"short"}`,
		`{"currentPassword":"correct","newPassword":"        "}`,
	} {
		t.Run(body, func(t *testing.T) {
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Request = httptest.NewRequest(http.MethodPatch, "/franchise/account-settings/password", bytes.NewBufferString(body))
			ctx.Request.Header.Set("Content-Type", "application/json")
			ctx.Set("claims", &middleware.Claims{Role: "franchise_owner", UserID: 7, FranchiseeID: &franchiseID, BranchID: &branchID})
			h.UpdateFranchiseAccountPassword(ctx)
			if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), `"success":false`) {
				t.Fatalf("status=%d body=%s; want bad request envelope", response.Code, response.Body.String())
			}
		})
	}
}

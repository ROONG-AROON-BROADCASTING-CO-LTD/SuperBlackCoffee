package authorization

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestBranchIDUsesClaimForNonAdmin(t *testing.T) {
	branchID := int64(12)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodGet, "/inventory?branchId=99", nil)
	ctx.Set("claims", &middleware.Claims{Role: "cashier", BranchID: &branchID})
	got, ok := BranchID(ctx, nil)
	if !ok || got != branchID {
		t.Fatalf("branch = %d, ok = %t", got, ok)
	}
}

func TestBranchIDRejectsMissingClaims(t *testing.T) {
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/inventory?branchId=12", nil)

	got, ok := BranchID(ctx, nil)
	if ok || got != 0 || response.Code != http.StatusUnauthorized {
		t.Fatalf("branch = %d, ok = %t, status = %d; want unauthorized", got, ok, response.Code)
	}
}

func TestBranchIDIgnoresForgedBranchSelectorsForScopedRoles(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, role := range []string{"cashier", "branch_manager", "franchise_owner"} {
		t.Run(role, func(t *testing.T) {
			claimedBranch := int64(12)
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Request = httptest.NewRequest(http.MethodGet, "/inventory?branchId=99&branchCode=OTHER-FRANCHISE", nil)
			ctx.Set("claims", &middleware.Claims{Role: role, BranchID: &claimedBranch})

			got, ok := BranchID(ctx, nil)
			if !ok || got != claimedBranch || response.Code != http.StatusOK {
				t.Fatalf("role %q resolved branch %d, ok=%t, status=%d; want claimed branch %d", role, got, ok, response.Code, claimedBranch)
			}
		})
	}
}

func TestBranchIDRejectsUnscopedNonAdmin(t *testing.T) {
	res := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(res)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/inventory", nil)
	ctx.Set("claims", &middleware.Claims{Role: "cashier"})
	_, ok := BranchID(ctx, nil)
	if ok || res.Code != http.StatusForbidden {
		t.Fatalf("ok = %t, status = %d", ok, res.Code)
	}
}

func TestBranchIDRejectsNonPositiveClaimedBranch(t *testing.T) {
	for _, branchID := range []int64{0, -1} {
		res := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(res)
		ctx.Request = httptest.NewRequest(http.MethodGet, "/inventory?branchId=12", nil)
		ctx.Set("claims", &middleware.Claims{Role: "cashier", BranchID: &branchID})
		got, ok := BranchID(ctx, nil)
		if ok || got != 0 || res.Code != http.StatusForbidden {
			t.Fatalf("claimed branch %d resolved branch %d, ok=%t, status=%d", branchID, got, ok, res.Code)
		}
	}
}

func TestBranchIDValidatesAdminBranchID(t *testing.T) {
	res := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(res)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/inventory?branchId=invalid", nil)
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	_, ok := BranchID(ctx, nil)
	if ok || res.Code != http.StatusBadRequest {
		t.Fatalf("ok = %t, status = %d", ok, res.Code)
	}
}

func TestBranchIDRejectsMissingAndNonPositiveAdminBranchSelectors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, query := range []string{"", "?branchId=0", "?branchId=-4", "?branchId=9223372036854775808"} {
		t.Run(query, func(t *testing.T) {
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Request = httptest.NewRequest(http.MethodGet, "/inventory"+query, nil)
			ctx.Set("claims", &middleware.Claims{Role: "admin"})

			got, ok := BranchID(ctx, nil)
			if ok || got != 0 || response.Code != http.StatusBadRequest {
				t.Fatalf("query %q resolved branch %d, ok=%t, status=%d; want bad request", query, got, ok, response.Code)
			}
		})
	}
}

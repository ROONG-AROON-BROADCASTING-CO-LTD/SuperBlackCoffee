package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestRequestBranchScopePreventsNonAdminFromSelectingAnotherBranch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	claimedBranch := int64(12)
	requestedBranch := int64(99)
	res := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(res)
	ctx.Set("claims", &middleware.Claims{Role: "branch_manager", BranchID: &claimedBranch})

	got, ok := (&PlatformHandler{}).requestBranchScope(ctx, &requestedBranch)
	if !ok || got != claimedBranch {
		t.Fatalf("branch = %d, ok = %t; want claimed branch %d", got, ok, claimedBranch)
	}
}

func TestRequestBranchScopeRequiresAnExplicitValidBranchForAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name      string
		requested *int64
		wantOK    bool
	}{
		{name: "admin can select branch", requested: pointerTo(int64(99)), wantOK: true},
		{name: "admin cannot omit branch", requested: nil, wantOK: false},
		{name: "admin cannot select zero branch", requested: pointerTo(int64(0)), wantOK: false},
	} {
		t.Run(test.name, func(t *testing.T) {
			res := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(res)
			ctx.Set("claims", &middleware.Claims{Role: "admin"})

			got, ok := (&PlatformHandler{}).requestBranchScope(ctx, test.requested)
			if ok != test.wantOK {
				t.Fatalf("ok = %t, want %t", ok, test.wantOK)
			}
			if test.wantOK && got != 99 {
				t.Fatalf("branch = %d, want 99", got)
			}
			if !test.wantOK && res.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestAttendanceClaimsAllowsOnlyAttendanceRoles(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name string
		role string
		want bool
	}{
		{name: "cashier", role: "cashier", want: true},
		{name: "branch manager", role: "branch_manager", want: true},
		{name: "admin", role: "admin", want: false},
		{name: "franchise owner", role: "franchise_owner", want: false},
	} {
		t.Run(test.name, func(t *testing.T) {
			res := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(res)
			ctx.Set("claims", &middleware.Claims{Role: test.role})

			claims, ok := attendanceClaims(ctx)
			if ok != test.want {
				t.Fatalf("ok = %t, want %t", ok, test.want)
			}
			if test.want && claims == nil {
				t.Fatal("expected attendance claims")
			}
			if !test.want && res.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
			}
		})
	}
}

func pointerTo[T any](value T) *T { return &value }

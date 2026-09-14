package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestCanRecordAttendanceAllowsOnlyWorkingShiftStatuses(t *testing.T) {
	tests := []struct {
		status string
		want   bool
	}{
		{status: "scheduled", want: true},
		{status: "compensatory_work", want: true},
		{status: "leave", want: false},
		{status: "sick_leave", want: false},
		{status: "off", want: false},
		{status: "", want: false},
	}
	for _, test := range tests {
		t.Run(test.status, func(t *testing.T) {
			if got := canRecordAttendance(test.status); got != test.want {
				t.Fatalf("canRecordAttendance(%q) = %t, want %t", test.status, got, test.want)
			}
		})
	}
}

func TestAttendanceClaimsRejectsMissingOrUnauthorizedRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name   string
		claims *middleware.Claims
	}{
		{name: "missing claims"},
		{name: "admin role", claims: &middleware.Claims{Role: "admin"}},
		{name: "franchise role", claims: &middleware.Claims{Role: "franchise_owner"}},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/attendance/today", nil)
			if test.claims != nil {
				context.Set("claims", test.claims)
			}
			if claims, ok := attendanceClaims(context); ok || claims != nil {
				t.Fatal("attendance claims unexpectedly authorized an invalid session")
			}
			if response.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
			}
		})
	}
}

func TestAttendanceClaimsAllowsScopedStaffRoles(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, role := range []string{"cashier", "branch_manager"} {
		t.Run(role, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/attendance/today", nil)
			context.Set("claims", &middleware.Claims{Role: role})
			claims, ok := attendanceClaims(context)
			if !ok || claims == nil || claims.Role != role {
				t.Fatalf("role %q should be allowed", role)
			}
		})
	}
}

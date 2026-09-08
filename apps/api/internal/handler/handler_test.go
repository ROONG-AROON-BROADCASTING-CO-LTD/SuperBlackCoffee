package handler

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
	"y/internal/model"
)

func TestPlatformHandlerRejectsDatabaseDependentRequestsWhenDatabaseIsMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewPlatformHandler(nil, nil, nil, nil, nil)
	res := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(res)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/dashboard", nil)
	if !handler.unavailable(ctx) {
		t.Fatal("expected nil database to be unavailable")
	}
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusServiceUnavailable)
	}
}

func TestMenuPlanAccess(t *testing.T) {
	for _, test := range []struct {
		name, plan, category string
		allowed              bool
	}{
		{"S allows beverages", franchisePlanS, "เมนูกาแฟเย็น", true},
		{"S blocks food", franchisePlanS, "อาหาร", false},
		{"S blocks bakery", franchisePlanS, "เบเกอรี่", false},
		{"M allows food", franchisePlanM, "อาหาร", true},
		{"M blocks bakery", franchisePlanM, "เบเกอรี่", false},
		{"L allows all", franchisePlanL, "เบเกอรี่", true},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := menuAllowedForPlan(test.plan, test.category); got != test.allowed {
				t.Fatalf("menuAllowedForPlan(%q, %q) = %t, want %t", test.plan, test.category, got, test.allowed)
			}
		})
	}
}

func TestFilterMenuForPlan(t *testing.T) {
	handler := &PlatformHandler{}
	items := []model.MenuItem{{Name: "ชา", Category: "เมนูชา"}, {Name: "ข้าว", Category: "อาหาร"}, {Name: "เค้ก", Category: "เบเกอรี่"}}
	if got := handler.filterMenuForPlan(franchisePlanS, items); len(got) != 1 || got[0].Name != "ชา" {
		t.Fatalf("S menu filter = %#v", got)
	}
	if got := handler.filterMenuForPlan(franchisePlanM, items); len(got) != 2 || got[1].Name != "ข้าว" {
		t.Fatalf("M menu filter = %#v", got)
	}
	if got := handler.filterMenuForPlan(franchisePlanL, items); len(got) != 3 {
		t.Fatalf("L menu filter length = %d", len(got))
	}
}

func TestFranchiseCatalogIsReadOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name string
		role string
		want bool
	}{
		{name: "franchise owner is blocked", role: "franchise_owner", want: false},
		{name: "admin can manage catalogue", role: "admin", want: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			res := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(res)
			ctx.Set("claims", &middleware.Claims{Role: test.role})
			if got := (&PlatformHandler{}).ensureCatalogWriteAllowed(ctx); got != test.want {
				t.Fatalf("ensureCatalogWriteAllowed() = %t, want %t", got, test.want)
			}
			if !test.want && res.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
			}
		})
	}
}

func TestPlatformHandlerIsAvailableWhenDatabaseExists(t *testing.T) {
	handler := &PlatformHandler{db: &sql.DB{}}
	res := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(res)
	if handler.unavailable(ctx) {
		t.Fatal("expected handler without a response to remain available")
	}
}

func TestCanRecordAttendanceOnlyForWorkingShiftStates(t *testing.T) {
	tests := []struct {
		name   string
		status string
		want   bool
	}{
		{name: "scheduled shift", status: "scheduled", want: true},
		{name: "compensatory work shift", status: "compensatory_work", want: true},
		{name: "day off", status: "day_off", want: false},
		{name: "approved leave", status: "sick_leave", want: false},
		{name: "missing shift", status: "", want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := canRecordAttendance(test.status); got != test.want {
				t.Fatalf("canRecordAttendance(%q) = %t, want %t", test.status, got, test.want)
			}
		})
	}
}

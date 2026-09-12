package handler

import (
	"bytes"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/dto"
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
		{"S blocks mixed-case English food", franchisePlanS, " Food ", false},
		{"S blocks mixed-case English bakery", franchisePlanS, "BAKERY", false},
		{"M allows food", franchisePlanM, "อาหาร", true},
		{"M allows bakery", franchisePlanM, "เบเกอรี่", true},
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
	if got := handler.filterMenuForPlan(franchisePlanM, items); len(got) != 3 {
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

func TestNormalizedMenuRecipesKeepsChannelRecipesSeparateAndSupportsLegacyClients(t *testing.T) {
	storefront := []dto.MenuIngredientRequest{{InventoryItemID: 1, Quantity: 20, Unit: "กรัม"}}
	lineman := []dto.MenuIngredientRequest{{InventoryItemID: 2, Quantity: 35, Unit: "กรัม"}}
	for _, test := range []struct {
		name                        string
		input                       dto.MenuRequest
		wantStorefront, wantLineman []dto.MenuIngredientRequest
	}{
		{
			name:           "separate formulas stay separate",
			input:          dto.MenuRequest{StorefrontIngredients: storefront, LinemanIngredients: lineman},
			wantStorefront: storefront, wantLineman: lineman,
		},
		{
			name:           "legacy ingredients populate both channels",
			input:          dto.MenuRequest{Ingredients: storefront},
			wantStorefront: storefront, wantLineman: storefront,
		},
		{
			name:           "explicitly empty line man formula remains empty",
			input:          dto.MenuRequest{StorefrontIngredients: storefront, LinemanIngredients: []dto.MenuIngredientRequest{}},
			wantStorefront: storefront, wantLineman: []dto.MenuIngredientRequest{},
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			gotStorefront, gotLineman := normalizedMenuRecipes(test.input)
			if !reflect.DeepEqual(gotStorefront, test.wantStorefront) || !reflect.DeepEqual(gotLineman, test.wantLineman) {
				t.Fatalf("normalized recipes = storefront %#v, lineman %#v; want storefront %#v, lineman %#v", gotStorefront, gotLineman, test.wantStorefront, test.wantLineman)
			}
		})
	}
}

func TestConsumeStockFromMenusRejectsInvalidChannelBeforeAccessingBranchData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &PlatformHandler{db: &sql.DB{}}
	res := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(res)
	ctx.Request = httptest.NewRequest(
		http.MethodPost,
		"/api/v1/stock/consume",
		bytes.NewBufferString(`{"items":[{"menuItemId":1,"quantity":1}],"note":"ปิดกะ","channel":"unknown"}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	handler.ConsumeStockFromMenus(ctx)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d: %s", res.Code, http.StatusBadRequest, res.Body.String())
	}
}

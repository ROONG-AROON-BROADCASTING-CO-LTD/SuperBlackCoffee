package handler

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/dto"
	"y/internal/middleware"
	"y/internal/model"
)

func TestMenuImageThumbnailKeepsAnImageAndLimitsItsSize(t *testing.T) {
	source := image.NewRGBA(image.Rect(0, 0, 960, 640))
	for y := 0; y < 640; y++ {
		for x := 0; x < 960; x++ {
			source.Set(x, y, color.RGBA{R: uint8(x * y % 256), G: uint8((x*37 + y*71) % 256), B: uint8((x*113 + y*29) % 256), A: 255})
		}
	}
	var original bytes.Buffer
	if err := png.Encode(&original, source); err != nil {
		t.Fatal(err)
	}
	thumbnail, err := menuImageThumbnail("data:image/png;base64," + base64.StdEncoding.EncodeToString(original.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	decoded, format, err := image.Decode(bytes.NewReader(thumbnail))
	if err != nil {
		t.Fatal(err)
	}
	if format != "jpeg" || decoded.Bounds().Dx() != 480 || decoded.Bounds().Dy() != 320 {
		t.Fatalf("thumbnail format=%q bounds=%v", format, decoded.Bounds())
	}
	if len(thumbnail) >= original.Len() {
		t.Fatalf("thumbnail size %d should be smaller than original %d", len(thumbnail), original.Len())
	}
}

func TestMenuImageURLsUseCurrentRequestOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, "https://api.example.test/api/v1/menu-items", nil)
	items := []model.MenuItem{{ImageURL: "/api/v1/menu-items/7/image?branchId=2"}}
	setMenuImageOrigins(ctx, items)
	if items[0].ImageURL != "https://api.example.test/api/v1/menu-items/7/image?branchId=2" {
		t.Fatalf("image URL = %q", items[0].ImageURL)
	}
}

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

func TestMenuSummaryRejectsInvalidPaginationAndScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &PlatformHandler{db: &sql.DB{}}
	for _, query := range []string{"page=0", "page=abc", "pageSize=0", "pageSize=51", "scope=other"} {
		t.Run(query, func(t *testing.T) {
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/menu-items/summary?"+query, nil)
			handler.ListMenuItemSummary(ctx)
			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
			}
		})
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

func TestDashboardTrendConfig(t *testing.T) {
	for _, test := range []struct {
		period  string
		unit    string
		buckets int
		format  string
		ok      bool
	}{
		{period: "day", unit: "day", buckets: 7, format: "YYYY-MM-DD", ok: true},
		{period: "month", unit: "month", buckets: 12, format: "YYYY-MM-DD", ok: true},
		{period: "year", unit: "year", buckets: 5, format: "YYYY-MM-DD", ok: true},
		{period: "week", ok: false},
	} {
		config, ok := dashboardTrendConfig(test.period)
		if ok != test.ok || (ok && (config.unit != test.unit || config.buckets != test.buckets || config.format != test.format)) {
			t.Fatalf("dashboardTrendConfig(%q) = %#v, %t", test.period, config, ok)
		}
	}
}

func TestFoodStorySalesImportHelpers(t *testing.T) {
	menus := []salesImportMenu{
		{id: 1, name: "อเมริกาโน่เย็น", storePrice: 60, storeAvailable: true},
		{id: 2, name: "ลาเต้เย็น", storePrice: 65, storeAvailable: true},
	}
	matched, ok := findSalesImportMenu(menus, "อเมริกาโน่เย็น - หวานน้อย x 1")
	if !ok || matched.id != 1 {
		t.Fatalf("menu match = %#v, %t; want อเมริกาโน่เย็น", matched, ok)
	}

	branches := []salesImportBranch{{id: 7, name: "อยุธยา", code: "aya"}}
	branch, ok := findSalesImportBranch(branches, "SuperBlackcoffee(สาขาอยุธยา)")
	if !ok || branch.id != 7 {
		t.Fatalf("branch match = %#v, %t; want อยุธยา", branch, ok)
	}

	if channel := importChannel("LINE MAN"); channel != "lineman" {
		t.Fatalf("line man channel = %q", channel)
	}
	if channel := importChannel("หน้าร้าน"); channel != "storefront" {
		t.Fatalf("storefront channel = %q", channel)
	}

	soldAt, err := parseWorkbookSaleTime("14/09/2026", "09:35")
	if err != nil || soldAt.Day() != 14 || soldAt.Month() != 9 || soldAt.Year() != 2026 {
		t.Fatalf("sale time = %v, %v", soldAt, err)
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

func TestNormalizeInventoryUnitMakesRecipeUnitsComparable(t *testing.T) {
	tests := []struct {
		name, input, want string
	}{
		{name: "trims whitespace", input: "  กรัม  ", want: "กรัม"},
		{name: "normalizes English case", input: " ML ", want: "ml"},
		{name: "removes trailing period", input: "ml.", want: "ml"},
		{name: "keeps empty input empty", input: " \t ", want: ""},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := normalizeInventoryUnit(test.input); got != test.want {
				t.Fatalf("normalizeInventoryUnit(%q) = %q, want %q", test.input, got, test.want)
			}
		})
	}
}

func TestConsumeStockFromMenusRejectsInvalidInputBeforeAccessingBranchData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name string
		body string
	}{
		{
			name: "unknown sales channel",
			body: `{"items":[{"menuItemId":1,"quantity":1}],"note":"ปิดกะ","channel":"unknown"}`,
		},
		{
			name: "unknown item sales channel",
			body: `{"items":[{"menuItemId":1,"quantity":1,"channel":"unknown"}],"note":"ปิดกะ","channel":"storefront"}`,
		},
		{
			name: "empty consumption list",
			body: `{"items":[],"note":"ปิดกะ","channel":"storefront"}`,
		},
		{
			name: "zero menu quantity",
			body: `{"items":[{"menuItemId":1,"quantity":0}],"note":"ปิดกะ","channel":"storefront"}`,
		},
		{
			name: "missing audit note",
			body: `{"items":[{"menuItemId":1,"quantity":1}],"channel":"storefront"}`,
		},
		{
			name: "whitespace-only audit note",
			body: `{"items":[{"menuItemId":1,"quantity":1}],"note":" \t ","channel":"storefront"}`,
		},
		{
			name: "malformed JSON",
			body: `{"items":`,
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			handler := &PlatformHandler{db: &sql.DB{}}
			res := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(res)
			ctx.Request = httptest.NewRequest(
				http.MethodPost,
				"/api/v1/stock/consume",
				bytes.NewBufferString(test.body),
			)
			ctx.Request.Header.Set("Content-Type", "application/json")

			handler.ConsumeStockFromMenus(ctx)

			if res.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d: %s", res.Code, http.StatusBadRequest, res.Body.String())
			}
		})
	}
}

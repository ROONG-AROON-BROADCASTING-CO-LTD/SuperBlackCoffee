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

func TestReadHandlersReportDatabaseFailureWithoutReturningSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := sql.Open("pgx", "")
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	h := &PlatformHandler{db: db}
	for _, tt := range []struct {
		name    string
		handler gin.HandlerFunc
	}{
		{"website inbox", h.ListWebsiteLeads},
		{"promotions", h.ListPromotions},
		{"staff directory", h.ListStaffUsers},
		{"franchise directory", h.ListFranchisees},
		{"asset inventory", h.ListAssets},
		{"asset events", h.ListAssetEvents},
		{"inspections", h.ListInspections},
		{"inspection templates", h.ListInspectionTemplates},
		{"service invoices", h.ListServiceInvoices},
		{"purchase orders", h.ListPurchaseOrders},
		{"stock movements", h.ListStockMovements},
		{"dashboard consumption trend", h.DashboardTrend},
		{"dashboard sales trend", h.SalesTrend},
		{"expiry warning settings", h.GetExpiryWarningSettings},
		{"branch catalog selections", h.ListBranchCatalogSelections},
		{"branch catalog exceptions", h.ListCatalogTemplateExceptions},
	} {
		t.Run(tt.name, func(t *testing.T) {
			res := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(res)
			c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
			c.Request.URL.RawQuery = "branchId=1"
			c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "branchId", Value: "1"}}
			c.Set("claims", &middleware.Claims{Role: "admin", UserID: 7})
			tt.handler(c)
			if res.Code != http.StatusInternalServerError || !strings.Contains(res.Body.String(), `"success":false`) {
				t.Fatalf("database failure returned %d %s", res.Code, res.Body.String())
			}
			if strings.Contains(res.Body.String(), "database is closed") {
				t.Fatal("database internals leaked in response")
			}
		})
	}
}

func TestAttendanceLocationDatabaseFailureCannotAuthorizeCheckIn(t *testing.T) {
	db, err := sql.Open("pgx", "")
	if err != nil {
		t.Fatal(err)
	}
	_ = db.Close()
	lat, lon := 16.0, 100.0
	res := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(res)
	c.Request = httptest.NewRequest(http.MethodPost, "/", nil)
	allowed := (&PlatformHandler{db: db}).validateAttendanceLocation(c, 1, attendanceLocationInput{Latitude: &lat, Longitude: &lon})
	if allowed || res.Code != http.StatusInternalServerError {
		t.Fatalf("database unavailable allowed=%v status=%d", allowed, res.Code)
	}
	if strings.Contains(res.Body.String(), "database is closed") {
		t.Fatal("database internals leaked in response")
	}
}

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
	} {
		t.Run(tt.name, func(t *testing.T) {
			res := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(res)
			c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
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

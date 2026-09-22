package handler

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestConsumeStockFromMenusRejectsInvalidInputBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name, body, message string
	}{
		{"malformed JSON", `{`, "ข้อมูลเมนูที่ขายไม่ถูกต้อง"},
		{"no items", `{"items":[],"note":"sale","channel":"storefront"}`, "ข้อมูลเมนูที่ขายไม่ถูกต้อง"},
		{"invalid menu ID", `{"items":[{"menuItemId":-1,"quantity":1}],"note":"sale","channel":"storefront"}`, "ข้อมูลเมนูที่ขายไม่ถูกต้อง"},
		{"zero quantity", `{"items":[{"menuItemId":1,"quantity":0}],"note":"sale","channel":"storefront"}`, "ข้อมูลเมนูที่ขายไม่ถูกต้อง"},
		{"invalid row channel", `{"items":[{"menuItemId":1,"quantity":1,"channel":"delivery"}],"note":"sale","channel":"storefront"}`, "ข้อมูลเมนูที่ขายไม่ถูกต้อง"},
		{"invalid default channel", `{"items":[{"menuItemId":1,"quantity":1}],"note":"sale","channel":"delivery"}`, "ข้อมูลเมนูที่ขายไม่ถูกต้อง"},
		{"whitespace note", `{"items":[{"menuItemId":1,"quantity":1}],"note":"   ","channel":"storefront"}`, "ต้องระบุหมายเหตุการตัดสต๊อก"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/stock/consume", strings.NewReader(tc.body))
			ctx.Request.Header.Set("Content-Type", "application/json")
			(&PlatformHandler{db: &sql.DB{}}).ConsumeStockFromMenus(ctx)
			if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), tc.message) {
				t.Fatalf("response = %d %s, want 400 with %q", response.Code, response.Body.String(), tc.message)
			}
		})
	}
}

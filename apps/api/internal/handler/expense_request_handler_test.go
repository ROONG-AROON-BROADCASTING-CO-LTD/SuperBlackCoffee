package handler

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCreateExpenseRequestRejectsInvalidInputBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name, body string
		want       string
	}{
		{"malformed JSON", `{`, "กรอกข้อมูลคำขอค่าใช้จ่ายให้ครบถ้วน"},
		{"missing title", `{"category":"office","estimatedAmount":100}`, "กรอกข้อมูลคำขอค่าใช้จ่ายให้ครบถ้วน"},
		{"whitespace title", `{"title":"   ","category":"office","estimatedAmount":100}`, "ระบุชื่อรายการค่าใช้จ่าย"},
		{"invalid category", `{"title":"กระดาษ","category":"unknown","estimatedAmount":100}`, "กรอกข้อมูลคำขอค่าใช้จ่ายให้ครบถ้วน"},
		{"zero amount", `{"title":"กระดาษ","category":"office","estimatedAmount":0}`, "กรอกข้อมูลคำขอค่าใช้จ่ายให้ครบถ้วน"},
		{"negative amount", `{"title":"กระดาษ","category":"office","estimatedAmount":-1}`, "กรอกข้อมูลคำขอค่าใช้จ่ายให้ครบถ้วน"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/expense-requests", strings.NewReader(tt.body))
			ctx.Request.Header.Set("Content-Type", "application/json")
			(&PlatformHandler{db: &sql.DB{}}).CreateExpenseRequest(ctx)
			if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), tt.want) {
				t.Fatalf("response = %d %s, want 400 containing %q", response.Code, response.Body.String(), tt.want)
			}
		})
	}
}

func TestUpdateExpenseRequestStatusRejectsInvalidInputBeforeTransaction(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name, id, body, want string
	}{
		{"non-numeric ID", "abc", `{"status":"approved"}`, "รหัสคำขอไม่ถูกต้อง"},
		{"zero ID", "0", `{"status":"approved"}`, "รหัสคำขอไม่ถูกต้อง"},
		{"malformed JSON", "1", `{`, "สถานะคำขอไม่ถูกต้อง"},
		{"invalid transition target", "1", `{"status":"pending"}`, "สถานะคำขอไม่ถูกต้อง"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Params = gin.Params{{Key: "id", Value: tt.id}}
			ctx.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/expense-requests/"+tt.id+"/status", strings.NewReader(tt.body))
			ctx.Request.Header.Set("Content-Type", "application/json")
			(&PlatformHandler{db: &sql.DB{}}).UpdateExpenseRequestStatus(ctx)
			if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), tt.want) {
				t.Fatalf("response = %d %s, want 400 containing %q", response.Code, response.Body.String(), tt.want)
			}
		})
	}
}

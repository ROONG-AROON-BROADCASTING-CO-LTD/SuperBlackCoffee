package handler

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestAttendanceManagementScopeIsolatesCompanyAndFranchise(t *testing.T) {
	gin.SetMode(gin.TestMode)
	franchiseID := int64(27)
	tests := []struct {
		name       string
		claims     *middleware.Claims
		wantScope  string
		wantArgs   []any
		wantStatus int
	}{
		{name: "company admin excludes franchise data", claims: &middleware.Claims{Role: "admin"}, wantScope: "b.franchisee_id IS NULL AND u.franchisee_id IS NULL"},
		{name: "owner sees only matching branch and staff franchise", claims: &middleware.Claims{Role: "franchise_owner", FranchiseeID: &franchiseID}, wantScope: "b.franchisee_id=$1 AND u.franchisee_id=$1", wantArgs: []any{franchiseID}},
		{name: "owner without franchise is forbidden", claims: &middleware.Claims{Role: "franchise_owner"}, wantStatus: http.StatusForbidden},
		{name: "staff cannot view management data", claims: &middleware.Claims{Role: "cashier"}, wantStatus: http.StatusForbidden},
		{name: "missing session is unauthorized", wantStatus: http.StatusUnauthorized},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/attendance/management", nil)
			if test.claims != nil {
				context.Set("claims", test.claims)
			}
			scope, args, ok := attendanceManagementScope(context)
			if test.wantStatus != 0 {
				if ok || response.Code != test.wantStatus {
					t.Fatalf("allowed = %t, status = %d; want denied with %d", ok, response.Code, test.wantStatus)
				}
				return
			}
			if !ok || scope != test.wantScope || !reflect.DeepEqual(args, test.wantArgs) {
				t.Fatalf("allowed = %t, scope = %q, args = %#v; want %q, %#v", ok, scope, args, test.wantScope, test.wantArgs)
			}
		})
	}
}

func TestCreateLeaveRequestRejectsInvalidInputBeforeStorage(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name        string
		body        string
		wantMessage string
	}{
		{name: "malformed JSON", body: "{", wantMessage: "ข้อมูลคำขอลาไม่ถูกต้อง"},
		{name: "blank reason", body: `{"leaveDate":"2099-01-01","leaveEndDate":"2099-01-02","leaveType":"sick","reason":"   "}`, wantMessage: "ข้อมูลคำขอลาไม่ถูกต้อง"},
		{name: "unsupported leave type", body: `{"leaveDate":"2099-01-01","leaveEndDate":"2099-01-02","leaveType":"admin","reason":"test"}`, wantMessage: "ข้อมูลคำขอลาไม่ถูกต้อง"},
		{name: "invalid start date", body: `{"leaveDate":"not-a-date","leaveEndDate":"2099-01-02","leaveType":"sick","reason":"test"}`, wantMessage: "วันที่ลาไม่ถูกต้อง"},
		{name: "end before start", body: `{"leaveDate":"2099-01-02","leaveEndDate":"2099-01-01","leaveType":"sick","reason":"test"}`, wantMessage: "ช่วงวันลาไม่ถูกต้อง"},
		{name: "more than 31 days", body: `{"leaveDate":"2099-01-01","leaveEndDate":"2099-02-02","leaveType":"sick","reason":"test"}`, wantMessage: "ช่วงวันลาไม่ถูกต้อง"},
		{name: "retroactive leave", body: `{"leaveDate":"2000-01-01","leaveEndDate":"2000-01-02","leaveType":"sick","reason":"test"}`, wantMessage: "ส่งคำขอลาย้อนหลังไม่ได้"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodPost, "/attendance/leave-requests", strings.NewReader(test.body))
			context.Request.Header.Set("Content-Type", "application/json")
			context.Set("claims", &middleware.Claims{Role: "cashier"})
			(&PlatformHandler{}).CreateLeaveRequest(context)
			if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), test.wantMessage) {
				t.Fatalf("status = %d, body = %q; want 400 with %q", response.Code, response.Body.String(), test.wantMessage)
			}
		})
	}
}

func TestUpdateLeaveRequestStatusRejectsInvalidInputBeforeStorage(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name        string
		id          string
		body        string
		wantMessage string
	}{
		{name: "malformed JSON", id: "12", body: "{", wantMessage: "สถานะคำขอลาไม่ถูกต้อง"},
		{name: "unsupported status", id: "12", body: `{"status":"pending"}`, wantMessage: "สถานะคำขอลาไม่ถูกต้อง"},
		{name: "missing status", id: "12", body: `{}`, wantMessage: "สถานะคำขอลาไม่ถูกต้อง"},
		{name: "non-numeric id", id: "abc", body: `{"status":"approved"}`, wantMessage: "รหัสคำขอลาไม่ถูกต้อง"},
		{name: "zero id", id: "0", body: `{"status":"approved"}`, wantMessage: "รหัสคำขอลาไม่ถูกต้อง"},
		{name: "negative id", id: "-4", body: `{"status":"rejected"}`, wantMessage: "รหัสคำขอลาไม่ถูกต้อง"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodPatch, "/attendance/leave-requests/"+test.id, strings.NewReader(test.body))
			context.Request.Header.Set("Content-Type", "application/json")
			context.Params = gin.Params{{Key: "id", Value: test.id}}
			context.Set("claims", &middleware.Claims{Role: "admin"})

			(&PlatformHandler{}).UpdateLeaveRequestStatus(context)

			if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), test.wantMessage) {
				t.Fatalf("status = %d, body = %q; want 400 with %q", response.Code, response.Body.String(), test.wantMessage)
			}
		})
	}
}

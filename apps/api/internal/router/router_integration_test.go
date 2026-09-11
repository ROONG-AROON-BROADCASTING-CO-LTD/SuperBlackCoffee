package router

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"y/internal/config"
	"y/internal/database"
	"y/internal/middleware"
)

func TestHealthIsPublic(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
}

func TestProtectedRoutesRequireToken(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

func TestProtectedRoutesAcceptAttendanceSessionCookie(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard", nil)
	req.AddCookie(&http.Cookie{Name: "sbc_attendance_session", Value: testToken(t, "cashier")})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code == http.StatusUnauthorized {
		t.Fatalf("attendance session cookie was not accepted")
	}
}

func TestPlatformSessionCookieRestoresSessionAndCanLogOut(t *testing.T) {
	r := New(nil, nil)
	token := testToken(t, "admin")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
	req.AddCookie(&http.Cookie{Name: "sbc_admin_session", Value: token})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("session = %d: %s", res.Code, res.Body.String())
	}
	if strings.Contains(res.Body.String(), "accessToken") {
		t.Fatalf("session response must not expose access tokens: %s", res.Body.String())
	}

	logoutReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	logoutReq.Header.Set("X-SBC-Session-Role", "admin")
	logoutRes := httptest.NewRecorder()
	r.ServeHTTP(logoutRes, logoutReq)
	if logoutRes.Code != http.StatusOK {
		t.Fatalf("logout = %d: %s", logoutRes.Code, logoutRes.Body.String())
	}
	cookies := logoutRes.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "sbc_admin_session" || cookies[0].MaxAge >= 0 || !cookies[0].HttpOnly {
		t.Fatalf("logout did not clear the HttpOnly platform cookie: %#v", cookies)
	}
}

func TestPlatformSessionRejectsAttendanceSessionCookie(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
	req.AddCookie(&http.Cookie{Name: "sbc_attendance_session", Value: testToken(t, "cashier")})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
}

func TestPlatformLogoutRequiresExplicitPlatformSessionRole(t *testing.T) {
	r := New(nil, nil)
	for _, role := range []string{"", "cashier"} {
		t.Run("role "+role, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
			if role != "" {
				req.Header.Set("X-SBC-Session-Role", role)
			}
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusBadRequest)
			}
			if cookies := res.Result().Cookies(); len(cookies) != 0 {
				t.Fatalf("logout must not clear a cookie without a valid platform role: %#v", cookies)
			}
		})
	}
}

func TestPlatformSessionsRemainIndependentAcrossAdminAndFranchise(t *testing.T) {
	r := New(nil, nil)
	adminToken := testToken(t, "admin")
	franchiseToken := testToken(t, "franchise_owner")
	for _, test := range []struct {
		name, role, wantRole string
	}{
		{name: "admin session", role: "admin", wantRole: "admin"},
		{name: "franchise session", role: "franchise_owner", wantRole: "franchise_owner"},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/session", nil)
			req.Header.Set("X-SBC-Session-Role", test.role)
			req.AddCookie(&http.Cookie{Name: "sbc_admin_session", Value: adminToken})
			req.AddCookie(&http.Cookie{Name: "sbc_franchise_session", Value: franchiseToken})
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"role":"`+test.wantRole+`"`) {
				t.Fatalf("session = %d: %s", res.Code, res.Body.String())
			}
		})
	}
}

func TestAttendanceLogoutClearsSessionCookie(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/attendance/logout", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("logout = %d: %s", res.Code, res.Body.String())
	}
	cookies := res.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "sbc_attendance_session" || cookies[0].MaxAge >= 0 || !cookies[0].HttpOnly {
		t.Fatalf("attendance logout did not clear the HttpOnly cookie: %#v", cookies)
	}
}

func TestAttendanceRoutesRejectPlatformSessionCookie(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/attendance/today", nil)
	req.AddCookie(&http.Cookie{Name: "sbc_admin_session", Value: testToken(t, "admin")})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
}

func TestAttendanceSessionSelectsStaffCookieWhenPlatformCookieAlsoExists(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/attendance/session", nil)
	req.AddCookie(&http.Cookie{Name: "sbc_admin_session", Value: testToken(t, "admin")})
	req.AddCookie(&http.Cookie{Name: "sbc_attendance_session", Value: testToken(t, "cashier")})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	// A nil database makes the handler unavailable (503). Reaching it proves the
	// role-aware middleware selected the staff cookie instead of rejecting admin.
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusServiceUnavailable)
	}
}

func TestAttendanceCookieFlowPreventsDuplicateCheckInAndCheckOut(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-COOKIE")
	pinHash, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatal(err)
	}
	seedUser(t, db, 7, "attendance-cookie", "cashier", branchID, nil)
	if _, err := db.Exec(`UPDATE users SET attendance_pin_hash=$1 WHERE id=7`, string(pinHash)); err != nil {
		t.Fatal(err)
	}
	today := time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60)).Format("2006-01-02")
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES(7,$1,$2,'08:00','17:00','scheduled')`, branchID, today); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	challenge := requestJSON(r, http.MethodPost, "/api/v1/attendance/login", `{"username":"attendance-cookie"}`, "")
	if challenge.Code != http.StatusOK || !strings.Contains(challenge.Body.String(), `"requiresPIN":true`) || len(challenge.Result().Cookies()) != 0 {
		t.Fatalf("attendance PIN challenge = %d: %s", challenge.Code, challenge.Body.String())
	}
	wrongPIN := requestJSON(r, http.MethodPost, "/api/v1/attendance/login", `{"username":"attendance-cookie","pin":"000000"}`, "")
	if wrongPIN.Code != http.StatusUnauthorized || len(wrongPIN.Result().Cookies()) != 0 {
		t.Fatalf("wrong attendance PIN = %d: %s", wrongPIN.Code, wrongPIN.Body.String())
	}
	login := requestJSON(r, http.MethodPost, "/api/v1/attendance/login", `{"username":"attendance-cookie","pin":"123456"}`, "")
	if login.Code != http.StatusOK || strings.Contains(login.Body.String(), "accessToken") {
		t.Fatalf("attendance login = %d: %s", login.Code, login.Body.String())
	}
	cookies := login.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "sbc_attendance_session" || !cookies[0].HttpOnly {
		t.Fatalf("attendance login did not issue an HttpOnly session cookie: %#v", cookies)
	}

	if session := requestJSONWithCookie(r, http.MethodGet, "/api/v1/attendance/session", "", cookies[0]); session.Code != http.StatusOK {
		t.Fatalf("attendance session = %d: %s", session.Code, session.Body.String())
	}
	if checkIn := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-in", "", cookies[0]); checkIn.Code != http.StatusOK {
		t.Fatalf("check in = %d: %s", checkIn.Code, checkIn.Body.String())
	}
	if duplicateCheckIn := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-in", "", cookies[0]); duplicateCheckIn.Code != http.StatusBadRequest {
		t.Fatalf("duplicate check in = %d: %s", duplicateCheckIn.Code, duplicateCheckIn.Body.String())
	}
	if checkOut := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-out", "", cookies[0]); checkOut.Code != http.StatusOK {
		t.Fatalf("check out = %d: %s", checkOut.Code, checkOut.Body.String())
	}
	if duplicateCheckOut := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-out", "", cookies[0]); duplicateCheckOut.Code != http.StatusBadRequest {
		t.Fatalf("duplicate check out = %d: %s", duplicateCheckOut.Code, duplicateCheckOut.Body.String())
	}
}

func TestAttendanceCheckInRejectsMissingAndNonWorkingShifts(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-NON-WORKING")
	seedUser(t, db, 7, "attendance-non-working", "cashier", branchID, nil)
	r := New(db, nil)
	token := testTokenWithBranch(t, "cashier", branchID)
	today := time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60)).Format("2006-01-02")

	if res := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-in", "", token); res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "ไม่พบกะงาน") {
		t.Fatalf("missing shift check-in = %d: %s", res.Code, res.Body.String())
	}
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES(7,$1,$2,'08:00','17:00','day_off')`, branchID, today); err != nil {
		t.Fatal(err)
	}
	if res := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-in", "", token); res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "ไม่ใช่วันทำงาน") {
		t.Fatalf("day off check-in = %d: %s", res.Code, res.Body.String())
	}
}

func TestAttendanceSummaryMarksOnlyCheckInsAfterTenMinuteGracePeriodAsLate(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-LATE-BOUNDARY")
	seedUser(t, db, 7, "attendance-late-boundary", "cashier", branchID, nil)
	monthStart := time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60))
	monthStart = time.Date(monthStart.Year(), monthStart.Month(), 1, 0, 0, 0, 0, monthStart.Location())
	for index, checkInAt := range []string{
		"00:59:59Z", // 07:59:59 Bangkok: early
		"01:00:00Z", // 08:00:00 Bangkok: exactly on time
		"01:10:00Z", // 08:10:00 Bangkok: within the grace period
		"01:10:01Z", // 08:10:01 Bangkok: late
	} {
		workDate := monthStart.AddDate(0, 0, index).Format("2006-01-02")
		if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES(7,$1,$2,'08:00','17:00','scheduled')`, branchID, workDate); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES(7,$1,$2,$3)`, branchID, workDate, workDate+"T"+checkInAt); err != nil {
			t.Fatal(err)
		}
	}

	response := requestJSON(New(db, nil), http.MethodGet, "/api/v1/attendance/summary", "", testTokenWithBranch(t, "cashier", branchID))
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"lateCount":1`) {
		t.Fatalf("late summary boundary = %d: %s", response.Code, response.Body.String())
	}
}

func TestAttendancePINSetupValidatesAndCannotOverwriteExistingPIN(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-PIN")
	seedUser(t, db, 8, "attendance-pin", "cashier", branchID, nil)
	r := New(db, nil)

	invalid := requestJSON(r, http.MethodPost, "/api/v1/attendance/setup-pin", `{"username":"attendance-pin","pin":"12ab56"}`, "")
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid PIN setup = %d: %s", invalid.Code, invalid.Body.String())
	}

	setup := requestJSON(r, http.MethodPost, "/api/v1/attendance/setup-pin", `{"username":"attendance-pin","pin":"123456"}`, "")
	if setup.Code != http.StatusOK || strings.Contains(setup.Body.String(), "accessToken") {
		t.Fatalf("PIN setup = %d: %s", setup.Code, setup.Body.String())
	}
	cookies := setup.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "sbc_attendance_session" || !cookies[0].HttpOnly {
		t.Fatalf("PIN setup did not issue an HttpOnly session cookie: %#v", cookies)
	}

	repeated := requestJSON(r, http.MethodPost, "/api/v1/attendance/setup-pin", `{"username":"attendance-pin","pin":"654321"}`, "")
	if repeated.Code != http.StatusConflict {
		t.Fatalf("repeated PIN setup = %d: %s", repeated.Code, repeated.Body.String())
	}
}

func TestAttendancePINLoginRateLimitResetsAfterSuccessfulLogin(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-PIN-LIMIT")
	pinHash, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	seedUser(t, db, 9, "attendance-pin-limit", "cashier", branchID, nil)
	if _, err := db.Exec(`UPDATE users SET attendance_pin_hash=$1 WHERE id=9`, string(pinHash)); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	login := func(pin string) *httptest.ResponseRecorder {
		return requestJSON(r, http.MethodPost, "/api/v1/attendance/login", `{"username":"attendance-pin-limit","pin":"`+pin+`"}`, "")
	}
	for i := 0; i < 9; i++ {
		if res := login("000000"); res.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d = %d: %s", i+1, res.Code, res.Body.String())
		}
	}
	if res := login("123456"); res.Code != http.StatusOK {
		t.Fatalf("successful PIN login = %d: %s", res.Code, res.Body.String())
	}
	for i := 0; i < 10; i++ {
		if res := login("000000"); res.Code != http.StatusUnauthorized {
			t.Fatalf("after reset attempt %d = %d: %s", i+1, res.Code, res.Body.String())
		}
	}
	if res := login("000000"); res.Code != http.StatusTooManyRequests {
		t.Fatalf("rate limit = %d: %s", res.Code, res.Body.String())
	}
}

func TestUsersRequireAdminToken(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

func TestAdminRouteRejectsNonAdminRole(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/franchisees", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, "cashier"))
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
}

func TestStockRequestsRejectCashierRole(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/stock-requests", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, "cashier"))
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
}

func TestProtectedRoutesRejectUnexpectedSigningAlgorithm(t *testing.T) {
	r := New(nil, nil)
	claims := middleware.Claims{UserID: 7, Role: "admin", RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS384, claims).SignedString([]byte(config.JWTSecret()))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

func TestCORSOnlyAllowsConfiguredOrigin(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("CORS_ORIGINS", "https://admin.example.com")
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodOptions, "/health", nil)
	req.Header.Set("Origin", "https://admin.example.com")
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "https://admin.example.com" {
		t.Fatalf("allowed origin = %q", got)
	}
	if res.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusNoContent)
	}
	if got := res.Header().Get("Vary"); got != "Origin" {
		t.Fatalf("Vary = %q, want Origin", got)
	}
	if got := res.Header().Get("Access-Control-Max-Age"); got != "600" {
		t.Fatalf("Access-Control-Max-Age = %q, want 600", got)
	}
	if got := res.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("credentials = %q, want true", got)
	}
	if got := res.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(got, "X-SBC-Session-Role") {
		t.Fatalf("allow headers = %q, want X-SBC-Session-Role", got)
	}
}

func TestCORSRejectsUnknownProductionOrigin(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("CORS_ORIGINS", "https://admin.example.com")
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodOptions, "/health", nil)
	req.Header.Set("Origin", "https://attacker.example.com")
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("unexpected allowed origin: %q", got)
	}
}

func TestSecurityHeaders(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if got := res.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q", got)
	}
	if got := res.Header().Get("X-Frame-Options"); got != "DENY" {
		t.Fatalf("X-Frame-Options = %q", got)
	}
	if got := res.Header().Get("Content-Security-Policy"); got == "" {
		t.Fatal("expected Content-Security-Policy header")
	}
	if got := res.Header().Get("Strict-Transport-Security"); got == "" {
		t.Fatal("expected Strict-Transport-Security header in production")
	}
}

func TestMetricsAreAdminOnly(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/metrics", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, "admin"))
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if !strings.Contains(res.Body.String(), "superblack_http_requests_total") {
		t.Fatalf("metrics response did not contain request counter: %s", res.Body.String())
	}
}

func TestInventoryRouteReadsFromIsolatedPostgres(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES('สาขาทดสอบ','ROUTER-001') RETURNING id`).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO inventory_items(branch_id,name,category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,'นมทดสอบ','dairy','ingredient',3,'ลิตร',1,45)`, branchID); err != nil {
		t.Fatalf("สร้างวัตถุดิบทดสอบ: %v", err)
	}
	r := New(db, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/inventory?branchId=1", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, "admin"))
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), "นมทดสอบ") {
		t.Fatalf("inventory response missing item: %s", res.Body.String())
	}
	if _, err := db.Exec(`INSERT INTO inventory_items(branch_id,name,category,stock_category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,'แก้วเครื่องดื่ม','cup','drink_equipment','stock',3,'ใบ',1,2),($1,'กล่องพัสดุ','box','postal_equipment','stock',4,'ใบ',1,5)`, branchID); err != nil {
		t.Fatalf("สร้างสต๊อกแยกประเภท: %v", err)
	}
	postal := requestJSON(r, http.MethodGet, "/api/v1/inventory?kind=stock&stockCategory=postal_equipment", "", testToken(t, "admin"))
	if postal.Code != http.StatusOK || !strings.Contains(postal.Body.String(), "กล่องพัสดุ") || strings.Contains(postal.Body.String(), "แก้วเครื่องดื่ม") {
		t.Fatalf("postal stock filter = %d: %s", postal.Code, postal.Body.String())
	}
}

func TestFranchisePlanFiltersMenuAndIngredients(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var franchiseID, branchID, coffeeInventoryID, foodInventoryID int64
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('ทดสอบ S','plan-s@example.com','S','active') RETURNING id`).Scan(&franchiseID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,size,status) VALUES($1,'สาขาทดสอบ S','PLAN-S','S','active') RETURNING id`, franchiseID).Scan(&branchID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO inventory_items(branch_id,name,category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,'เมล็ดกาแฟ','coffee','ingredient',10,'กรัม',1,1) RETURNING id`, branchID).Scan(&coffeeInventoryID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO inventory_items(branch_id,name,category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,'หมู','food','ingredient',10,'กรัม',1,1) RETURNING id`, branchID).Scan(&foodInventoryID); err != nil {
		t.Fatal(err)
	}
	for _, item := range []struct {
		name, category string
		ingredientID   int64
	}{{"อเมริกาโน่", "เมนูกาแฟเย็น", coffeeInventoryID}, {"ข้าวกะเพรา", "อาหาร", foodInventoryID}} {
		var menuID int64
		if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status) VALUES($1,$2,$3,60,70,18,'available') RETURNING id`, branchID, item.name, item.category).Scan(&menuID); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount) VALUES($1,$2,1,'กรัม',1)`, menuID, item.ingredientID); err != nil {
			t.Fatal(err)
		}
	}
	r := New(db, nil)
	token := testTokenWithFranchise(t, "franchise_owner", branchID, franchiseID)
	menu := requestJSON(r, http.MethodGet, "/api/v1/menu-items", "", token)
	if menu.Code != http.StatusOK || !strings.Contains(menu.Body.String(), "อเมริกาโน่") || strings.Contains(menu.Body.String(), "ข้าวกะเพรา") {
		t.Fatalf("S menu access = %d: %s", menu.Code, menu.Body.String())
	}
	ingredients := requestJSON(r, http.MethodGet, "/api/v1/inventory?kind=ingredient", "", token)
	if ingredients.Code != http.StatusOK || !strings.Contains(ingredients.Body.String(), "เมล็ดกาแฟ") || strings.Contains(ingredients.Body.String(), `"หมู"`) {
		t.Fatalf("S ingredient access = %d: %s", ingredients.Code, ingredients.Body.String())
	}
	stock := requestJSON(r, http.MethodGet, "/api/v1/inventory?kind=stock", "", token)
	if stock.Code != http.StatusOK {
		t.Fatalf("S stock access = %d: %s", stock.Code, stock.Body.String())
	}
	adminToken := testToken(t, "admin")
	adminMenu := requestJSON(r, http.MethodGet, "/api/v1/menu-items?branchCode=PLAN-S", "", adminToken)
	if adminMenu.Code != http.StatusOK || !strings.Contains(adminMenu.Body.String(), "อเมริกาโน่") || strings.Contains(adminMenu.Body.String(), "ข้าวกะเพรา") {
		t.Fatalf("admin S menu access = %d: %s", adminMenu.Code, adminMenu.Body.String())
	}
	adminIngredients := requestJSON(r, http.MethodGet, "/api/v1/inventory?kind=ingredient&branchCode=PLAN-S", "", adminToken)
	if adminIngredients.Code != http.StatusOK || !strings.Contains(adminIngredients.Body.String(), "เมล็ดกาแฟ") || strings.Contains(adminIngredients.Body.String(), `"หมู"`) {
		t.Fatalf("admin S ingredient access = %d: %s", adminIngredients.Code, adminIngredients.Body.String())
	}
	resized := requestJSON(r, http.MethodPatch, "/api/v1/branches/"+strconv.FormatInt(branchID, 10)+"/size", `{"size":"M"}`, adminToken)
	if resized.Code != http.StatusOK {
		t.Fatalf("resize branch to M = %d: %s", resized.Code, resized.Body.String())
	}
	adminMenu = requestJSON(r, http.MethodGet, "/api/v1/menu-items?branchCode=PLAN-S", "", adminToken)
	if adminMenu.Code != http.StatusOK || !strings.Contains(adminMenu.Body.String(), "อเมริกาโน่") || !strings.Contains(adminMenu.Body.String(), "ข้าวกะเพรา") {
		t.Fatalf("admin M menu access = %d: %s", adminMenu.Code, adminMenu.Body.String())
	}
	adminIngredients = requestJSON(r, http.MethodGet, "/api/v1/inventory?kind=ingredient&branchCode=PLAN-S", "", adminToken)
	if adminIngredients.Code != http.StatusOK || !strings.Contains(adminIngredients.Body.String(), "เมล็ดกาแฟ") || !strings.Contains(adminIngredients.Body.String(), `"หมู"`) {
		t.Fatalf("admin M ingredient access = %d: %s", adminIngredients.Code, adminIngredients.Body.String())
	}
}

func TestFranchiseSessionCannotReadOrWriteAnotherFranchiseBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var franchiseA, franchiseB, branchA, branchB int64
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Franchise A','a@example.com','L','active') RETURNING id`).Scan(&franchiseA); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Franchise B','b@example.com','L','active') RETURNING id`).Scan(&franchiseB); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,status) VALUES($1,'Branch A','FR-A','active') RETURNING id`, franchiseA).Scan(&branchA); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,status) VALUES($1,'Branch B','FR-B','active') RETURNING id`, franchiseB).Scan(&branchB); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,franchisee_id,branch_id) VALUES(7,'Owner A','owner-a','owner-a@example.com','hash','franchise_owner',$1,$2)`, franchiseA, branchA); err != nil {
		t.Fatal(err)
	}
	seedInventory(t, db, branchA, "ของ Franchise A", 1)
	seedInventory(t, db, branchB, "ของ Franchise B", 1)
	r := New(db, nil)
	token := testTokenWithFranchise(t, "franchise_owner", branchA, franchiseA)

	branches := requestJSON(r, http.MethodGet, "/api/v1/branches", "", token)
	if branches.Code != http.StatusOK || !strings.Contains(branches.Body.String(), "Branch A") || strings.Contains(branches.Body.String(), "Branch B") {
		t.Fatalf("franchise branch isolation = %d: %s", branches.Code, branches.Body.String())
	}
	inventory := requestJSON(r, http.MethodGet, "/api/v1/inventory?branchId="+strconv.FormatInt(branchB, 10), "", token)
	if inventory.Code != http.StatusOK || !strings.Contains(inventory.Body.String(), "ของ Franchise A") || strings.Contains(inventory.Body.String(), "ของ Franchise B") {
		t.Fatalf("franchise inventory isolation = %d: %s", inventory.Code, inventory.Body.String())
	}
	created := requestJSON(r, http.MethodPost, "/api/v1/stock-requests", `{"branchId":`+strconv.FormatInt(branchB, 10)+`,"note":"ต้องอยู่ในสาขา A","items":[{"name":"นม","quantity":1,"unit":"กล่อง"}]}`, token)
	if created.Code != http.StatusCreated {
		t.Fatalf("franchise cross-branch request = %d: %s", created.Code, created.Body.String())
	}
	requestID := responseID(t, created)
	var savedBranchID int64
	if err := db.QueryRow(`SELECT branch_id FROM stock_requests WHERE id=$1`, requestID).Scan(&savedBranchID); err != nil || savedBranchID != branchA {
		t.Fatalf("stock request branch = %d, want %d, err=%v", savedBranchID, branchA, err)
	}
}

func TestFranchiseAttendanceManagementIsIsolatedAndCannotApproveAnotherFranchisesLeave(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var franchiseA, franchiseB, branchA, branchB, companyBranch int64
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Attendance Franchise A','attendance-a@example.com','L','active') RETURNING id`).Scan(&franchiseA); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Attendance Franchise B','attendance-b@example.com','L','active') RETURNING id`).Scan(&franchiseB); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,status) VALUES($1,'Attendance Branch A','ATT-A','active') RETURNING id`, franchiseA).Scan(&branchA); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,status) VALUES($1,'Attendance Branch B','ATT-B','active') RETURNING id`, franchiseB).Scan(&branchB); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(name,code,status) VALUES('Company Attendance Branch','ATT-COMPANY','active') RETURNING id`).Scan(&companyBranch); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,franchisee_id,branch_id) VALUES(7,'Attendance Owner A','attendance-owner-a','attendance-owner-a@example.com','hash','franchise_owner',$1,$2)`, franchiseA, branchA); err != nil {
		t.Fatal(err)
	}
	for _, staff := range []struct {
		id          int64
		name        string
		username    string
		franchiseID int64
		branchID    int64
	}{
		{id: 8, name: "Staff A", username: "attendance-staff-a", franchiseID: franchiseA, branchID: branchA},
		{id: 9, name: "Staff B", username: "attendance-staff-b", franchiseID: franchiseB, branchID: branchB},
	} {
		if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,franchisee_id,branch_id) VALUES($1,$2,$3,$4,'hash','cashier',$5,$6)`, staff.id, staff.name, staff.username, staff.username+"@example.com", staff.franchiseID, staff.branchID); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,branch_id) VALUES(10,'Company Staff','attendance-company-staff','attendance-company-staff@example.com','hash','cashier',$1)`, companyBranch); err != nil {
		t.Fatal(err)
	}
	const workDate = "2026-09-15"
	if _, err := db.Exec(`INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES(8,$1,$2,'2026-09-15T01:00:00Z'),(9,$3,$2,'2026-09-15T01:00:00Z'),(10,$4,$2,'2026-09-15T01:00:00Z')`, branchA, workDate, branchB, companyBranch); err != nil {
		t.Fatal(err)
	}
	var leaveA, leaveB int64
	if err := db.QueryRow(`INSERT INTO staff_leave_requests(user_id,branch_id,leave_date,leave_type,reason) VALUES(8,$1,$2,'personal','A leave') RETURNING id`, branchA, workDate).Scan(&leaveA); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO staff_leave_requests(user_id,branch_id,leave_date,leave_type,reason) VALUES(9,$1,$2,'personal','B leave') RETURNING id`, branchB, workDate).Scan(&leaveB); err != nil {
		t.Fatal(err)
	}

	r := New(db, nil)
	token := testTokenWithFranchise(t, "franchise_owner", branchA, franchiseA)
	attendance := requestJSON(r, http.MethodGet, "/api/v1/attendance/management?month=2026-09", "", token)
	if attendance.Code != http.StatusOK || !strings.Contains(attendance.Body.String(), "Staff A") || strings.Contains(attendance.Body.String(), "Staff B") {
		t.Fatalf("franchise attendance isolation = %d: %s", attendance.Code, attendance.Body.String())
	}
	companyAttendance := requestJSON(r, http.MethodGet, "/api/v1/attendance/management?month=2026-09", "", testToken(t, "admin"))
	if companyAttendance.Code != http.StatusOK || !strings.Contains(companyAttendance.Body.String(), "Company Staff") || strings.Contains(companyAttendance.Body.String(), "Staff A") || strings.Contains(companyAttendance.Body.String(), "Staff B") {
		t.Fatalf("admin attendance scope = %d: %s", companyAttendance.Code, companyAttendance.Body.String())
	}
	leaves := requestJSON(r, http.MethodGet, "/api/v1/attendance/leave-requests", "", token)
	if leaves.Code != http.StatusOK || !strings.Contains(leaves.Body.String(), "A leave") || strings.Contains(leaves.Body.String(), "B leave") {
		t.Fatalf("franchise leave isolation = %d: %s", leaves.Code, leaves.Body.String())
	}
	invalidTransition := requestJSON(r, http.MethodPatch, "/api/v1/attendance/leave-requests/"+strconv.FormatInt(leaveA, 10), `{"status":"pending"}`, token)
	if invalidTransition.Code != http.StatusBadRequest {
		t.Fatalf("invalid leave transition = %d: %s", invalidTransition.Code, invalidTransition.Body.String())
	}

	crossFranchiseApproval := requestJSON(r, http.MethodPatch, "/api/v1/attendance/leave-requests/"+strconv.FormatInt(leaveB, 10), `{"status":"approved"}`, token)
	if crossFranchiseApproval.Code != http.StatusNotFound {
		t.Fatalf("cross-franchise leave approval = %d: %s", crossFranchiseApproval.Code, crossFranchiseApproval.Body.String())
	}
	var status string
	if err := db.QueryRow(`SELECT status FROM staff_leave_requests WHERE id=$1`, leaveB).Scan(&status); err != nil || status != "pending" {
		t.Fatalf("cross-franchise leave status = %q, want pending, err=%v", status, err)
	}

	approval := requestJSON(r, http.MethodPatch, "/api/v1/attendance/leave-requests/"+strconv.FormatInt(leaveA, 10), `{"status":"approved","decisionNote":"approved by owner"}`, token)
	if approval.Code != http.StatusOK || !strings.Contains(approval.Body.String(), `"status":"approved"`) {
		t.Fatalf("franchise leave approval = %d: %s", approval.Code, approval.Body.String())
	}
	var shiftStatus string
	if err := db.QueryRow(`SELECT status FROM staff_shifts WHERE user_id=8 AND shift_date=$1`, workDate).Scan(&shiftStatus); err != nil || shiftStatus != "personal_leave" {
		t.Fatalf("approved leave shift status = %q, want personal_leave, err=%v", shiftStatus, err)
	}
}

func TestPurchaseOrderReceiptAddsStockAndCreatesMovement(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "PURCHASE-001")
	seedUser(t, db, 7, "admin-purchase", "admin", branchID, nil)
	inventoryID := seedInventory(t, db, branchID, "นมสด", 2)
	var supplierID int64
	if err := db.QueryRow(`INSERT INTO suppliers(name) VALUES('ผู้ขายทดสอบ') RETURNING id`).Scan(&supplierID); err != nil {
		t.Fatalf("สร้างผู้ขาย: %v", err)
	}
	r := New(db, nil)
	token := testToken(t, "admin")
	order := requestJSON(r, http.MethodPost, "/api/v1/purchase-orders", `{"branchId":`+strconv.FormatInt(branchID, 10)+`,"supplierId":`+strconv.FormatInt(supplierID, 10)+`,"items":[{"inventoryItemId":`+strconv.FormatInt(inventoryID, 10)+`,"quantity":5,"unitCost":42}]}`, token)
	if order.Code != http.StatusCreated {
		t.Fatalf("create purchase order = %d: %s", order.Code, order.Body.String())
	}
	orderID := responseID(t, order)
	for _, status := range []string{"submitted", "approved", "ordered"} {
		res := requestJSON(r, http.MethodPatch, "/api/v1/purchase-orders/"+strconv.FormatInt(orderID, 10)+"/status", `{"status":"`+status+`"}`, token)
		if res.Code != http.StatusOK {
			t.Fatalf("set purchase status %s = %d: %s", status, res.Code, res.Body.String())
		}
	}
	var itemID int64
	if err := db.QueryRow(`SELECT id FROM purchase_order_items WHERE purchase_order_id=$1`, orderID).Scan(&itemID); err != nil {
		t.Fatalf("อ่านรายการใบสั่งซื้อ: %v", err)
	}
	receive := requestJSON(r, http.MethodPost, "/api/v1/purchase-orders/"+strconv.FormatInt(orderID, 10)+"/receive", `{"note":"รับสินค้าครบ","items":[{"itemId":`+strconv.FormatInt(itemID, 10)+`,"quantity":5}]}`, token)
	if receive.Code != http.StatusOK || !strings.Contains(receive.Body.String(), `"received"`) {
		t.Fatalf("receive purchase order = %d: %s", receive.Code, receive.Body.String())
	}
	assertInventoryQuantity(t, db, inventoryID, 7)
	var movements int
	if err := db.QueryRow(`SELECT COUNT(*) FROM stock_movements WHERE inventory_item_id=$1 AND movement_type='purchase_receipt'`, inventoryID).Scan(&movements); err != nil || movements != 1 {
		t.Fatalf("purchase stock movements = %d, err = %v", movements, err)
	}
}

func TestStockRequestLifecycleAddsInventoryAndWritesAudit(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "STOCK-LIFECYCLE")
	seedUser(t, db, 7, "admin-stock", "admin", branchID, nil)
	inventoryID := seedInventory(t, db, branchID, "เมล็ดกาแฟ", 2)
	r := New(db, nil)
	create := requestJSON(r, http.MethodPost, "/api/v1/stock-requests", `{"branchId":1,"note":"เติมสต็อก","items":[{"inventoryItemId":1,"name":"เมล็ดกาแฟ","quantity":5,"unit":"กรัม"}]}`, testToken(t, "admin"))
	if create.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", create.Code, create.Body.String())
	}
	requestID := responseID(t, create)
	if res := requestJSON(r, http.MethodPatch, "/api/v1/stock-requests/"+strconv.FormatInt(requestID, 10)+"/status", `{"status":"completed"}`, testToken(t, "admin")); res.Code != http.StatusConflict {
		t.Fatalf("completed from pending = %d, body = %s", res.Code, res.Body.String())
	}
	for _, status := range []string{"approved", "preparing", "completed"} {
		res := requestJSON(r, http.MethodPatch, "/api/v1/stock-requests/"+strconv.FormatInt(requestID, 10)+"/status", `{"status":"`+status+`"}`, testToken(t, "admin"))
		if res.Code != http.StatusOK {
			t.Fatalf("%s status = %d, body = %s", status, res.Code, res.Body.String())
		}
	}
	assertInventoryQuantity(t, db, inventoryID, 7)
	var actions int
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE entity_type='stock_request' AND entity_id=$1`, requestID).Scan(&actions); err != nil || actions != 4 {
		t.Fatalf("audit actions = %d, err = %v", actions, err)
	}
}

func TestInventoryAndMenuCRUDWriteAuditEvents(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "CRUD-AUDIT")
	seedUser(t, db, 7, "admin-crud", "admin", branchID, nil)
	r := New(db, nil)
	token := testToken(t, "admin")
	createInventory := requestJSON(r, http.MethodPost, "/api/v1/inventory?branchId=1", `{"name":"นม CRUD","category":"dairy","kind":"ingredient","quantity":3,"unit":"ลิตร","reorderLevel":1,"unitCost":45,"expiryDate":"2026-12-31"}`, token)
	if createInventory.Code != http.StatusCreated {
		t.Fatalf("create inventory = %d: %s", createInventory.Code, createInventory.Body.String())
	}
	inventoryID := responseID(t, createInventory)
	var expiryDate string
	if err := db.QueryRow(`SELECT expiry_date::text FROM inventory_items WHERE id=$1`, inventoryID).Scan(&expiryDate); err != nil || expiryDate != "2026-12-31" {
		t.Fatalf("created expiry date = %q, err = %v", expiryDate, err)
	}
	for _, method := range []string{http.MethodPatch, http.MethodDelete} {
		body := ""
		if method == http.MethodPatch {
			body = `{"name":"นม CRUD ใหม่","category":"dairy","kind":"ingredient","quantity":4,"unit":"ลิตร","reorderLevel":1,"unitCost":50,"expiryDate":null}`
		}
		res := requestJSON(r, method, "/api/v1/inventory/"+strconv.FormatInt(inventoryID, 10)+"?branchId=1", body, token)
		if res.Code != map[string]int{http.MethodPatch: http.StatusOK, http.MethodDelete: http.StatusNoContent}[method] {
			t.Fatalf("%s inventory = %d: %s", method, res.Code, res.Body.String())
		}
	}
	recipeInventoryID := seedInventory(t, db, branchID, "กาแฟสูตร", 100)
	menuPayload := `{"name":"เมนู CRUD","category":"coffee","storePrice":60,"linemanPrice":70,"costPrice":15,"ingredients":[{"inventoryItemId":` + strconv.FormatInt(recipeInventoryID, 10) + `,"quantity":10,"unit":"กรัม"}]}`
	createMenu := requestJSON(r, http.MethodPost, "/api/v1/menu-items?branchId=1", menuPayload, token)
	if createMenu.Code != http.StatusCreated {
		t.Fatalf("create menu = %d: %s", createMenu.Code, createMenu.Body.String())
	}
	menuID := responseID(t, createMenu)
	updatedMenu := strings.Replace(menuPayload, "เมนู CRUD", "เมนู CRUD ใหม่", 1)
	if res := requestJSON(r, http.MethodPatch, "/api/v1/menu-items/"+strconv.FormatInt(menuID, 10)+"?branchId=1", updatedMenu, token); res.Code != http.StatusOK {
		t.Fatalf("update menu = %d: %s", res.Code, res.Body.String())
	}
	if res := requestJSON(r, http.MethodDelete, "/api/v1/menu-items/"+strconv.FormatInt(menuID, 10)+"?branchId=1", "", token); res.Code != http.StatusNoContent {
		t.Fatalf("delete menu = %d: %s", res.Code, res.Body.String())
	}
	var events int
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE action IN ('created','updated','deleted')`).Scan(&events); err != nil || events != 5 {
		t.Fatalf("audit events = %d, err = %v", events, err)
	}
}

func TestLoginRateLimitResetsAfterSuccessfulLogin(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "LOGIN-LIMIT")
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	seedUser(t, db, 7, "rate-limit-user", "admin", branchID, passwordHash)
	r := New(db, nil)
	login := func(password string) *httptest.ResponseRecorder {
		return requestJSON(r, http.MethodPost, "/api/v1/auth/login", `{"username":"rate-limit-user","password":"`+password+`"}`, "")
	}
	for i := 0; i < 9; i++ {
		if res := login("wrong"); res.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d = %d", i+1, res.Code)
		}
	}
	if res := login("correct-password"); res.Code != http.StatusOK {
		t.Fatalf("success status = %d: %s", res.Code, res.Body.String())
	}
	for i := 0; i < 10; i++ {
		if res := login("wrong"); res.Code != http.StatusUnauthorized {
			t.Fatalf("after reset attempt %d = %d", i+1, res.Code)
		}
	}
	if res := login("wrong"); res.Code != http.StatusTooManyRequests {
		t.Fatalf("limit status = %d", res.Code)
	}
}

func TestPlatformLoginSetsSecureHttpOnlyCookieInProduction(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	t.Setenv("APP_ENV", "production")
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "PROD-COOKIE")
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	seedUser(t, db, 7, "production-admin", "admin", branchID, passwordHash)
	r := New(db, nil)
	login := requestJSON(r, http.MethodPost, "/api/v1/auth/login", `{"username":"production-admin","password":"correct-password"}`, "")
	if login.Code != http.StatusOK || strings.Contains(login.Body.String(), "accessToken") {
		t.Fatalf("production login = %d: %s", login.Code, login.Body.String())
	}
	var sessionCookie *http.Cookie
	for _, cookie := range login.Result().Cookies() {
		if cookie.Name == "sbc_admin_session" {
			sessionCookie = cookie
			break
		}
	}
	if sessionCookie == nil || !sessionCookie.Secure || !sessionCookie.HttpOnly || sessionCookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("invalid production session cookie: %#v", sessionCookie)
	}
}

func TestPlatformLoginPreservesOtherPlatformSessionCookie(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "INDEPENDENT-SESSION")
	passwordHash, err := bcrypt.GenerateFromPassword([]byte("correct-password"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	seedUser(t, db, 7, "independent-admin", "admin", branchID, passwordHash)
	r := New(db, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(`{"username":"independent-admin","password":"correct-password"}`))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "sbc_franchise_session", Value: testToken(t, "franchise_owner")})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("login = %d: %s", res.Code, res.Body.String())
	}
	cookies := res.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "sbc_admin_session" || cookies[0].MaxAge <= 0 {
		t.Fatalf("login should set only the admin cookie: %#v", cookies)
	}
}

func TestWebsiteLeadLifecycleAndBranchScope(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchOne := seedBranch(t, db, "SCOPE-ONE")
	branchTwo := seedBranch(t, db, "SCOPE-TWO")
	seedUser(t, db, 7, "admin-lead", "admin", branchOne, nil)
	r := New(db, nil)
	lead := requestJSON(r, http.MethodPost, "/api/v1/website/leads", `{"name":"ผู้สนใจแฟรนไชส์","phone":"0812345678","topic":"franchise"}`, "")
	if lead.Code != http.StatusCreated {
		t.Fatalf("lead create = %d: %s", lead.Code, lead.Body.String())
	}
	leadID := responseID(t, lead)
	for _, status := range []string{"contacted", "closed"} {
		res := requestJSON(r, http.MethodPatch, "/api/v1/website/leads/"+strconv.FormatInt(leadID, 10)+"/status", `{"status":"`+status+`"}`, testToken(t, "admin"))
		if res.Code != http.StatusOK {
			t.Fatalf("lead %s = %d", status, res.Code)
		}
	}
	managerToken := testTokenWithBranch(t, "branch_manager", branchOne)
	res := requestJSON(r, http.MethodGet, "/api/v1/branches", "", managerToken)
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "SCOPE-ONE") || strings.Contains(res.Body.String(), "SCOPE-TWO") {
		t.Fatalf("branch scope response: %d %s", res.Code, res.Body.String())
	}
	otherInventoryID := seedInventory(t, db, branchTwo, "ของสาขาอื่น", 1)
	if res := requestJSON(r, http.MethodPatch, "/api/v1/inventory/"+strconv.FormatInt(otherInventoryID, 10), `{"name":"ต้องห้าม","unit":"ชิ้น"}`, managerToken); res.Code != http.StatusNotFound {
		t.Fatalf("branch mutation = %d: %s", res.Code, res.Body.String())
	}
}

func TestWebsiteLeadRateLimitAndFranchiseCreation(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "FRANCHISE-ADMIN")
	seedUser(t, db, 7, "admin-franchise", "admin", branchID, nil)
	r := New(db, nil)
	for i := 0; i < 5; i++ {
		res := requestJSONFromIP(r, http.MethodPost, "/api/v1/website/leads", `{"name":"ผู้สนใจทดสอบ","phone":"0812345678"}`, "", "198.51.100.50")
		if res.Code != http.StatusCreated {
			t.Fatalf("lead attempt %d = %d: %s", i+1, res.Code, res.Body.String())
		}
	}
	if res := requestJSONFromIP(r, http.MethodPost, "/api/v1/website/leads", `{"name":"ผู้สนใจทดสอบ","phone":"0812345678"}`, "", "198.51.100.50"); res.Code != http.StatusTooManyRequests {
		t.Fatalf("lead limit = %d: %s", res.Code, res.Body.String())
	}
	franchise := requestJSON(r, http.MethodPost, "/api/v1/franchisees", `{"name":"แฟรนไชส์ทดสอบ","email":"franchise@example.com","plan":"M","branchName":"สาขาแฟรนไชส์","branchCode":"FR-TEST","branchSize":"S","username":"franchise_test","password":"Password123!"}`, testToken(t, "admin"))
	if franchise.Code != http.StatusCreated {
		t.Fatalf("create franchise = %d: %s", franchise.Code, franchise.Body.String())
	}
	var branchStatus, branchSize string
	var franchiseBranchID int64
	if err := db.QueryRow(`SELECT id,status,size FROM branches WHERE code='FR-TEST'`).Scan(&franchiseBranchID, &branchStatus, &branchSize); err != nil || branchStatus != "inactive" || branchSize != "S" {
		t.Fatalf("franchise branch status/size = %q/%q, err = %v", branchStatus, branchSize, err)
	}
	if login := requestJSON(r, http.MethodPost, "/api/v1/auth/login", `{"username":"franchise_test","password":"Password123!"}`, ""); login.Code != http.StatusForbidden {
		t.Fatalf("inactive franchise login = %d: %s", login.Code, login.Body.String())
	}
	franchiseID := responseID(t, franchise)
	if activation := requestJSON(r, http.MethodPatch, "/api/v1/franchisees/"+strconv.FormatInt(franchiseID, 10)+"/status", `{"status":"active"}`, testToken(t, "admin")); activation.Code != http.StatusOK {
		t.Fatalf("activate franchise = %d: %s", activation.Code, activation.Body.String())
	}
	if err := db.QueryRow(`SELECT status FROM branches WHERE code='FR-TEST'`).Scan(&branchStatus); err != nil || branchStatus != "active" {
		t.Fatalf("activated franchise branch status = %q, err = %v", branchStatus, err)
	}
	if resized := requestJSON(r, http.MethodPatch, "/api/v1/branches/"+strconv.FormatInt(franchiseBranchID, 10)+"/size", `{"size":"M"}`, testToken(t, "admin")); resized.Code != http.StatusOK {
		t.Fatalf("resize franchise branch = %d: %s", resized.Code, resized.Body.String())
	}
	if err := db.QueryRow(`SELECT size FROM branches WHERE id=$1`, franchiseBranchID).Scan(&branchSize); err != nil || branchSize != "M" {
		t.Fatalf("resized franchise branch = %q, err = %v", branchSize, err)
	}
	if login := requestJSON(r, http.MethodPost, "/api/v1/auth/login", `{"username":"franchise_test","password":"Password123!"}`, ""); login.Code != http.StatusOK {
		t.Fatalf("active franchise login = %d: %s", login.Code, login.Body.String())
	}
	companyBranches := requestJSON(r, http.MethodGet, "/api/v1/branches/sales?period=today", "", testToken(t, "admin"))
	if companyBranches.Code != http.StatusOK || !strings.Contains(companyBranches.Body.String(), "FRANCHISE-ADMIN") || strings.Contains(companyBranches.Body.String(), "FR-TEST") {
		t.Fatalf("company branch list must exclude franchise branches: %d %s", companyBranches.Code, companyBranches.Body.String())
	}
	if res := requestJSON(r, http.MethodPost, "/api/v1/franchisees", `{"name":"แฟรนไชส์ซ้ำ","email":"franchise@example.com","plan":"M","branchName":"สาขาซ้ำ","branchCode":"FR-DUPLICATE"}`, testToken(t, "admin")); res.Code != http.StatusConflict {
		t.Fatalf("duplicate franchise = %d: %s", res.Code, res.Body.String())
	}
}

func TestAuditAndStockRequestPagination(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "PAGINATION")
	seedUser(t, db, 7, "admin-pagination", "admin", branchID, nil)
	if _, err := db.Exec(`INSERT INTO audit_events(branch_id,actor_id,entity_type,entity_id,action) VALUES($1,7,'test',1,'created')`, branchID); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testToken(t, "admin")
	if res := requestJSON(r, http.MethodGet, "/api/v1/audit-events?limit=999&offset=-1", "", token); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"limit":100`) || !strings.Contains(res.Body.String(), `"offset":0`) {
		t.Fatalf("audit pagination: %d %s", res.Code, res.Body.String())
	}
	if res := requestJSON(r, http.MethodGet, "/api/v1/stock-requests?limit=999&offset=-1", "", token); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"limit":100`) {
		t.Fatalf("stock pagination: %d %s", res.Code, res.Body.String())
	}
}

func openRouterTestDB(t *testing.T, url string) *sql.DB {
	t.Helper()
	db, err := database.Open(context.Background(), url)
	if err != nil {
		t.Fatalf("เปิดฐานข้อมูลทดสอบ: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`TRUNCATE TABLE website_leads, audit_events, stock_movements, purchase_order_items, purchase_orders, suppliers, stock_request_items, stock_requests, users, menu_item_ingredients, menu_items, inventory_items, branches, franchisees RESTART IDENTITY CASCADE`); err != nil {
		t.Fatalf("ล้างฐานข้อมูลทดสอบ: %v", err)
	}
	return db
}

func requestJSON(r http.Handler, method, path, body, token string) *httptest.ResponseRecorder {
	return requestJSONFromIP(r, method, path, body, token, "192.0.2.1")
}

func requestJSONFromIP(r http.Handler, method, path, body, token, ip string) *httptest.ResponseRecorder {
	var reader *strings.Reader
	reader = strings.NewReader(body)
	req := httptest.NewRequest(method, path, reader)
	req.RemoteAddr = ip + ":12345"
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	return res
}

func requestJSONWithCookie(r http.Handler, method, path, body string, cookie *http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	req.AddCookie(cookie)
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	return res
}

func responseID(t *testing.T, res *httptest.ResponseRecorder) int64 {
	t.Helper()
	var payload struct {
		Data struct {
			ID int64 `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil || payload.Data.ID < 1 {
		t.Fatalf("อ่าน id จาก response ไม่สำเร็จ: err=%v body=%s", err, res.Body.String())
	}
	return payload.Data.ID
}

func seedBranch(t *testing.T, db *sql.DB, code string) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, "สาขา "+code, code).Scan(&id); err != nil {
		t.Fatalf("สร้างสาขา: %v", err)
	}
	return id
}

func seedUser(t *testing.T, db *sql.DB, id int64, username, role string, branchID int64, passwordHash []byte) {
	t.Helper()
	if passwordHash == nil {
		passwordHash = []byte("hash")
	}
	if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,$6,$7)`, id, username, username, username+"@example.com", string(passwordHash), role, branchID); err != nil {
		t.Fatalf("สร้างผู้ใช้: %v", err)
	}
}

func seedInventory(t *testing.T, db *sql.DB, branchID int64, name string, quantity float64) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`INSERT INTO inventory_items(branch_id,name,category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,$2,'test','ingredient',$3,'กรัม',1,1) RETURNING id`, branchID, name, quantity).Scan(&id); err != nil {
		t.Fatalf("สร้างวัตถุดิบ: %v", err)
	}
	return id
}

func seedMenu(t *testing.T, db *sql.DB, branchID int64, name string, inventoryID int64, quantity float64) {
	t.Helper()
	var menuID int64
	if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status) VALUES($1,$2,'coffee',60,70,18,'available') RETURNING id`, branchID, name).Scan(&menuID); err != nil {
		t.Fatalf("สร้างเมนู: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount) VALUES($1,$2,$3,'กรัม',1)`, menuID, inventoryID, quantity); err != nil {
		t.Fatalf("สร้างสูตร: %v", err)
	}
}

func assertInventoryQuantity(t *testing.T, db *sql.DB, inventoryID int64, want float64) {
	t.Helper()
	var got float64
	if err := db.QueryRow(`SELECT quantity FROM inventory_items WHERE id=$1`, inventoryID).Scan(&got); err != nil || got != want {
		t.Fatalf("inventory quantity = %v, want %v, err=%v", got, want, err)
	}
}

func testToken(t *testing.T, role string) string {
	return testTokenWithBranch(t, role, 0)
}

func testTokenWithBranch(t *testing.T, role string, branchID int64) string {
	return testTokenWithFranchise(t, role, branchID, 0)
}

func testTokenWithFranchise(t *testing.T, role string, branchID, franchiseID int64) string {
	t.Helper()
	claims := middleware.Claims{UserID: 7, Role: role, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}
	if branchID > 0 {
		claims.BranchID = &branchID
	}
	if franchiseID > 0 {
		claims.FranchiseeID = &franchiseID
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(config.JWTSecret()))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return token
}

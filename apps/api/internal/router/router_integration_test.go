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
	logoutRes := httptest.NewRecorder()
	r.ServeHTTP(logoutRes, logoutReq)
	if logoutRes.Code != http.StatusOK {
		t.Fatalf("logout = %d: %s", logoutRes.Code, logoutRes.Body.String())
	}
	cookies := logoutRes.Result().Cookies()
	if len(cookies) != 2 || cookies[0].Name != "sbc_admin_session" || cookies[0].MaxAge >= 0 || !cookies[0].HttpOnly {
		t.Fatalf("logout did not clear the HttpOnly platform cookie: %#v", cookies)
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
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,status) VALUES($1,'สาขาทดสอบ S','PLAN-S','active') RETURNING id`, franchiseID).Scan(&branchID); err != nil {
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
	if stock.Code != http.StatusForbidden {
		t.Fatalf("S stock access = %d: %s", stock.Code, stock.Body.String())
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
	createInventory := requestJSON(r, http.MethodPost, "/api/v1/inventory?branchId=1", `{"name":"นม CRUD","category":"dairy","kind":"ingredient","quantity":3,"unit":"ลิตร","reorderLevel":1,"unitCost":45}`, token)
	if createInventory.Code != http.StatusCreated {
		t.Fatalf("create inventory = %d: %s", createInventory.Code, createInventory.Body.String())
	}
	inventoryID := responseID(t, createInventory)
	for _, method := range []string{http.MethodPatch, http.MethodDelete} {
		body := ""
		if method == http.MethodPatch {
			body = `{"name":"นม CRUD ใหม่","category":"dairy","kind":"ingredient","quantity":4,"unit":"ลิตร","reorderLevel":1,"unitCost":50}`
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
	franchise := requestJSON(r, http.MethodPost, "/api/v1/franchisees", `{"name":"แฟรนไชส์ทดสอบ","email":"franchise@example.com","plan":"M","branchName":"สาขาแฟรนไชส์","branchCode":"FR-TEST","username":"franchise_test","password":"Password123!"}`, testToken(t, "admin"))
	if franchise.Code != http.StatusCreated {
		t.Fatalf("create franchise = %d: %s", franchise.Code, franchise.Body.String())
	}
	var branchStatus string
	if err := db.QueryRow(`SELECT status FROM branches WHERE code='FR-TEST'`).Scan(&branchStatus); err != nil || branchStatus != "inactive" {
		t.Fatalf("franchise branch status = %q, err = %v", branchStatus, err)
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

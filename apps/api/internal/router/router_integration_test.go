package router

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
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
	"y/internal/handler"
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

func TestOperationsRoutesRequireAnOperationsRole(t *testing.T) {
	r := New(nil, nil)
	for _, test := range []struct {
		name, role string
		want       int
	}{
		{name: "cashier is forbidden", role: "cashier", want: http.StatusForbidden},
		{name: "admin reaches database handler", role: "admin", want: http.StatusServiceUnavailable},
		{name: "franchise owner is forbidden", role: "franchise_owner", want: http.StatusForbidden},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/maintenance-tickets", nil)
			req.Header.Set("Authorization", "Bearer "+testToken(t, test.role))
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", res.Code, test.want, res.Body.String())
			}
		})
	}
}

func TestExpenseRequestRoutesEnforceStaffAndAdminPermissions(t *testing.T) {
	r := New(nil, nil)
	tests := []struct {
		name, method, path, role string
		want                     int
	}{
		{"create requires authentication", http.MethodPost, "/api/v1/expense-requests", "", http.StatusUnauthorized},
		{"stock staff may create", http.MethodPost, "/api/v1/expense-requests", "cashier", http.StatusServiceUnavailable},
		{"stock staff may not list", http.MethodGet, "/api/v1/expense-requests", "cashier", http.StatusForbidden},
		{"franchise owner may list", http.MethodGet, "/api/v1/expense-requests", "franchise_owner", http.StatusServiceUnavailable},
		{"status update requires authentication", http.MethodPatch, "/api/v1/expense-requests/1/status", "", http.StatusUnauthorized},
		{"stock staff may not approve", http.MethodPatch, "/api/v1/expense-requests/1/status", "cashier", http.StatusForbidden},
		{"franchise owner may not approve", http.MethodPatch, "/api/v1/expense-requests/1/status", "franchise_owner", http.StatusForbidden},
		{"admin may update status", http.MethodPatch, "/api/v1/expense-requests/1/status", "admin", http.StatusServiceUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			if tt.role != "" {
				req.Header.Set("Authorization", "Bearer "+testToken(t, tt.role))
			}
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != tt.want {
				t.Fatalf("status = %d, want %d: %s", res.Code, tt.want, res.Body.String())
			}
		})
	}
}

func TestExpenseRequestsDoNotCrossBranchScope(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchA := seedBranch(t, db, "EXPENSE-SCOPE-A")
	branchB := seedBranch(t, db, "EXPENSE-SCOPE-B")
	seedUser(t, db, 7, "expense-scope-user", "branch_manager", branchA, nil)
	if _, err := db.Exec(`INSERT INTO expense_requests(branch_id,title,category,estimated_amount,requested_by) VALUES($1,'ของสาขา A','office',100,7),($2,'ของสาขา B','office',200,7)`, branchA, branchB); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	branchToken := testTokenWithBranch(t, "branch_manager", branchA)

	list := requestJSON(r, http.MethodGet, "/api/v1/expense-requests", "", branchToken)
	if list.Code != http.StatusOK || !strings.Contains(list.Body.String(), "ของสาขา A") || strings.Contains(list.Body.String(), "ของสาขา B") {
		t.Fatalf("branch-scoped list = %d: %s", list.Code, list.Body.String())
	}
	create := requestJSON(r, http.MethodPost, "/api/v1/expense-requests", fmt.Sprintf(`{"branchId":%d,"title":"รายการข้ามสาขา","category":"office","estimatedAmount":100}`, branchB), branchToken)
	if create.Code != http.StatusCreated {
		t.Fatalf("server-scoped create = %d: %s", create.Code, create.Body.String())
	}
	var persistedBranchID int64
	if err := db.QueryRow(`SELECT branch_id FROM expense_requests WHERE title='รายการข้ามสาขา'`).Scan(&persistedBranchID); err != nil || persistedBranchID != branchA {
		t.Fatalf("request escaped branch scope: branch=%d err=%v", persistedBranchID, err)
	}
}

func TestExpenseRequestStatusEnforcesTransitionOrder(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "EXPENSE-TRANSITION")
	seedUser(t, db, 7, "expense-admin", "admin", branchID, nil)
	var requestID int64
	if err := db.QueryRow(`INSERT INTO expense_requests(branch_id,title,category,estimated_amount,requested_by) VALUES($1,'ซื้ออุปกรณ์ภายนอก','office',500,7) RETURNING id`, branchID).Scan(&requestID); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	path := fmt.Sprintf("/api/v1/expense-requests/%d/status", requestID)
	adminToken := testToken(t, "admin")
	for _, tt := range []struct {
		name, status string
		want         int
		persisted    string
	}{
		{"cannot skip approval", "funded", http.StatusConflict, "pending"},
		{"approve", "approved", http.StatusOK, "approved"},
		{"cannot complete before funding", "completed", http.StatusConflict, "approved"},
		{"record funding", "funded", http.StatusOK, "funded"},
		{"cannot reject after funding", "rejected", http.StatusConflict, "funded"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			res := requestJSON(r, http.MethodPatch, path, fmt.Sprintf(`{"status":%q}`, tt.status), adminToken)
			if res.Code != tt.want {
				t.Fatalf("status = %d, want %d: %s", res.Code, tt.want, res.Body.String())
			}
			var status string
			if err := db.QueryRow(`SELECT status FROM expense_requests WHERE id=$1`, requestID).Scan(&status); err != nil || status != tt.persisted {
				t.Fatalf("persisted status = %q, want %q: %v", status, tt.persisted, err)
			}
		})
	}
}

func TestCentralCatalogTemplateRoutesAreAdminOnly(t *testing.T) {
	r := New(nil, nil)
	for _, test := range []struct {
		name, method, path, role string
		want                     int
	}{
		{name: "requires authentication", method: http.MethodGet, path: "/api/v1/catalog-templates", want: http.StatusUnauthorized},
		{name: "franchise owner cannot list", method: http.MethodGet, path: "/api/v1/catalog-templates", role: "franchise_owner", want: http.StatusForbidden},
		{name: "cashier cannot inspect impact", method: http.MethodGet, path: "/api/v1/catalog-templates/1/impact", role: "cashier", want: http.StatusForbidden},
		{name: "admin reaches the unavailable handler", method: http.MethodGet, path: "/api/v1/catalog-templates", role: "admin", want: http.StatusServiceUnavailable},
		{name: "cashier cannot change branch selection", method: http.MethodPut, path: "/api/v1/branches/1/catalog-selections/menu/2", role: "cashier", want: http.StatusForbidden},
		{name: "franchise owner cannot read another branch selection", method: http.MethodGet, path: "/api/v1/branches/999/catalog-selections", role: "franchise_owner", want: http.StatusForbidden},
		{name: "branch manager cannot change another branch selection", method: http.MethodPut, path: "/api/v1/branches/999/catalog-selections/menu/2", role: "branch_manager", want: http.StatusForbidden},
		{name: "admin selection reaches unavailable handler", method: http.MethodPut, path: "/api/v1/branches/1/catalog-selections/menu/2", role: "admin", want: http.StatusServiceUnavailable},
		{name: "admin sync reaches the unavailable handler", method: http.MethodPost, path: "/api/v1/catalog-templates/1/sync", role: "admin", want: http.StatusServiceUnavailable},
		{name: "cashier cannot read sync progress", method: http.MethodGet, path: "/api/v1/catalog-templates/1/sync-jobs/2", role: "cashier", want: http.StatusForbidden},
		{name: "franchise owner cannot retry sync", method: http.MethodPost, path: "/api/v1/catalog-templates/1/sync-jobs/2/retry", role: "franchise_owner", want: http.StatusForbidden},
		{name: "admin status reaches unavailable handler", method: http.MethodGet, path: "/api/v1/catalog-templates/1/sync-jobs/latest", role: "admin", want: http.StatusServiceUnavailable},
		{name: "cashier cannot create central inventory", method: http.MethodPost, path: "/api/v1/catalog-templates/1/inventory", role: "cashier", want: http.StatusForbidden},
		{name: "admin create menu reaches unavailable handler", method: http.MethodPost, path: "/api/v1/catalog-templates/1/menu-items", role: "admin", want: http.StatusServiceUnavailable},
		{name: "franchise owner cannot retire a central item", method: http.MethodDelete, path: "/api/v1/catalog-templates/1/inventory/2", role: "franchise_owner", want: http.StatusForbidden},
		{name: "admin retire reaches the unavailable handler", method: http.MethodDelete, path: "/api/v1/catalog-templates/1/menu-items/2", role: "admin", want: http.StatusServiceUnavailable},
		{name: "cashier cannot replace a central recipe", method: http.MethodPut, path: "/api/v1/catalog-templates/1/menu-items/2/recipes", role: "cashier", want: http.StatusForbidden},
		{name: "admin recipe replace reaches the unavailable handler", method: http.MethodPut, path: "/api/v1/catalog-templates/1/menu-items/2/recipes", role: "admin", want: http.StatusServiceUnavailable},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(test.method, test.path, nil)
			if test.role != "" {
				req.Header.Set("Authorization", "Bearer "+testToken(t, test.role))
			}
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", res.Code, test.want, res.Body.String())
			}
		})
	}
}

func TestCentralTemplateProvisioningAndSyncPreserveBranchPhysicalStock(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	seedBranchID := seedBranch(t, db, "CENTRAL-TEMPLATE-ADMIN")
	seedUser(t, db, 7, "central-template-admin", "admin", seedBranchID, nil)

	var templateID int64
	if err := db.QueryRow(`SELECT id FROM catalog_templates WHERE scope='central' AND branch_size='ALL'`).Scan(&templateID); err != nil {
		t.Fatalf("read central catalog: %v", err)
	}
	templateInventoryName := fmt.Sprintf("วัตถุดิบแม่แบบทดสอบ-%d", time.Now().UnixNano())
	var catalogItemID int64
	if err := db.QueryRow(`
		INSERT INTO inventory_catalog_items(name,category,kind,unit,unit_cost,track_stock)
		VALUES($1,'test','ingredient','กรัม',2,true)
		RETURNING id`, templateInventoryName).Scan(&catalogItemID); err != nil {
		t.Fatalf("create central inventory identity: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO catalog_template_inventory_items(template_id,catalog_item_id,category,kind,unit,unit_cost,reorder_level,track_stock)
		VALUES($1,$2,'test','ingredient','กรัม',2,3,true)`, templateID, catalogItemID); err != nil {
		t.Fatalf("add central template inventory: %v", err)
	}
	templateMenuName := fmt.Sprintf("เมนูแม่แบบทดสอบ-%d", time.Now().UnixNano())
	var templateMenuID int64
	if err := db.QueryRow(`
		INSERT INTO catalog_template_menu_items(template_id,name,category,store_price,lineman_price,status)
		VALUES($1,$2,'test',50,60,'available')
		RETURNING id`, templateID, templateMenuName).Scan(&templateMenuID); err != nil {
		t.Fatalf("add central template menu: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO catalog_template_menu_ingredients(template_menu_item_id,catalog_item_id,channel,quantity,unit,cost_amount)
		VALUES($1,$2,'storefront',2,'กรัม',4)`, templateMenuID, catalogItemID); err != nil {
		t.Fatalf("add central template recipe: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM catalog_template_menu_items WHERE id=$1`, templateMenuID)
		_, _ = db.Exec(`DELETE FROM catalog_template_inventory_items WHERE catalog_item_id=$1`, catalogItemID)
		_, _ = db.Exec(`DELETE FROM inventory_catalog_items WHERE id=$1`, catalogItemID)
	})

	r := New(db, nil)
	token := testToken(t, "admin")
	created := requestJSON(r, http.MethodPost, "/api/v1/branches", `{"name":"สาขาแม่แบบทดสอบ","code":"CENTRAL-TEMPLATE-S","size":"S"}`, token)
	if created.Code != http.StatusCreated {
		t.Fatalf("create branch from template = %d: %s", created.Code, created.Body.String())
	}
	branchID := responseID(t, created)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
	var inventoryID int64
	var quantity, reorderLevel float64
	var expiryDate sql.NullTime
	if err := db.QueryRow(`SELECT id,quantity,reorder_level,expiry_date FROM inventory_items WHERE branch_id=$1 AND catalog_item_id=$2`, branchID, catalogItemID).Scan(&inventoryID, &quantity, &reorderLevel, &expiryDate); err != nil {
		t.Fatalf("read provisioned branch inventory: %v", err)
	}
	if quantity != 0 || reorderLevel != 3 || expiryDate.Valid {
		t.Fatalf("new branch must start with no physical stock: quantity=%v reorder=%v expiry=%v", quantity, reorderLevel, expiryDate)
	}
	var branchRecipeQuantity float64
	if err := db.QueryRow(`
		SELECT recipe.quantity
		FROM menu_item_ingredients recipe
		JOIN menu_items menu ON menu.id=recipe.menu_item_id
		WHERE menu.branch_id=$1 AND menu.catalog_template_menu_item_id=$2 AND recipe.inventory_item_id=$3 AND recipe.channel='storefront'`, branchID, templateMenuID, inventoryID).Scan(&branchRecipeQuantity); err != nil {
		t.Fatalf("read provisioned central recipe: %v", err)
	}
	if branchRecipeQuantity != 2 {
		t.Fatalf("provisioned recipe quantity = %v, want 2", branchRecipeQuantity)
	}
	var initialMovements int
	if err := db.QueryRow(`SELECT COUNT(*) FROM stock_movements WHERE inventory_item_id=$1`, inventoryID).Scan(&initialMovements); err != nil || initialMovements != 0 {
		t.Fatalf("template provisioning must not create stock movements: count=%d err=%v", initialMovements, err)
	}

	physicalExpiry := "2031-02-03"
	if _, err := db.Exec(`UPDATE inventory_items SET quantity=17,expiry_date=$1 WHERE id=$2`, physicalExpiry, inventoryID); err != nil {
		t.Fatalf("set branch physical state: %v", err)
	}
	updated := requestJSON(r, http.MethodPatch, "/api/v1/catalog-templates/"+strconv.FormatInt(templateID, 10)+"/inventory/"+strconv.FormatInt(catalogItemID, 10), `{"unitCost":4,"reorderLevel":9}`, token)
	if updated.Code != http.StatusOK {
		t.Fatalf("edit central inventory default = %d: %s", updated.Code, updated.Body.String())
	}
	synced := requestJSON(r, http.MethodPost, "/api/v1/catalog-templates/"+strconv.FormatInt(templateID, 10)+"/sync", fmt.Sprintf(`{"branchIds":[%d]}`, branchID), token)
	if synced.Code != http.StatusAccepted || !strings.Contains(synced.Body.String(), `"status":"pending"`) {
		t.Fatalf("sync central template = %d: %s", synced.Code, synced.Body.String())
	}
	jobID := responseID(t, synced)
	worked, err := handler.ProcessCatalogSyncBranch(context.Background(), db, nil)
	if err != nil || !worked {
		t.Fatalf("process branch sync: worked=%t err=%v", worked, err)
	}
	status := requestJSON(r, http.MethodGet, fmt.Sprintf("/api/v1/catalog-templates/%d/sync-jobs/%d", templateID, jobID), "", token)
	if status.Code != http.StatusOK || !strings.Contains(status.Body.String(), `"status":"completed"`) {
		t.Fatalf("completed sync job = %d: %s", status.Code, status.Body.String())
	}
	if err := db.QueryRow(`SELECT quantity,reorder_level,expiry_date FROM inventory_items WHERE id=$1`, inventoryID).Scan(&quantity, &reorderLevel, &expiryDate); err != nil {
		t.Fatalf("read branch state after sync: %v", err)
	}
	if quantity != 17 || reorderLevel != 9 || !expiryDate.Valid || expiryDate.Time.Format("2006-01-02") != physicalExpiry {
		t.Fatalf("sync overwrote physical stock or skipped default: quantity=%v reorder=%v expiry=%v", quantity, reorderLevel, expiryDate)
	}
	var syncEvents int
	if err := db.QueryRow(`SELECT COUNT(*) FROM catalog_template_sync_events WHERE template_id=$1 AND branch_id=$2`, templateID, branchID).Scan(&syncEvents); err != nil || syncEvents != 1 {
		t.Fatalf("manual sync event = %d, err=%v", syncEvents, err)
	}
}

func TestCatalogSyncJobRetriesOnlyFailedBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var templateID int64
	if err := db.QueryRow(`SELECT id FROM catalog_templates WHERE scope='central' AND branch_size='ALL'`).Scan(&templateID); err != nil {
		t.Fatal(err)
	}
	first := seedBranch(t, db, "SYNC-FIRST")
	second := seedBranch(t, db, "SYNC-SECOND")
	seedUser(t, db, 7, "sync-admin", "admin", first, nil)
	if _, err := db.Exec(`INSERT INTO branch_catalog_template_assignments(branch_id,template_id) VALUES($1,$3),($2,$3)`, first, second, templateID); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testToken(t, "admin")
	path := fmt.Sprintf("/api/v1/catalog-templates/%d/sync", templateID)
	queued := requestJSON(r, http.MethodPost, path, "{}", token)
	if queued.Code != http.StatusAccepted {
		t.Fatalf("queue status = %d: %s", queued.Code, queued.Body.String())
	}
	jobID := responseID(t, queued)
	duplicate := requestJSON(r, http.MethodPost, path, "{}", token)
	if duplicate.Code != http.StatusAccepted || responseID(t, duplicate) != jobID {
		t.Fatalf("duplicate queue = %d: %s", duplicate.Code, duplicate.Body.String())
	}
	if _, err := db.Exec(`DELETE FROM branch_catalog_template_assignments WHERE branch_id=$1`, second); err != nil {
		t.Fatal(err)
	}
	for attempt := 0; attempt < 4; attempt++ {
		if _, err := db.Exec(`UPDATE catalog_sync_job_branches SET next_attempt_at=now() WHERE job_id=$1 AND status='pending'`, jobID); err != nil {
			t.Fatal(err)
		}
		worked, err := handler.ProcessCatalogSyncBranch(context.Background(), db, nil)
		if err != nil || !worked {
			t.Fatalf("job step %d: worked=%t err=%v", attempt, worked, err)
		}
	}
	statusPath := fmt.Sprintf("/api/v1/catalog-templates/%d/sync-jobs/%d", templateID, jobID)
	status := requestJSON(r, http.MethodGet, statusPath, "", token)
	if status.Code != http.StatusOK || !strings.Contains(status.Body.String(), `"status":"partial_failed"`) || !strings.Contains(status.Body.String(), `"completedBranches":1`) || !strings.Contains(status.Body.String(), `"failedBranches":1`) {
		t.Fatalf("partial failure status = %d: %s", status.Code, status.Body.String())
	}
	if _, err := db.Exec(`INSERT INTO branch_catalog_template_assignments(branch_id,template_id) VALUES($1,$2)`, second, templateID); err != nil {
		t.Fatal(err)
	}
	retried := requestJSON(r, http.MethodPost, statusPath+"/retry", "", token)
	if retried.Code != http.StatusAccepted || !strings.Contains(retried.Body.String(), `"status":"pending"`) {
		t.Fatalf("retry status = %d: %s", retried.Code, retried.Body.String())
	}
	worked, err := handler.ProcessCatalogSyncBranch(context.Background(), db, nil)
	if err != nil || !worked {
		t.Fatalf("retried branch: worked=%t err=%v", worked, err)
	}
	status = requestJSON(r, http.MethodGet, statusPath, "", token)
	if status.Code != http.StatusOK || !strings.Contains(status.Body.String(), `"status":"completed"`) || !strings.Contains(status.Body.String(), `"completedBranches":2`) {
		t.Fatalf("completed retry = %d: %s", status.Code, status.Body.String())
	}
	var firstEvents, secondEvents int
	if err := db.QueryRow(`SELECT count(*) FROM catalog_template_sync_events WHERE template_id=$1 AND branch_id=$2`, templateID, first).Scan(&firstEvents); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT count(*) FROM catalog_template_sync_events WHERE template_id=$1 AND branch_id=$2`, templateID, second).Scan(&secondEvents); err != nil {
		t.Fatal(err)
	}
	if firstEvents != 1 || secondEvents != 1 {
		t.Fatalf("sync events duplicated: first=%d second=%d", firstEvents, secondEvents)
	}
}

func TestCatalogSyncEnqueuesTwoHundredBranchesWithinRequestTimeout(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var templateID, franchiseID int64
	if err := db.QueryRow(`SELECT id FROM catalog_templates WHERE scope='central' AND branch_size='ALL'`).Scan(&templateID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Load Test','load-test@example.com','S','active') RETURNING id`).Scan(&franchiseID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		INSERT INTO branches(name,code,size,status,franchisee_id)
		SELECT 'Load branch '||n,'SYNC-LOAD-'||n,'S','active',
			CASE WHEN n<=100 THEN NULL::bigint ELSE $1::bigint END
		FROM generate_series(1,200) n`, franchiseID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO branch_catalog_template_assignments(branch_id,template_id)
		SELECT id,$1 FROM branches WHERE code LIKE 'SYNC-LOAD-%'`, templateID); err != nil {
		t.Fatal(err)
	}
	var adminBranchID int64
	if err := db.QueryRow(`SELECT id FROM branches WHERE code='SYNC-LOAD-1'`).Scan(&adminBranchID); err != nil {
		t.Fatal(err)
	}
	seedUser(t, db, 7, "sync-load-admin", "admin", adminBranchID, nil)
	started := time.Now()
	res := requestJSON(New(db, nil), http.MethodPost, fmt.Sprintf("/api/v1/catalog-templates/%d/sync", templateID), "{}", testToken(t, "admin"))
	if res.Code != http.StatusAccepted || !strings.Contains(res.Body.String(), `"totalBranches":200`) {
		t.Fatalf("large sync queue = %d: %s", res.Code, res.Body.String())
	}
	queueDuration := time.Since(started)
	if queueDuration >= 15*time.Second {
		t.Fatalf("queue exceeded HTTP timeout: %s", queueDuration)
	}
	processingStarted := time.Now()
	for range 200 {
		worked, err := handler.ProcessCatalogSyncBranch(context.Background(), db, nil)
		if err != nil || !worked {
			t.Fatalf("processing branch: worked=%v err=%v", worked, err)
		}
	}
	var status string
	var completed int
	if err := db.QueryRow(`SELECT job.status,COUNT(branch.branch_id) FILTER (WHERE branch.status='completed')
		FROM catalog_sync_jobs job JOIN catalog_sync_job_branches branch ON branch.job_id=job.id
		WHERE job.template_id=$1 GROUP BY job.id`, templateID).Scan(&status, &completed); err != nil {
		t.Fatal(err)
	}
	if status != "completed" || completed != 200 {
		t.Fatalf("200-branch sync status=%s completed=%d", status, completed)
	}
	t.Logf("queued 200 branches in %s; processed in %s", queueDuration, time.Since(processingStarted))
}

func TestMaintenanceTicketRoutesRejectInvalidInputBeforeDatabaseAccess(t *testing.T) {
	r := New(nil, nil)
	for _, test := range []struct {
		name, method, path, body string
	}{
		{name: "invalid priority", method: http.MethodPost, path: "/api/v1/maintenance-tickets", body: `{"branchCode":"SBC-AYA-001","title":"เครื่องชงมีปัญหา","priority":"invalid"}`},
		{name: "missing branch", method: http.MethodPost, path: "/api/v1/maintenance-tickets", body: `{"title":"เครื่องชงมีปัญหา"}`},
		{name: "invalid ticket id", method: http.MethodPatch, path: "/api/v1/maintenance-tickets/not-an-id/status", body: `{"status":"completed"}`},
		{name: "invalid ticket status", method: http.MethodPatch, path: "/api/v1/maintenance-tickets/1/status", body: `{"status":"invalid"}`},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			req.Header.Set("Authorization", "Bearer "+testToken(t, "admin"))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d: %s", res.Code, http.StatusBadRequest, res.Body.String())
			}
		})
	}
}

func TestMaintenanceTicketRoutesFailSafelyWhenDatabaseIsUnavailable(t *testing.T) {
	r := New(nil, nil)
	for _, test := range []struct {
		name, method, path, body string
	}{
		{name: "create", method: http.MethodPost, path: "/api/v1/maintenance-tickets", body: `{"branchCode":"SBC-AYA-001","title":"เครื่องชงมีปัญหา","priority":"normal"}`},
		{name: "update", method: http.MethodPatch, path: "/api/v1/maintenance-tickets/1/status", body: `{"status":"completed"}`},
		{name: "inspection PDF", method: http.MethodGet, path: "/api/v1/inspections/1/pdf", body: ""},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			req.Header.Set("Authorization", "Bearer "+testToken(t, "admin"))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != http.StatusServiceUnavailable {
				t.Fatalf("status = %d, want %d: %s", res.Code, http.StatusServiceUnavailable, res.Body.String())
			}
		})
	}
}

func TestOperationsWorkflowRoutesRejectInvalidInputBeforeDatabaseAccess(t *testing.T) {
	r := New(nil, nil)
	for _, test := range []struct {
		name, method, path, body string
	}{
		{name: "inspection invalid score", method: http.MethodPost, path: "/api/v1/inspections", body: `{"branchCode":"SBC-AYA-001","inspectorName":"QA","status":"passed","score":101}`},
		{name: "inspection invalid result", method: http.MethodPost, path: "/api/v1/inspections", body: `{"branchCode":"SBC-AYA-001","inspectorName":"QA","status":"unknown","score":80}`},
		{name: "random inspection missing inspector", method: http.MethodPost, path: "/api/v1/inspections/randomize", body: `{"branchSize":"S","excludeDays":30}`},
		{name: "inspection template missing checklist", method: http.MethodPost, path: "/api/v1/inspection-templates", body: `{"name":"ตรวจสาขา","branchSize":"S","checklist":[]}`},
		{name: "complete inspection invalid score", method: http.MethodPatch, path: "/api/v1/inspections/1/complete", body: `{"status":"passed","score":101}`},
		{name: "asset missing name", method: http.MethodPost, path: "/api/v1/assets", body: `{"branchCode":"SBC-AYA-001","assetType":"เครื่องชง"}`},
		{name: "invoice invalid service", method: http.MethodPost, path: "/api/v1/service-invoices", body: `{"branchCode":"SBC-AYA-001","invoiceNumber":"INV-1","serviceType":"unknown","amount":10}`},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			req.Header.Set("Authorization", "Bearer "+testToken(t, "admin"))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d: %s", res.Code, http.StatusBadRequest, res.Body.String())
			}
		})
	}
}

func TestStockConsumptionRouteEnforcesStaffScopeAndValidatesInput(t *testing.T) {
	r := New(nil, nil)
	validBody := `{"items":[{"menuItemId":1,"quantity":1}],"note":"ปิดกะ","channel":"storefront"}`
	for _, test := range []struct {
		name, role, body string
		want             int
	}{
		{name: "requires authentication", body: validBody, want: http.StatusUnauthorized},
		{name: "blocks platform admin", role: "admin", body: validBody, want: http.StatusForbidden},
		{name: "reaches unavailable handler for a valid staff request", role: "cashier", body: validBody, want: http.StatusServiceUnavailable},
	} {
		t.Run(test.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/stock/consume", strings.NewReader(test.body))
			if test.role != "" {
				req.Header.Set("Authorization", "Bearer "+testToken(t, test.role))
			}
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != test.want {
				t.Fatalf("status = %d, want %d: %s", res.Code, test.want, res.Body.String())
			}
		})
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

func TestStockSessionUsesOnlyTheDedicatedStockCookie(t *testing.T) {
	r := New(nil, nil)

	t.Run("stock role header does not accept the attendance cookie", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stock/session", nil)
		req.Header.Set("X-SBC-Session-Role", "stock")
		req.AddCookie(&http.Cookie{Name: "sbc_attendance_session", Value: testToken(t, "cashier")})
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)
		if res.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
		}
	})

	t.Run("stock role header reaches the stock session when both staff cookies exist", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/stock/session", nil)
		req.Header.Set("X-SBC-Session-Role", "stock")
		req.AddCookie(&http.Cookie{Name: "sbc_attendance_session", Value: testToken(t, "cashier")})
		req.AddCookie(&http.Cookie{Name: "sbc_stock_session", Value: testToken(t, "cashier")})
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)
		// The handler reaches its database dependency; a 503 proves middleware
		// selected the dedicated stock cookie rather than the attendance cookie.
		if res.Code != http.StatusServiceUnavailable {
			t.Fatalf("status = %d, want %d", res.Code, http.StatusServiceUnavailable)
		}
	})
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
	location := `{"latitude":16.821085,"longitude":100.2694448,"accuracyM":8}`
	if checkIn := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-in", location, cookies[0]); checkIn.Code != http.StatusOK {
		t.Fatalf("check in = %d: %s", checkIn.Code, checkIn.Body.String())
	}
	if duplicateCheckIn := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-in", location, cookies[0]); duplicateCheckIn.Code != http.StatusBadRequest {
		t.Fatalf("duplicate check in = %d: %s", duplicateCheckIn.Code, duplicateCheckIn.Body.String())
	}
	if checkOut := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-out", location, cookies[0]); checkOut.Code != http.StatusOK {
		t.Fatalf("check out = %d: %s", checkOut.Code, checkOut.Body.String())
	}
	if duplicateCheckOut := requestJSONWithCookie(r, http.MethodPost, "/api/v1/attendance/check-out", location, cookies[0]); duplicateCheckOut.Code != http.StatusBadRequest {
		t.Fatalf("duplicate check out = %d: %s", duplicateCheckOut.Code, duplicateCheckOut.Body.String())
	}
}

func TestAttendanceGeofenceRejectsOutsideLocationAndStoresAcceptedLocation(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-GEOFENCE")
	seedUser(t, db, 7, "attendance-geofence", "cashier", branchID, nil)
	today := time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60)).Format("2006-01-02")
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES(7,$1,$2,'08:00','17:00','scheduled')`, branchID, today); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testTokenWithBranch(t, "cashier", branchID)

	outside := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-in", `{"latitude":16.831085,"longitude":100.2694448,"accuracyM":12}`, token)
	if outside.Code != http.StatusForbidden || !strings.Contains(outside.Body.String(), "นอกรัศมี") {
		t.Fatalf("outside geofence check-in = %d: %s", outside.Code, outside.Body.String())
	}
	inside := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-in", `{"latitude":16.821085,"longitude":100.2694448,"accuracyM":8}`, token)
	if inside.Code != http.StatusOK {
		t.Fatalf("inside geofence check-in = %d: %s", inside.Code, inside.Body.String())
	}
	var latitude, longitude, accuracy float64
	if err := db.QueryRow(`SELECT check_in_latitude,check_in_longitude,check_in_accuracy_m FROM staff_attendance WHERE user_id=7 AND work_date=$1`, today).Scan(&latitude, &longitude, &accuracy); err != nil {
		t.Fatal(err)
	}
	if latitude != 16.821085 || longitude != 100.2694448 || accuracy != 8 {
		t.Fatalf("stored attendance location = %f,%f,%f", latitude, longitude, accuracy)
	}
}

func TestAttendanceOvernightShiftCanCheckOutNextDay(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-OVERNIGHT")
	seedUser(t, db, 7, "attendance-overnight", "cashier", branchID, nil)
	yesterday := time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60)).AddDate(0, 0, -1).Format("2006-01-02")
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES(7,$1,$2,'22:00','06:00','scheduled')`, branchID, yesterday); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES(7,$1,$2,$3)`, branchID, yesterday, time.Now().Add(-8*time.Hour)); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testTokenWithBranch(t, "cashier", branchID)
	status := requestJSON(r, http.MethodGet, "/api/v1/attendance/today", "", token)
	if status.Code != http.StatusOK || !strings.Contains(status.Body.String(), `"checkedIn":true`) || !strings.Contains(status.Body.String(), yesterday) {
		t.Fatalf("overnight status = %d: %s", status.Code, status.Body.String())
	}
	checkOut := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-out", `{"latitude":16.821085,"longitude":100.2694448}`, token)
	if checkOut.Code != http.StatusOK {
		t.Fatalf("overnight check out = %d: %s", checkOut.Code, checkOut.Body.String())
	}
	if duplicate := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-out", `{"latitude":16.821085,"longitude":100.2694448}`, token); duplicate.Code != http.StatusBadRequest {
		t.Fatalf("duplicate overnight check out = %d: %s", duplicate.Code, duplicate.Body.String())
	}
}

func TestAttendancePreviousDayShiftCannotCheckOutIfNotOvernight(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "ATTENDANCE-DAY-ONLY")
	seedUser(t, db, 7, "attendance-day-only", "cashier", branchID, nil)
	yesterday := time.Now().In(time.FixedZone("Asia/Bangkok", 7*60*60)).AddDate(0, 0, -1).Format("2006-01-02")
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES(7,$1,$2,'08:00','17:00','scheduled')`, branchID, yesterday); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES(7,$1,$2,$3)`, branchID, yesterday, time.Now().Add(-24*time.Hour)); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testTokenWithBranch(t, "cashier", branchID)
	status := requestJSON(r, http.MethodGet, "/api/v1/attendance/today", "", token)
	if status.Code != http.StatusOK || strings.Contains(status.Body.String(), `"checkedIn":true`) {
		t.Fatalf("non-overnight status = %d: %s", status.Code, status.Body.String())
	}
	checkOut := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-out", `{"latitude":16.821085,"longitude":100.2694448}`, token)
	if checkOut.Code != http.StatusBadRequest {
		t.Fatalf("non-overnight check out = %d: %s", checkOut.Code, checkOut.Body.String())
	}
}

func TestMenuSummaryPaginatesAndSeparatesBranchScopes(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	sbcA := seedBranch(t, db, "SUMMARY-A")
	sbcB := seedBranch(t, db, "SUMMARY-B")
	var franchiseID, franchiseBranch int64
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Summary Franchise','summary@example.com','S','active') RETURNING id`).Scan(&franchiseID); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,size,status) VALUES($1,'Summary Franchise Branch','SUMMARY-F','S','active') RETURNING id`, franchiseID).Scan(&franchiseBranch); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status,template_enabled) VALUES
		($1,'SBC Available','coffee',60,70,18,'available',true),
		($1,'SBC Hidden','coffee',60,70,18,'available',false),
		($2,'SBC Unavailable','coffee',60,70,18,'soldout',true),
		($3,'Franchise Coffee','coffee',60,70,18,'available',true),
		($3,'Franchise Food','อาหาร',60,70,18,'available',true)`, sbcA, sbcB, franchiseBranch); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	admin := testToken(t, "admin")
	first := requestJSON(r, http.MethodGet, "/api/v1/menu-items/summary?scope=sbc&page=1&pageSize=1", "", admin)
	if first.Code != http.StatusOK || !strings.Contains(first.Body.String(), `"total":2`) || !strings.Contains(first.Body.String(), `"menuCount":1`) || strings.Contains(first.Body.String(), "SUMMARY-F") {
		t.Fatalf("first SBC summary page = %d: %s", first.Code, first.Body.String())
	}
	second := requestJSON(r, http.MethodGet, "/api/v1/menu-items/summary?scope=sbc&page=2&pageSize=1", "", admin)
	if second.Code != http.StatusOK || !strings.Contains(second.Body.String(), `"total":2`) || strings.Contains(second.Body.String(), "SUMMARY-F") || first.Body.String() == second.Body.String() {
		t.Fatalf("second SBC summary page = %d: %s", second.Code, second.Body.String())
	}
	franchise := requestJSON(r, http.MethodGet, "/api/v1/menu-items/summary?scope=franchise", "", admin)
	if franchise.Code != http.StatusOK || !strings.Contains(franchise.Body.String(), `"total":1`) || !strings.Contains(franchise.Body.String(), `"menuCount":1`) || !strings.Contains(franchise.Body.String(), "SUMMARY-F") || strings.Contains(franchise.Body.String(), "SUMMARY-A") {
		t.Fatalf("franchise summary = %d: %s", franchise.Code, franchise.Body.String())
	}
	denied := requestJSON(r, http.MethodGet, "/api/v1/menu-items/summary", "", testToken(t, "cashier"))
	if denied.Code != http.StatusForbidden {
		t.Fatalf("non-admin summary = %d: %s", denied.Code, denied.Body.String())
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

	if res := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-in", `{"latitude":16.821085,"longitude":100.2694448}`, token); res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "ไม่ใช่วันทำงาน") {
		t.Fatalf("missing shift check-in = %d: %s", res.Code, res.Body.String())
	}
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES(7,$1,$2,'08:00','17:00','day_off')`, branchID, today); err != nil {
		t.Fatal(err)
	}
	if res := requestJSON(r, http.MethodPost, "/api/v1/attendance/check-in", `{"latitude":16.821085,"longitude":100.2694448}`, token); res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "ไม่ใช่วันทำงาน") {
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

func TestStockPINSetupChallengesNewStaffAndIssuesStockSession(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "STOCK-PIN")
	seedUser(t, db, 81, "stock-pin", "cashier", branchID, nil)
	r := New(db, nil)

	challenge := requestJSON(r, http.MethodPost, "/api/v1/stock/login", `{"username":"stock-pin"}`, "")
	if challenge.Code != http.StatusOK || !strings.Contains(challenge.Body.String(), `"requiresPINSetup":true`) || len(challenge.Result().Cookies()) != 0 {
		t.Fatalf("stock PIN setup challenge = %d: %s", challenge.Code, challenge.Body.String())
	}
	setup := requestJSON(r, http.MethodPost, "/api/v1/stock/setup-pin", `{"username":"stock-pin","pin":"123456"}`, "")
	if setup.Code != http.StatusOK || strings.Contains(setup.Body.String(), "accessToken") {
		t.Fatalf("stock PIN setup = %d: %s", setup.Code, setup.Body.String())
	}
	cookies := setup.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "sbc_stock_session" || !cookies[0].HttpOnly {
		t.Fatalf("stock PIN setup did not issue an HttpOnly session cookie: %#v", cookies)
	}
	repeated := requestJSON(r, http.MethodPost, "/api/v1/stock/setup-pin", `{"username":"stock-pin","pin":"654321"}`, "")
	if repeated.Code != http.StatusConflict {
		t.Fatalf("repeated stock PIN setup = %d: %s", repeated.Code, repeated.Body.String())
	}
	login := requestJSON(r, http.MethodPost, "/api/v1/stock/login", `{"username":"stock-pin","pin":"123456"}`, "")
	if login.Code != http.StatusOK {
		t.Fatalf("stock PIN login = %d: %s", login.Code, login.Body.String())
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

func TestStockRequestListingRejectsCashierRole(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/stock-requests", nil)
	req.Header.Set("Authorization", "Bearer "+testToken(t, "cashier"))
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
	}
}

func TestStockRequestCreationAllowsCashierStockSession(t *testing.T) {
	r := New(nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/stock-requests", nil)
	req.Header.Set("X-SBC-Session-Role", "stock")
	req.AddCookie(&http.Cookie{Name: "sbc_stock_session", Value: testToken(t, "cashier")})
	res := httptest.NewRecorder()
	r.ServeHTTP(res, req)

	// A nil database makes the handler unavailable, but reaching this response
	// proves the stock route accepts the dedicated cashier session instead of
	// rejecting it at the authorization boundary.
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusServiceUnavailable)
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
	if got := res.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, http.MethodPut) {
		t.Fatalf("allow methods = %q, want PUT", got)
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
	postal := requestJSON(r, http.MethodGet, "/api/v1/inventory?branchId=1&kind=stock&stockCategory=postal_equipment", "", testToken(t, "admin"))
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

func TestAdminCanCreateCompanyBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	sourceBranchID := seedBranch(t, db, "SBC-CATALOG-001")
	seedUser(t, db, 7, "company-creator", "admin", sourceBranchID, nil)
	r := New(db, nil)

	res := requestJSON(r, http.MethodPost, "/api/v1/branches", `{"name":"สาขาเชียงใหม่","code":"sbc-cnx-001","size":"S"}`, testToken(t, "admin"))
	if res.Code != http.StatusCreated {
		t.Fatalf("create company branch = %d: %s", res.Code, res.Body.String())
	}
	branchID := responseID(t, res)
	var name, code, size, status string
	var franchiseeID sql.NullInt64
	if err := db.QueryRow(`SELECT name,code,size,status,franchisee_id FROM branches WHERE id=$1`, branchID).Scan(&name, &code, &size, &status, &franchiseeID); err != nil {
		t.Fatal(err)
	}
	if name != "สาขาเชียงใหม่" || code != "SBC-CNX-001" || size != "S" || status != "active" || franchiseeID.Valid {
		t.Fatalf("saved company branch = name=%q code=%q size=%q status=%q franchise=%v", name, code, size, status, franchiseeID)
	}
	if duplicate := requestJSON(r, http.MethodPost, "/api/v1/branches", `{"name":"สาขาซ้ำ","code":"SBC-CNX-001","size":"M"}`, testToken(t, "admin")); duplicate.Code != http.StatusConflict {
		t.Fatalf("duplicate company branch = %d: %s", duplicate.Code, duplicate.Body.String())
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

func TestMenuRecipeAvailabilityControlsSellableStatus(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "MENU-READINESS")
	seedUser(t, db, 7, "admin-menu-readiness", "admin", branchID, nil)
	r := New(db, nil)
	token := testToken(t, "admin")
	branchQuery := "?branchId=" + strconv.FormatInt(branchID, 10)

	draft := requestJSON(r, http.MethodPost, "/api/v1/menu-items"+branchQuery, `{"name":"เมนูร่าง","category":"coffee","storePrice":60,"linemanPrice":70,"costPrice":20,"ingredients":[]}`, token)
	if draft.Code != http.StatusCreated {
		t.Fatalf("create draft menu = %d: %s", draft.Code, draft.Body.String())
	}
	draftID := responseID(t, draft)
	var savedStatus string
	if err := db.QueryRow(`SELECT status FROM menu_items WHERE id=$1`, draftID).Scan(&savedStatus); err != nil || savedStatus != "available" {
		t.Fatalf("draft menu status = %q, want available, err=%v", savedStatus, err)
	}
	listedDraft := requestJSON(r, http.MethodGet, "/api/v1/menu-items"+branchQuery, "", token)
	if listedDraft.Code != http.StatusOK || !strings.Contains(listedDraft.Body.String(), `"recipeStatus":"missing_recipe"`) || !strings.Contains(listedDraft.Body.String(), `"sellable":false`) {
		t.Fatalf("draft menu readiness = %d: %s", listedDraft.Code, listedDraft.Body.String())
	}

	inventoryID := seedInventory(t, db, branchID, "กาแฟพร้อมขาย", 10)
	readyPayload := `{"name":"เมนูร่าง","category":"coffee","storePrice":60,"linemanPrice":70,"costPrice":20,"ingredients":[{"inventoryItemId":` + strconv.FormatInt(inventoryID, 10) + `,"quantity":5,"unit":"กรัม"}]}`
	updated := requestJSON(r, http.MethodPatch, "/api/v1/menu-items/"+strconv.FormatInt(draftID, 10)+branchQuery, readyPayload, token)
	if updated.Code != http.StatusOK {
		t.Fatalf("update ready recipe = %d: %s", updated.Code, updated.Body.String())
	}
	listedReady := requestJSON(r, http.MethodGet, "/api/v1/menu-items"+branchQuery, "", token)
	if listedReady.Code != http.StatusOK || !strings.Contains(listedReady.Body.String(), `"recipeStatus":"ready"`) || !strings.Contains(listedReady.Body.String(), `"sellable":true`) {
		t.Fatalf("ready menu status = %d: %s", listedReady.Code, listedReady.Body.String())
	}

	if _, err := db.Exec(`UPDATE inventory_items SET quantity=4 WHERE id=$1`, inventoryID); err != nil {
		t.Fatalf("reduce menu ingredient stock: %v", err)
	}
	listedInsufficient := requestJSON(r, http.MethodGet, "/api/v1/menu-items"+branchQuery, "", token)
	if listedInsufficient.Code != http.StatusOK || !strings.Contains(listedInsufficient.Body.String(), `"recipeStatus":"insufficient_stock"`) || !strings.Contains(listedInsufficient.Body.String(), `"sellable":false`) {
		t.Fatalf("insufficient menu status = %d: %s", listedInsufficient.Code, listedInsufficient.Body.String())
	}

	otherBranchID := seedBranch(t, db, "OTHER-MENU-READINESS")
	foreignInventoryID := seedInventory(t, db, otherBranchID, "กาแฟสาขาอื่น", 10)
	foreignPayload := `{"name":"เมนูต่างสาขา","category":"coffee","storePrice":60,"linemanPrice":70,"costPrice":20,"ingredients":[{"inventoryItemId":` + strconv.FormatInt(foreignInventoryID, 10) + `,"quantity":1,"unit":"กรัม"}]}`
	if res := requestJSON(r, http.MethodPost, "/api/v1/menu-items"+branchQuery, foreignPayload, token); res.Code != http.StatusBadRequest {
		t.Fatalf("foreign inventory recipe = %d: %s", res.Code, res.Body.String())
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
	fixtureID := strconv.FormatInt(time.Now().UnixNano(), 36)
	franchiseEmail := "franchise-" + fixtureID + "@example.com"
	franchiseUsername := "franchise_" + fixtureID
	franchiseBranchCode := "FR-" + fixtureID
	branchID := seedBranch(t, db, "FRANCHISE-ADMIN")
	var franchiseTemplateID int64
	if err := db.QueryRow(`SELECT id FROM catalog_templates WHERE scope='central' AND branch_size='ALL'`).Scan(&franchiseTemplateID); err != nil {
		t.Fatalf("read central catalog for franchise: %v", err)
	}
	fixtureCatalogNames := []string{"แก้วเครื่องดื่ม-" + fixtureID, "กล่องพัสดุ-" + fixtureID}
	fixtureCatalogIDs := make([]int64, 0, len(fixtureCatalogNames))
	for index, name := range fixtureCatalogNames {
		stockCategory := "drink_equipment"
		category := "cup"
		if index == 1 {
			stockCategory = "postal_equipment"
			category = "box"
		}
		var catalogID int64
		if err := db.QueryRow(`INSERT INTO inventory_catalog_items(name,category,stock_category,kind,unit,unit_cost) VALUES($1,$2,$3,'stock','ใบ',$4) RETURNING id`, name, category, stockCategory, index*3+2).Scan(&catalogID); err != nil {
			t.Fatalf("seed franchise catalog identity: %v", err)
		}
		fixtureCatalogIDs = append(fixtureCatalogIDs, catalogID)
		if _, err := db.Exec(`INSERT INTO catalog_template_inventory_items(template_id,catalog_item_id,category,stock_category,kind,unit,unit_cost,reorder_level,track_stock) VALUES($1,$2,$3,$4,'stock','ใบ',$5,1,true)`, franchiseTemplateID, catalogID, category, stockCategory, index*3+2); err != nil {
			t.Fatalf("seed franchise central template: %v", err)
		}
	}
	t.Cleanup(func() {
		for _, catalogID := range fixtureCatalogIDs {
			_, _ = db.Exec(`DELETE FROM catalog_template_inventory_items WHERE catalog_item_id=$1`, catalogID)
			_, _ = db.Exec(`DELETE FROM inventory_catalog_items WHERE id=$1`, catalogID)
		}
	})
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
	franchise := requestJSON(r, http.MethodPost, "/api/v1/franchisees", fmt.Sprintf(`{"name":"แฟรนไชส์ทดสอบ","email":%q,"plan":"M","branchName":"สาขาแฟรนไชส์","branchCode":%q,"branchSize":"S","username":%q,"password":"Password123!"}`, franchiseEmail, franchiseBranchCode, franchiseUsername), testToken(t, "admin"))
	if franchise.Code != http.StatusCreated {
		t.Fatalf("create franchise = %d: %s", franchise.Code, franchise.Body.String())
	}
	var branchStatus, branchSize string
	var franchiseBranchID int64
	if err := db.QueryRow(`SELECT id,status,size FROM branches WHERE code=$1`, franchiseBranchCode).Scan(&franchiseBranchID, &branchStatus, &branchSize); err != nil || branchStatus != "inactive" || branchSize != "S" {
		t.Fatalf("franchise branch status/size = %q/%q, err = %v", branchStatus, branchSize, err)
	}
	var drinkStockCategory, postalStockCategory string
	var startingQuantity float64
	var startingExpiry sql.NullTime
	if err := db.QueryRow(`SELECT stock_category,quantity,expiry_date FROM inventory_items WHERE branch_id=$1 AND name=$2`, franchiseBranchID, fixtureCatalogNames[0]).Scan(&drinkStockCategory, &startingQuantity, &startingExpiry); err != nil || drinkStockCategory != "drink_equipment" {
		t.Fatalf("franchise drink stock category = %q, err = %v", drinkStockCategory, err)
	}
	if startingQuantity != 0 || startingExpiry.Valid {
		t.Fatalf("franchise template copied physical stock: quantity=%v expiry=%v", startingQuantity, startingExpiry)
	}
	if err := db.QueryRow(`SELECT stock_category FROM inventory_items WHERE branch_id=$1 AND name=$2`, franchiseBranchID, fixtureCatalogNames[1]).Scan(&postalStockCategory); err != nil || postalStockCategory != "postal_equipment" {
		t.Fatalf("franchise postal stock category = %q, err = %v", postalStockCategory, err)
	}
	if login := requestJSON(r, http.MethodPost, "/api/v1/auth/login", fmt.Sprintf(`{"username":%q,"password":"Password123!"}`, franchiseUsername), ""); login.Code != http.StatusForbidden {
		t.Fatalf("inactive franchise login = %d: %s", login.Code, login.Body.String())
	}
	franchiseID := responseID(t, franchise)
	if activation := requestJSON(r, http.MethodPatch, "/api/v1/franchisees/"+strconv.FormatInt(franchiseID, 10)+"/status", `{"status":"active"}`, testToken(t, "admin")); activation.Code != http.StatusOK {
		t.Fatalf("activate franchise = %d: %s", activation.Code, activation.Body.String())
	}
	if err := db.QueryRow(`SELECT status FROM branches WHERE code=$1`, franchiseBranchCode).Scan(&branchStatus); err != nil || branchStatus != "active" {
		t.Fatalf("activated franchise branch status = %q, err = %v", branchStatus, err)
	}
	franchiseToken := testTokenWithFranchise(t, "franchise_owner", franchiseBranchID, franchiseID)
	drinkStock := requestJSON(r, http.MethodGet, "/api/v1/inventory?kind=stock&stockCategory=drink_equipment", "", franchiseToken)
	if drinkStock.Code != http.StatusOK || !strings.Contains(drinkStock.Body.String(), fixtureCatalogNames[0]) {
		t.Fatalf("franchise drink stock = %d: %s", drinkStock.Code, drinkStock.Body.String())
	}
	postalStock := requestJSON(r, http.MethodGet, "/api/v1/inventory?kind=stock&stockCategory=postal_equipment", "", franchiseToken)
	if postalStock.Code != http.StatusOK || !strings.Contains(postalStock.Body.String(), fixtureCatalogNames[1]) {
		t.Fatalf("franchise postal stock = %d: %s", postalStock.Code, postalStock.Body.String())
	}
	if resized := requestJSON(r, http.MethodPatch, "/api/v1/branches/"+strconv.FormatInt(franchiseBranchID, 10)+"/size", `{"size":"M"}`, testToken(t, "admin")); resized.Code != http.StatusOK {
		t.Fatalf("resize franchise branch = %d: %s", resized.Code, resized.Body.String())
	}
	if err := db.QueryRow(`SELECT size FROM branches WHERE id=$1`, franchiseBranchID).Scan(&branchSize); err != nil || branchSize != "M" {
		t.Fatalf("resized franchise branch = %q, err = %v", branchSize, err)
	}
	if login := requestJSON(r, http.MethodPost, "/api/v1/auth/login", fmt.Sprintf(`{"username":%q,"password":"Password123!"}`, franchiseUsername), ""); login.Code != http.StatusOK {
		t.Fatalf("active franchise login = %d: %s", login.Code, login.Body.String())
	}
	companyBranches := requestJSON(r, http.MethodGet, "/api/v1/branches/sales?period=today", "", testToken(t, "admin"))
	if companyBranches.Code != http.StatusOK || !strings.Contains(companyBranches.Body.String(), "FRANCHISE-ADMIN") || strings.Contains(companyBranches.Body.String(), franchiseBranchCode) {
		t.Fatalf("company branch list must exclude franchise branches: %d %s", companyBranches.Code, companyBranches.Body.String())
	}
	if res := requestJSON(r, http.MethodPost, "/api/v1/franchisees", fmt.Sprintf(`{"name":"แฟรนไชส์ซ้ำ","email":%q,"plan":"M","branchName":"สาขาซ้ำ","branchCode":"FR-DUPLICATE-"}`, franchiseEmail), testToken(t, "admin")); res.Code != http.StatusConflict {
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
	if err := db.QueryRow(`INSERT INTO branches(name,code,latitude,longitude,attendance_radius_m) VALUES($1,$2,16.821085,100.2694448,100) RETURNING id`, "สาขา "+code, code).Scan(&id); err != nil {
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

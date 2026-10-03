package router

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestFranchiseMaintenanceUsesSignedTenantAndRejectsMismatchedOwnership(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	var ownerA, ownerB int64
	for i, target := range []*int64{&ownerA, &ownerB} {
		if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES($1,$2,'M','active') RETURNING id`, fmt.Sprintf("Audit owner %d", i), fmt.Sprintf("audit-owner-%d@example.com", i)).Scan(target); err != nil {
			t.Fatal(err)
		}
	}
	branchA, branchB := seedBranch(t, db, "MAINT-A"), seedBranch(t, db, "MAINT-B")
	for _, pair := range [][2]int64{{branchA, ownerA}, {branchB, ownerB}} {
		if _, err := db.Exec(`UPDATE branches SET franchisee_id=$1 WHERE id=$2`, pair[1], pair[0]); err != nil {
			t.Fatal(err)
		}
	}
	seedUser(t, db, 7, "maintenance-owner", "franchise_owner", branchA, nil)
	if _, err := db.Exec(`UPDATE users SET franchisee_id=$1 WHERE id=7`, ownerA); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO maintenance_tickets(branch_id,title,description,priority) VALUES($1,'Foreign secret','Private','normal')`, branchB); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testTokenWithFranchise(t, "franchise_owner", branchA, ownerA)
	created := requestJSON(r, http.MethodPost, "/api/v1/franchise/maintenance-tickets", fmt.Sprintf(`{"title":"  Own repair  ","description":"  Broken machine  ","branchId":%d,"branchCode":"MAINT-B"}`, branchB), token)
	if created.Code != http.StatusCreated {
		t.Fatalf("create=%d %s", created.Code, created.Body.String())
	}
	id := responseID(t, created)
	var actualBranch int64
	var title, description, priority string
	if err := db.QueryRow(`SELECT branch_id,title,description,priority FROM maintenance_tickets WHERE id=$1`, id).Scan(&actualBranch, &title, &description, &priority); err != nil {
		t.Fatal(err)
	}
	if actualBranch != branchA || title != "Own repair" || description != "Broken machine" || priority != "normal" {
		t.Fatalf("stored ticket=%d %q %q %q", actualBranch, title, description, priority)
	}
	listed := requestJSON(r, http.MethodGet, "/api/v1/franchise/maintenance-tickets?branchCode=MAINT-B", "", token)
	if listed.Code != http.StatusOK || !strings.Contains(listed.Body.String(), "Own repair") || strings.Contains(listed.Body.String(), "Foreign secret") {
		t.Fatalf("list=%d %s", listed.Code, listed.Body.String())
	}
	for _, body := range []string{`{"title":"  "}`, `{"title":"Repair","priority":"invalid"}`, `{"title":"Repair","dueAt":"2026-02-30"}`} {
		res := requestJSON(r, http.MethodPost, "/api/v1/franchise/maintenance-tickets", body, token)
		if res.Code != http.StatusBadRequest {
			t.Fatalf("invalid request=%d %s", res.Code, res.Body.String())
		}
	}
	for _, body := range []string{`{"title":"Unauthorized repair"}`} {
		res := requestJSON(r, http.MethodPost, "/api/v1/franchise/maintenance-tickets", body, testTokenWithFranchise(t, "franchise_owner", branchB, ownerA))
		if res.Code != http.StatusForbidden {
			t.Fatalf("mismatched tenant=%d %s", res.Code, res.Body.String())
		}
	}
	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM maintenance_tickets`).Scan(&total); err != nil {
		t.Fatal(err)
	}
	if total != 2 {
		t.Fatalf("invalid requests wrote tickets: count=%d", total)
	}
}

func TestStockCountAcceptsZeroButRejectsMissingAndNegativeQuantity(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	for _, tc := range []struct {
		name, body string
		status     int
		quantity   float64
	}{
		{"zero means empty stock", `{"quantity":0,"note":"physical count"}`, http.StatusOK, 0},
		{"missing quantity is not zero", `{"note":"physical count"}`, http.StatusBadRequest, 5},
		{"null quantity is not zero", `{"quantity":null,"note":"physical count"}`, http.StatusBadRequest, 5},
		{"negative count", `{"quantity":-1,"note":"physical count"}`, http.StatusBadRequest, 5},
		{"fractional count", `{"quantity":0.5,"note":"physical count"}`, http.StatusOK, 0.5},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := openRouterTestDB(t, url)
			branch := seedBranch(t, db, "AUDIT-COUNT")
			seedUser(t, db, 7, "count-staff", "cashier", branch, nil)
			item := seedInventory(t, db, branch, "Counted stock", 5)
			res := requestJSON(New(db, nil), http.MethodPost, fmt.Sprintf("/api/v1/inventory/%d/adjust", item), tc.body, testTokenWithBranch(t, "cashier", branch))
			if res.Code != tc.status {
				t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
			}
			assertInventoryQuantity(t, db, item, tc.quantity)
			var movements int
			if err := db.QueryRow(`SELECT COUNT(*) FROM stock_movements`).Scan(&movements); err != nil {
				t.Fatal(err)
			}
			want := 0
			if tc.status == http.StatusOK {
				want = 1
			}
			if movements != want {
				t.Fatalf("movements=%d want=%d", movements, want)
			}
			if want == 1 {
				var before, after, delta float64
				if err := db.QueryRow(`SELECT quantity_before,quantity_after,quantity_delta FROM stock_movements`).Scan(&before, &after, &delta); err != nil {
					t.Fatal(err)
				}
				if before != 5 || after != tc.quantity || delta != tc.quantity-5 {
					t.Fatalf("movement=%v,%v,%v", before, after, delta)
				}
			}
		})
	}
}

func TestStockAdjustmentRollsBackWhenMovementPersistenceFails(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-ROLLBACK")
	seedUser(t, db, 7, "count-rollback", "cashier", branch, nil)
	item := seedInventory(t, db, branch, "Ingredient", 5)
	// Inject a real PostgreSQL write failure after the inventory UPDATE. The
	// transaction must undo that UPDATE, not leave an unauditable balance.
	if _, err := db.Exec(`CREATE FUNCTION audit_reject_movement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit injected persistence failure'; END $$`); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := db.Exec(`DROP FUNCTION audit_reject_movement() CASCADE`); err != nil {
			t.Error(err)
		}
	}()
	if _, err := db.Exec(`CREATE TRIGGER audit_reject_movement BEFORE INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION audit_reject_movement()`); err != nil {
		t.Fatal(err)
	}
	res := requestJSON(New(db, nil), http.MethodPost, fmt.Sprintf("/api/v1/inventory/%d/adjust", item), `{"quantity":2,"note":"physical count"}`, testTokenWithBranch(t, "cashier", branch))
	if res.Code != http.StatusInternalServerError {
		t.Fatalf("status=%d %s", res.Code, res.Body.String())
	}
	assertInventoryQuantity(t, db, item, 5)
	for _, table := range []string{"stock_movements", "audit_events"} {
		var count int
		if err := db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 0 {
			t.Fatalf("%s contains %d partial writes", table, count)
		}
	}
}

func TestStockRequestTransitionsAreAtomicAndTerminal(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	allowed := map[string]map[string]bool{
		"pending":  {"approved": true, "preparing": true, "rejected": true},
		"approved": {"preparing": true}, "preparing": {"completed": true},
	}
	for _, from := range []string{"pending", "approved", "preparing", "completed", "rejected"} {
		for _, to := range []string{"approved", "preparing", "completed", "rejected"} {
			t.Run(from+" to "+to, func(t *testing.T) {
				db := openRouterTestDB(t, url)
				branch := seedBranch(t, db, "AUDIT-TRANSITION")
				seedUser(t, db, 7, "transition-admin", "admin", branch, nil)
				inventory := seedInventory(t, db, branch, "Ingredient", 5)
				var id int64
				if err := db.QueryRow(`INSERT INTO stock_requests(branch_id,status,requested_by) VALUES($1,$2,7) RETURNING id`, branch, from).Scan(&id); err != nil {
					t.Fatal(err)
				}
				if _, err := db.Exec(`INSERT INTO stock_request_items(stock_request_id,inventory_item_id,item_name,quantity,unit) VALUES($1,$2,'Ingredient',2,'กรัม')`, id, inventory); err != nil {
					t.Fatal(err)
				}
				res := requestJSON(New(db, nil), http.MethodPatch, fmt.Sprintf("/api/v1/stock-requests/%d/status", id), fmt.Sprintf(`{"status":%q}`, to), testToken(t, "admin"))
				wantStatus, wantQuantity, wantAudit, wantState := http.StatusConflict, 5.0, 0, from
				if allowed[from][to] {
					wantStatus, wantAudit, wantState = http.StatusOK, 1, to
					if to == "completed" {
						wantQuantity = 7
					}
				}
				if res.Code != wantStatus {
					t.Fatalf("status=%d want=%d body=%s", res.Code, wantStatus, res.Body.String())
				}
				assertInventoryQuantity(t, db, inventory, wantQuantity)
				var actualState string
				var audits int
				if err := db.QueryRow(`SELECT status FROM stock_requests WHERE id=$1`, id).Scan(&actualState); err != nil {
					t.Fatal(err)
				}
				if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE entity_type='stock_request' AND entity_id=$1`, id).Scan(&audits); err != nil {
					t.Fatal(err)
				}
				if actualState != wantState || audits != wantAudit {
					t.Fatalf("state=%s audits=%d", actualState, audits)
				}
			})
		}
	}
}

func TestStockRequestCreationRollsBackWhenALaterItemBelongsToAnotherBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-REQUEST-A")
	other := seedBranch(t, db, "AUDIT-REQUEST-B")
	seedUser(t, db, 7, "request-staff", "cashier", branch, nil)
	first := seedInventory(t, db, branch, "Allowed", 5)
	foreign := seedInventory(t, db, other, "Foreign", 5)
	body := fmt.Sprintf(`{"items":[{"inventoryItemId":%d,"name":"Allowed","quantity":2,"unit":"กรัม"},{"inventoryItemId":%d,"name":"Foreign","quantity":2,"unit":"กรัม"}]}`, first, foreign)
	res := requestJSON(New(db, nil), http.MethodPost, "/api/v1/stock-requests", body, testTokenWithBranch(t, "cashier", branch))
	if res.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
	}
	for _, table := range []string{"stock_requests", "stock_request_items", "audit_events"} {
		var count int
		if err := db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 0 {
			t.Fatalf("%s retains %d records after rollback", table, count)
		}
	}
	assertInventoryQuantity(t, db, first, 5)
	assertInventoryQuantity(t, db, foreign, 5)
}

func TestAdminMutationRoutesRejectNonAdminBeforeReadingOrWritingData(t *testing.T) {
	r := New(nil, nil)
	for _, route := range []struct{ method, path string }{
		{http.MethodPost, "/api/v1/company-documents"}, {http.MethodDelete, "/api/v1/company-documents/1"},
		{http.MethodPost, "/api/v1/suppliers"}, {http.MethodPatch, "/api/v1/suppliers/1"},
		{http.MethodPost, "/api/v1/purchase-orders"}, {http.MethodPost, "/api/v1/purchase-orders/1/receive"},
		{http.MethodPatch, "/api/v1/purchase-orders/1/status"}, {http.MethodPatch, "/api/v1/stock-requests/1/status"},
		{http.MethodPatch, "/api/v1/expense-requests/1/status"}, {http.MethodPost, "/api/v1/assets"},
		{http.MethodPatch, "/api/v1/assets/1"}, {http.MethodPost, "/api/v1/service-invoices"},
		{http.MethodPatch, "/api/v1/service-invoices/1/status"}, {http.MethodPatch, "/api/v1/franchisees/1/status"},
	} {
		for _, role := range []string{"cashier", "branch_manager", "franchise_owner"} {
			t.Run(route.method+route.path+role, func(t *testing.T) {
				res := requestJSON(r, route.method, route.path, `{}`, testToken(t, role))
				var body struct {
					Success bool
					Message string
				}
				if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if res.Code != http.StatusForbidden || body.Success || body.Message == "" {
					t.Fatalf("status=%d body=%s", res.Code, res.Body.String())
				}
			})
		}
	}
}

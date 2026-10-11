package router

import (
	"fmt"
	"net/http"
	"os"
	"testing"
)

func TestBranchPromotionMutationCannotChangeCampaignSharedWithAnotherBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	a := seedBranch(t, db, "PROMO-SCOPE-A")
	b := seedBranch(t, db, "PROMO-SCOPE-B")
	seedUser(t, db, 7, "promo-scope-admin", "admin", a, nil)
	seedUser(t, db, 8, "promo-scope-manager", "branch_manager", a, nil)
	var menu int64
	if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status,template_enabled) VALUES($1,'Scoped tea','beverage',55,60,20,'available',true) RETURNING id`, a).Scan(&menu); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	body := fmt.Sprintf(`{"name":"Shared","type":"Offer","benefit":"10 percent","status":"active","branchIds":[%d,%d],"menuItemIds":[%d]}`, a, b, menu)
	created := requestJSON(r, http.MethodPost, "/api/v1/promotions", body, testToken(t, "admin"))
	if created.Code != 201 {
		t.Fatalf("create %d %s", created.Code, created.Body.String())
	}
	id := responseID(t, created)
	path := fmt.Sprintf("/api/v1/promotions/%d", id)
	scoped := testTokenWithBranch(t, "branch_manager", a)
	update := fmt.Sprintf(`{"name":"Hijacked","type":"Offer","benefit":"Free","status":"active","branchIds":[%d],"menuItemIds":[%d]}`, a, menu)
	patched := requestJSON(r, http.MethodPatch, path, update, scoped)
	if patched.Code < 400 {
		t.Fatalf("manager changed a shared campaign: %d %s", patched.Code, patched.Body.String())
	}
	deleted := requestJSON(r, http.MethodDelete, path, "", scoped)
	if deleted.Code != http.StatusForbidden {
		t.Fatalf("manager deleted shared campaign: %d %s", deleted.Code, deleted.Body.String())
	}
	var name string
	var branches int
	if err := db.QueryRow(`SELECT p.name,COUNT(pb.branch_id) FROM promotions p JOIN promotion_branches pb ON pb.promotion_id=p.id WHERE p.id=$1 GROUP BY p.name`, id).Scan(&name, &branches); err != nil || name != "Shared" || branches != 2 {
		t.Fatalf("shared campaign changed: %q %d %v", name, branches, err)
	}
	// A branch may still manage its own single-branch campaign.
	if res := requestJSON(r, http.MethodPatch, path, update, testToken(t, "admin")); res.Code != http.StatusOK {
		t.Fatalf("admin narrowing campaign: %d %s", res.Code, res.Body.String())
	}
	if res := requestJSON(r, http.MethodPatch, path, update, scoped); res.Code != http.StatusOK {
		t.Fatalf("manager updating own campaign: %d %s", res.Code, res.Body.String())
	}
	if res := requestJSON(r, http.MethodDelete, path, "", testTokenWithBranch(t, "branch_manager", b)); res.Code != http.StatusForbidden {
		t.Fatalf("foreign branch deleted campaign: %d %s", res.Code, res.Body.String())
	}
	if res := requestJSON(r, http.MethodDelete, path, "", scoped); res.Code != http.StatusNoContent {
		t.Fatalf("manager deleting own campaign: %d %s", res.Code, res.Body.String())
	}
}

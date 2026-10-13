package router

import (
	"encoding/json"
	"fmt"
	"os"
	"testing"
)

func TestCatalogExceptionsAuditValidatesPersistsAndIsolatesBranches(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	a, b := seedBranch(t, db, "EXCEPTION-A"), seedBranch(t, db, "EXCEPTION-B")
	seedUser(t, db, 7, "exception-admin", "admin", a, nil)
	r := New(db, nil)
	token := testToken(t, "admin")
	var templateID int64
	if err := db.QueryRow(`SELECT id FROM catalog_templates WHERE scope='central' AND branch_size='ALL'`).Scan(&templateID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO branch_catalog_template_assignments(branch_id,template_id) VALUES($1,$2)`, a, templateID); err != nil {
		t.Fatal(err)
	}
	impact := requestJSON(r, "GET", fmt.Sprintf("/api/v1/catalog-templates/%d/impact", templateID), "", token)
	var impactEnvelope struct {
		Success bool `json:"success"`
		Data    struct {
			Count    int `json:"count"`
			Branches []struct {
				ID int64 `json:"id"`
			} `json:"branches"`
		} `json:"data"`
	}
	if err := json.Unmarshal(impact.Body.Bytes(), &impactEnvelope); err != nil || impact.Code != 200 || !impactEnvelope.Success || impactEnvelope.Data.Count != 1 || len(impactEnvelope.Data.Branches) != 1 || impactEnvelope.Data.Branches[0].ID != a {
		t.Fatalf("template impact includes unassigned branches: %d %s %v", impact.Code, impact.Body.String(), err)
	}
	path := fmt.Sprintf("/api/v1/branches/%d/catalog-template-exceptions", a)
	for _, body := range []string{`{}`, `{"entityType":"other","sourceKey":1}`, `{"entityType":"menu","sourceKey":0}`, `{"entityType":"menu","sourceKey":-1}`} {
		res := requestJSON(r, "PUT", path, body, token)
		if res.Code != 400 {
			t.Fatalf("invalid exception accepted: %d %s", res.Code, res.Body.String())
		}
	}
	for _, role := range []string{"cashier", "franchise_owner"} {
		res := requestJSON(r, "PUT", path, `{"entityType":"menu","sourceKey":19}`, testTokenWithBranch(t, role, a))
		if res.Code != 403 {
			t.Fatalf("%s can mutate central exceptions: %d", role, res.Code)
		}
	}
	for _, reason := range []string{" first ", " updated "} {
		res := requestJSON(r, "PUT", path, fmt.Sprintf(`{"entityType":"menu","sourceKey":19,"reason":%q}`, reason), token)
		if res.Code != 200 {
			t.Fatalf("exception save failed: %d %s", res.Code, res.Body.String())
		}
	}
	var count int
	var reason string
	if err := db.QueryRow(`SELECT COUNT(*),MAX(reason) FROM branch_catalog_template_exceptions WHERE branch_id=$1`, a).Scan(&count, &reason); err != nil || count != 1 || reason != "updated" {
		t.Fatalf("upsert/trim wrong %d %q %v", count, reason, err)
	}
	for _, fixture := range []struct {
		branch int64
		count  int
	}{{a, 1}, {b, 0}} {
		res := requestJSON(r, "GET", fmt.Sprintf("/api/v1/branches/%d/catalog-template-exceptions", fixture.branch), "", token)
		var envelope struct {
			Success bool `json:"success"`
			Data    []struct {
				SourceKey int64  `json:"sourceKey"`
				Reason    string `json:"reason"`
			} `json:"data"`
		}
		if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil || res.Code != 200 || !envelope.Success || len(envelope.Data) != fixture.count {
			t.Fatalf("branch exceptions leaked: %s %v", res.Body.String(), err)
		}
		if fixture.count == 1 && (envelope.Data[0].SourceKey != 19 || envelope.Data[0].Reason != "updated") {
			t.Fatalf("wrong exception %s", res.Body.String())
		}
	}
	for _, invalid := range []string{"other/19", "menu/0", "menu/invalid"} {
		if res := requestJSON(r, "DELETE", path+"/"+invalid, "", token); res.Code != 400 {
			t.Fatalf("invalid delete accepted %d", res.Code)
		}
	}
	for _, expected := range []bool{true, false} {
		res := requestJSON(r, "DELETE", path+"/menu/19", "", token)
		var envelope struct {
			Success bool `json:"success"`
			Data    struct {
				Deleted bool `json:"deleted"`
			} `json:"data"`
		}
		if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil || res.Code != 200 || !envelope.Success || envelope.Data.Deleted != expected {
			t.Fatalf("delete transition wrong %s %v", res.Body.String(), err)
		}
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM branch_catalog_template_exceptions`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("exception not removed %d %v", count, err)
	}
}

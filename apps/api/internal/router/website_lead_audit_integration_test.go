package router

import (
	"net/http"
	"os"
	"testing"
)

func TestWebsiteLeadRejectsInvalidNormalizedInputWithoutPersisting(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	r := New(db, nil)
	for _, body := range []string{
		`{"name":"  ","phone":"0812345678"}`,
		`{"name":"Valid name","phone":"        "}`,
		`{"name":"Valid name","phone":"0812345678","email":"invalid"}`,
		`{"name":"Valid name","phone":"0812345678","topic":"admin"}`,
		`{"name":`,
	} {
		res := requestJSON(r, http.MethodPost, "/api/v1/website/leads", body, "")
		if res.Code != http.StatusBadRequest {
			t.Fatalf("invalid lead accepted: %d %s", res.Code, res.Body.String())
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM website_leads`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("invalid input persisted %d rows: %v", count, err)
	}
}

func TestWebsiteLeadInboxIsAdminOnlyAndPersistsNormalizedPublicSubmission(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "LEAD-AUDIT")
	seedUser(t, db, 7, "lead-audit-admin", "admin", branch, nil)
	r := New(db, nil)
	res := requestJSON(r, http.MethodPost, "/api/v1/website/leads", `{"name":"  Interested customer  ","phone":" 0812345678 ","message":"  Enquiry  "}`, "")
	if res.Code != http.StatusCreated {
		t.Fatalf("create %d %s", res.Code, res.Body.String())
	}
	var name, phone, topic, message string
	if err := db.QueryRow(`SELECT name,phone,topic,message FROM website_leads WHERE id=$1`, responseID(t, res)).Scan(&name, &phone, &topic, &message); err != nil || name != "Interested customer" || phone != "0812345678" || topic != "franchise" || message != "Enquiry" {
		t.Fatalf("normalized lead %q %q %q %q: %v", name, phone, topic, message, err)
	}
	for _, role := range []string{"", "cashier", "branch_manager", "franchise_owner"} {
		token := ""
		want := http.StatusUnauthorized
		if role != "" {
			token = testToken(t, role)
			want = http.StatusForbidden
		}
		for _, req := range []struct{ method, path, body string }{
			{http.MethodGet, "/api/v1/website/leads", ""},
			{http.MethodPatch, "/api/v1/website/leads/1/status", `{"status":"closed"}`},
		} {
			res := requestJSON(r, req.method, req.path, req.body, token)
			if res.Code != want {
				t.Fatalf("role %q %s returned %d, want %d", role, req.path, res.Code, want)
			}
		}
	}
	res = requestJSON(r, http.MethodGet, "/api/v1/website/leads", "", testToken(t, "admin"))
	if res.Code != http.StatusOK {
		t.Fatalf("admin inbox %d %s", res.Code, res.Body.String())
	}
	var status string
	if err := db.QueryRow(`SELECT status FROM website_leads LIMIT 1`).Scan(&status); err != nil || status != "new" {
		t.Fatalf("unauthorized mutation changed status %q %v", status, err)
	}
}

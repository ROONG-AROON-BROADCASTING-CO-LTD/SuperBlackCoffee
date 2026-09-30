package router

import (
	"net/http"
	"os"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestFranchiseAccountSettingsAndPasswordStayWithinSignedInTenant(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var franchiseA, franchiseB, branchA, branchB int64
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Account Franchise A','account-a@example.com','S','active') RETURNING id`).Scan(&franchiseA); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Account Franchise B','account-b@example.com','M','active') RETURNING id`).Scan(&franchiseB); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,size,status) VALUES($1,'Account Branch A','ACC-A','S','active') RETURNING id`, franchiseA).Scan(&branchA); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(franchisee_id,name,code,size,status) VALUES($1,'Account Branch B','ACC-B','M','active') RETURNING id`, franchiseB).Scan(&branchB); err != nil {
		t.Fatal(err)
	}
	oldHash, err := bcrypt.GenerateFromPassword([]byte("Original123!"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,franchisee_id,branch_id) VALUES
		(7,'Owner A','account-a','owner-a@example.com',$1,'franchise_owner',$2,$3),
		(8,'Owner B','account-b','owner-b@example.com',$1,'franchise_owner',$4,$5)`, string(oldHash), franchiseA, branchA, franchiseB, branchB); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testTokenWithFranchise(t, "franchise_owner", branchA, franchiseA)

	settings := requestJSON(r, http.MethodGet, "/api/v1/franchise/account-settings?branchId=999", "", token)
	if settings.Code != http.StatusOK || !strings.Contains(settings.Body.String(), `"branchCode":"ACC-A"`) || strings.Contains(settings.Body.String(), "ACC-B") {
		t.Fatalf("scoped settings = %d: %s", settings.Code, settings.Body.String())
	}
	wrong := requestJSON(r, http.MethodPatch, "/api/v1/franchise/account-settings/password", `{"currentPassword":"wrong","newPassword":"Replacement123!"}`, token)
	if wrong.Code != http.StatusBadRequest {
		t.Fatalf("incorrect current password = %d: %s", wrong.Code, wrong.Body.String())
	}
	updated := requestJSON(r, http.MethodPatch, "/api/v1/franchise/account-settings/password?branchId=999", `{"currentPassword":"Original123!","newPassword":"Replacement123!"}`, token)
	if updated.Code != http.StatusOK {
		t.Fatalf("own password update = %d: %s", updated.Code, updated.Body.String())
	}
	for _, tc := range []struct {
		userID  int64
		wantNew bool
	}{{7, true}, {8, false}} {
		var hash string
		if err := db.QueryRow(`SELECT password_hash FROM users WHERE id=$1`, tc.userID).Scan(&hash); err != nil {
			t.Fatal(err)
		}
		matchesNew := bcrypt.CompareHashAndPassword([]byte(hash), []byte("Replacement123!")) == nil
		if matchesNew != tc.wantNew {
			t.Fatalf("user %d new password match = %t, want %t", tc.userID, matchesNew, tc.wantNew)
		}
	}
}

package router

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"
)

func TestStaffPolicyAuditRejectsCrossFranchiseDayOffSourcesAndInvalidDates(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required for isolated PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	var franchiseA, franchiseB, branchA, branchB int64
	for _, tt := range []struct {
		name string
		id   *int64
	}{{"Policy A", &franchiseA}, {"Policy B", &franchiseB}} {
		if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES($1,$2,'M','active') RETURNING id`, tt.name, tt.name+"@example.test").Scan(tt.id); err != nil {
			t.Fatal(err)
		}
	}
	for _, tt := range []struct {
		code      string
		franchise int64
		id        *int64
	}{{"POLICY-A", franchiseA, &branchA}, {"POLICY-B", franchiseB, &branchB}} {
		if err := db.QueryRow(`INSERT INTO branches(name,code,franchisee_id) VALUES($1,$1,$2) RETURNING id`, tt.code, tt.franchise).Scan(tt.id); err != nil {
			t.Fatal(err)
		}
	}
	company := seedBranch(t, db, "POLICY-COMPANY")
	seedUser(t, db, 7, "policy-owner", "franchise_owner", branchA, nil)
	if _, err := db.Exec(`UPDATE users SET franchisee_id=$1 WHERE id=7`, franchiseA); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testTokenWithFranchise(t, "franchise_owner", branchA, franchiseA)
	for _, tt := range []struct{ name, extra string }{
		{"foreign franchise day-off source", fmt.Sprintf(`"dayOffPolicy":"home_branch","dayOffSourceBranchId":%d`, branchB)},
		{"company day-off source", fmt.Sprintf(`"dayOffPolicy":"home_branch","dayOffSourceBranchId":%d`, company)},
		{"missing custom days", `"dayOffPolicy":"custom"`},
		{"duplicate custom date", `"dayOffPolicy":"custom","customDaysOff":["2099-01-01","2099-01-01"]`},
		{"invalid leap day", `"dayOffPolicy":"custom","customDaysOff":["2099-02-29"]`},
		{"weekly day outside range", `"dayOffPolicy":"custom","weeklyDaysOff":[8]`},
		{"duplicate weekday", `"dayOffPolicy":"custom","weeklyDaysOff":[1,1]`},
	} {
		t.Run(tt.name, func(t *testing.T) {
			body := fmt.Sprintf(`{"name":"Policy employee","username":"policy-new","password":"Password123!","role":"cashier","branchId":%d,"defaultStartsAt":"08:00","defaultEndsAt":"17:00",%s}`, branchA, tt.extra)
			res := requestJSON(r, "POST", "/api/v1/users", body, token)
			if res.Code != 400 {
				t.Fatalf("invalid policy status %d: %s", res.Code, res.Body.String())
			}
			message := "การตั้งค่าวันหยุดไม่ถูกต้อง"
			if strings.Contains(tt.name, "day-off source") {
				message = "ไม่พบสาขาอ้างอิงวันหยุด"
			}
			if !strings.Contains(res.Body.String(), message) {
				t.Fatalf("wrong validation path: %s", res.Body.String())
			}
			var count int
			if err := db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count); err != nil || count != 1 {
				t.Fatalf("rejected policy persisted staff count=%d err=%v", count, err)
			}
		})
	}
	body := fmt.Sprintf(`{"name":" Policy employee ","username":"policy-new","password":"Password123!","role":"cashier","branchId":%d,"defaultStartsAt":"08:00","defaultEndsAt":"17:00","dayOffPolicy":"home_branch","dayOffSourceBranchId":%d}`, branchA, branchA)
	res := requestJSON(r, "POST", "/api/v1/users", body, token)
	if res.Code != 201 {
		t.Fatalf("own franchise policy rejected %d: %s", res.Code, res.Body.String())
	}
	id := responseID(t, res)
	var source, franchise int64
	var name, department, jobTitle string
	if err := db.QueryRow(`SELECT name,department,job_title,franchisee_id,day_off_source_branch_id FROM users WHERE id=$1`, id).Scan(&name, &department, &jobTitle, &franchise, &source); err != nil || source != branchA || franchise != franchiseA || name != "Policy employee" || department != "cafe" || jobTitle != "แคชเชียร์" {
		t.Fatalf("created staff scope/defaults wrong: %q %q %q %d %d %v", name, department, jobTitle, franchise, source, err)
	}
	seedUser(t, db, 50, "foreign-staff", "cashier", branchB, nil)
	seedUser(t, db, 51, "company-staff", "cashier", company, nil)
	if _, err := db.Exec(`UPDATE users SET franchisee_id=$1 WHERE id=50`, franchiseB); err != nil {
		t.Fatal(err)
	}
	for _, fixture := range []struct {
		token    string
		expected int64
	}{{token, id}, {testToken(t, "admin"), 51}} {
		res := requestJSON(r, "GET", fmt.Sprintf("/api/v1/users?branchId=%d", branchB), "", fixture.token)
		var envelope struct {
			Success bool `json:"success"`
			Data    []struct {
				ID int64 `json:"id"`
			} `json:"data"`
		}
		if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil || res.Code != 200 || !envelope.Success || len(envelope.Data) != 1 || envelope.Data[0].ID != fixture.expected {
			t.Fatalf("staff directory leaked across workspaces: %d %s %v", res.Code, res.Body.String(), err)
		}
		if strings.Contains(res.Body.String(), "password") {
			t.Fatalf("staff directory exposed password field: %s", res.Body.String())
		}
	}
}

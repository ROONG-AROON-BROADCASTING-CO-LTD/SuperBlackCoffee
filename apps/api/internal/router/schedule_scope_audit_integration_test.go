package router

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"testing"
)

func TestScheduleAuditFranchiseCannotReadUpdateDeleteExportOrReplaceForeignStaff(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	var owners, branches [2]int64
	for i := range owners {
		if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES($1,$2,'M','active') RETURNING id`, fmt.Sprintf("Audit tenant %d", i), fmt.Sprintf("audit-%d@example.test", i)).Scan(&owners[i]); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow(`INSERT INTO branches(name,code,franchisee_id) VALUES($1,$2,$3) RETURNING id`, fmt.Sprintf("Audit branch %d", i), fmt.Sprintf("AUDIT-SCOPE-%d", i), owners[i]).Scan(&branches[i]); err != nil {
			t.Fatal(err)
		}
	}
	seedUser(t, db, 7, "schedule-owner", "franchise_owner", branches[0], nil)
	if _, err := db.Exec(`UPDATE users SET franchisee_id=$1 WHERE id=7`, owners[0]); err != nil {
		t.Fatal(err)
	}
	for i, branch := range branches {
		if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,branch_id,franchisee_id,department) VALUES($1,$2,$2,$3,'hash','cashier',$4,$5,'postal')`, 8+i, fmt.Sprintf("scope-staff-%d", i), fmt.Sprintf("scope-staff-%d@example.test", i), branch, owners[i]); err != nil {
			t.Fatal(err)
		}
	}
	var ownShift, foreignShift int64
	for i, output := range []*int64{&ownShift, &foreignShift} {
		if err := db.QueryRow(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,'2099-11-03','10:00','19:00','scheduled') RETURNING id`, 8+i, branches[i]).Scan(output); err != nil {
			t.Fatal(err)
		}
	}
	r := New(db, nil)
	token := testTokenWithFranchise(t, "franchise_owner", branches[0], owners[0])
	listed := requestJSON(r, http.MethodGet, fmt.Sprintf("/api/v1/staff-schedules?month=2099-11&branchId=%d", branches[1]), "", token)
	var envelope struct {
		Success bool `json:"success"`
		Data    []struct {
			UserID     int64  `json:"userId"`
			Department string `json:"department"`
			Override   bool   `json:"isTimeOverride"`
		} `json:"data"`
	}
	if err := json.Unmarshal(listed.Body.Bytes(), &envelope); err != nil || listed.Code != 200 || !envelope.Success || len(envelope.Data) != 1 || envelope.Data[0].UserID != 8 || envelope.Data[0].Department != "postal" {
		t.Fatalf("tenant read isolation: %d %s %v", listed.Code, listed.Body.String(), err)
	}
	for _, tc := range []struct {
		name, method, path, body string
		want                     int
	}{
		{"foreign employee edit", "PATCH", "/api/v1/users/9", fmt.Sprintf(`{"name":"intruder","role":"cashier","branchId":%d,"defaultStartsAt":"09:00","defaultEndsAt":"18:00"}`, branches[0]), 404},
		{"foreign employee delete", "DELETE", "/api/v1/users/9", "", 404},
		{"foreign shift edit", "PATCH", fmt.Sprintf("/api/v1/staff-schedules/%d", foreignShift), `{"startsAt":"11:00","endsAt":"20:00"}`, 404},
		{"own shift moved outside branch", "PATCH", fmt.Sprintf("/api/v1/staff-schedules/%d", ownShift), fmt.Sprintf(`{"branchId":%d}`, branches[1]), 403},
		{"foreign schedule export", "GET", fmt.Sprintf("/api/v1/staff-schedules/export?month=2099-11&branchId=%d", branches[1]), "", 403},
		{"foreign replacement source", "POST", fmt.Sprintf("/api/v1/staff-schedules/%d/replace", ownShift), fmt.Sprintf(`{"sourceShiftId":%d}`, foreignShift), 400},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result := requestJSON(r, tc.method, tc.path, tc.body, token)
			if result.Code != tc.want {
				t.Fatalf("got %d want %d: %s", result.Code, tc.want, result.Body.String())
			}
		})
	}
	var name, status, start string
	if err := db.QueryRow(`SELECT u.name,s.status,s.starts_at::text FROM users u JOIN staff_shifts s ON s.user_id=u.id WHERE s.id=$1`, foreignShift).Scan(&name, &status, &start); err != nil || name != "scope-staff-1" || status != "scheduled" || start != "10:00:00" {
		t.Fatalf("foreign data was mutated: %s %s %s %v", name, status, start, err)
	}
	// Managers must also be unable to read another tenant's medical evidence.
	var leaveIDs, attachmentIDs [2]int64
	for i := range leaveIDs {
		if err := db.QueryRow(`INSERT INTO staff_leave_requests(user_id,branch_id,leave_date,leave_type,reason) VALUES($1,$2,'2099-11-03','sick','private medical evidence') RETURNING id`, 8+i, branches[i]).Scan(&leaveIDs[i]); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow(`INSERT INTO staff_leave_request_attachments(leave_request_id,original_name,content_type,size_bytes,content) VALUES($1,'medical.pdf','application/pdf',8,$2) RETURNING id`, leaveIDs[i], []byte("%PDF-own")).Scan(&attachmentIDs[i]); err != nil {
			t.Fatal(err)
		}
	}
	for i := range leaveIDs {
		want := 200
		if i == 1 {
			want = 404
		}
		for _, path := range []string{
			fmt.Sprintf("/api/v1/attendance/leave-requests/%d/attachments/%d/content", leaveIDs[i], attachmentIDs[i]),
			fmt.Sprintf("/api/v1/attendance/leave-requests/%d/manager-pdf", leaveIDs[i]),
		} {
			res := requestJSON(r, "GET", path, "", token)
			if res.Code != want {
				t.Fatalf("tenant document %s: %d want %d: %s", path, res.Code, want, res.Body.String())
			}
		}
	}
}

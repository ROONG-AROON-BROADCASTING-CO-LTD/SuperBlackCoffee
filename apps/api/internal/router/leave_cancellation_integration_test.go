package router

import (
	"fmt"
	"net/http"
	"os"
	"testing"
)

func TestLeaveCancellationRequiresPendingRequestOwnership(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL is required for isolated PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "LEAVE-CANCEL")
	seedUser(t, db, 7, "leave-owner", "cashier", branch, nil)
	seedUser(t, db, 8, "leave-other", "cashier", branch, nil)
	r := New(db, nil)
	cookie := &http.Cookie{Name: "sbc_attendance_session", Value: testTokenWithBranch(t, "cashier", branch)}
	for _, tc := range []struct {
		name, status string
		user         int64
		want         int
	}{
		{"own pending", "pending", 7, http.StatusOK},
		{"own approved", "approved", 7, http.StatusConflict},
		{"own rejected", "rejected", 7, http.StatusConflict},
		{"other employee pending", "pending", 8, http.StatusConflict},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var id int64
			if err := db.QueryRow(`INSERT INTO staff_leave_requests(user_id,branch_id,leave_date,leave_type,reason,status) VALUES($1,$2,'2099-01-01','personal','Cancellation audit',$3) RETURNING id`, tc.user, branch, tc.status).Scan(&id); err != nil {
				t.Fatal(err)
			}
			if _, err := db.Exec(`INSERT INTO staff_leave_request_attachments(leave_request_id,original_name,content_type,size_bytes,content) VALUES($1,'evidence.pdf','application/pdf',1,$2)`, id, []byte{1}); err != nil {
				t.Fatal(err)
			}
			response := requestJSONWithCookie(r, http.MethodDelete, fmt.Sprintf("/api/v1/attendance/leave-requests/%d", id), "", cookie)
			if response.Code != tc.want {
				t.Fatalf("status=%d body=%s want=%d", response.Code, response.Body.String(), tc.want)
			}
			var count int
			if err := db.QueryRow(`SELECT COUNT(*) FROM staff_leave_requests WHERE id=$1`, id).Scan(&count); err != nil {
				t.Fatal(err)
			}
			wantCount := 1
			if tc.want == http.StatusOK {
				wantCount = 0
			}
			if count != wantCount {
				t.Fatalf("persisted requests=%d want=%d", count, wantCount)
			}
			if err := db.QueryRow(`SELECT COUNT(*) FROM staff_leave_request_attachments WHERE leave_request_id=$1`, id).Scan(&count); err != nil || count != wantCount {
				t.Fatalf("attachment cascade/retention count=%d want=%d err=%v", count, wantCount, err)
			}
			if tc.want != http.StatusOK {
				var status string
				if err := db.QueryRow(`SELECT status FROM staff_leave_requests WHERE id=$1`, id).Scan(&status); err != nil || status != tc.status {
					t.Fatalf("status changed to %q err=%v", status, err)
				}
			} else {
				repeated := requestJSONWithCookie(r, http.MethodDelete, fmt.Sprintf("/api/v1/attendance/leave-requests/%d", id), "", cookie)
				if repeated.Code != http.StatusConflict {
					t.Fatalf("repeat cancellation=%d", repeated.Code)
				}
			}
		})
	}
}

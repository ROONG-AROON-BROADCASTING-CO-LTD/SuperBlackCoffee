package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
	"y/internal/model"
)

func TestAuditDefaultShiftJSONUsesArraysForUnassignedWeekdays(t *testing.T) {
	for _, patterns := range [][]model.DefaultShift{nil, {{StartsAt: "09:00", EndsAt: "18:00"}, {StartsAt: "13:00", EndsAt: "22:00"}}} {
		_, encoded, valid := normalizedDefaultShifts(patterns, "09:00", "18:00", "", "", nil)
		if !valid {
			t.Fatal("valid optional shifts rejected")
		}
		var decoded []map[string]json.RawMessage
		if err := json.Unmarshal([]byte(encoded), &decoded); err != nil {
			t.Fatal(err)
		}
		for _, pattern := range decoded {
			if string(pattern["weekdays"]) != "[]" {
				t.Fatalf("unassigned weekdays must serialize as [], got %s", encoded)
			}
		}
	}
}

// These fixtures only use TEST_DATABASE_URL and are removed after each test.
func auditScheduleBranch(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES('Schedule audit',$1) RETURNING id`, fmt.Sprintf("AUDIT-%d", time.Now().UnixNano())).Scan(&id); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE branch_id=$1`, id)
		_, _ = db.Exec(`DELETE FROM users WHERE branch_id=$1`, id)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, id)
	})
	return id
}

func auditScheduleStaff(t *testing.T, db *sql.DB, branchID int64, department, shifts string) int64 {
	t.Helper()
	var id int64
	username := fmt.Sprintf("schedule-audit-%d", time.Now().UnixNano())
	err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,department,default_starts_at,default_ends_at,default_shifts,day_off_policy,weekly_days_off) VALUES($1,$1,$2,'hash','cashier',$3,$4,'09:00','18:00',$5::jsonb,'custom','{1}') RETURNING id`, username, username+"@example.test", branchID, department, shifts).Scan(&id)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func auditScheduleRequest(h *PlatformHandler, action func(*gin.Context), method, body, id string) *httptest.ResponseRecorder {
	response := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(response)
	c.Request = httptest.NewRequest(method, "/", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("claims", &middleware.Claims{Role: "admin"})
	c.Params = gin.Params{{Key: "id", Value: id}}
	action(c)
	return response
}

func TestAuditPostalGenerationUsesDepartmentHoursAndPreservesDailyOverride(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	branch := auditScheduleBranch(t, db)
	patterns := `[{"startsAt":"09:00","endsAt":"18:00","weekdays":[]},{"startsAt":"10:00","endsAt":"19:00","weekdays":[6,7]}]`
	users := []int64{auditScheduleStaff(t, db, branch, "postal", patterns), auditScheduleStaff(t, db, branch, "postal", patterns)}
	syncedThaiHolidayYears.Store(2099, struct{}{})
	h := &PlatformHandler{db: db}
	generate := func() {
		r := auditScheduleRequest(h, h.GenerateStaffSchedules, http.MethodPost, fmt.Sprintf(`{"month":"2099-11","branchId":%d}`, branch), "")
		if r.Code != http.StatusCreated {
			t.Fatalf("generate: %d %s", r.Code, r.Body.String())
		}
	}
	generate()
	for _, user := range users {
		var incorrect int
		if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE user_id=$1 AND (starts_at <> CASE WHEN EXTRACT(ISODOW FROM shift_date) IN (6,7) THEN TIME '10:00' ELSE TIME '09:00' END OR ends_at <> CASE WHEN EXTRACT(ISODOW FROM shift_date) IN (6,7) THEN TIME '19:00' ELSE TIME '18:00' END)`, user).Scan(&incorrect); err != nil || incorrect != 0 {
			t.Fatalf("postal user %d has %d rows outside department hours: %v", user, incorrect, err)
		}
	}
	var shiftID int64
	if err := db.QueryRow(`SELECT id FROM staff_shifts WHERE user_id=$1 AND status='scheduled' ORDER BY shift_date LIMIT 1`, users[0]).Scan(&shiftID); err != nil {
		t.Fatal(err)
	}
	r := auditScheduleRequest(h, h.UpdateStaffShift, http.MethodPatch, `{"startsAt":"11:00","endsAt":"20:00"}`, strconv.FormatInt(shiftID, 10))
	if r.Code != http.StatusOK {
		t.Fatalf("override: %d %s", r.Code, r.Body.String())
	}
	generate()
	var start, end string
	var override bool
	if err := db.QueryRow(`SELECT starts_at::text,ends_at::text,is_time_override FROM staff_shifts WHERE id=$1`, shiftID).Scan(&start, &end, &override); err != nil || start != "11:00:00" || end != "20:00:00" || !override {
		t.Fatalf("override lost after regeneration: %s-%s override=%v err=%v", start, end, override, err)
	}
}

func TestAuditStaffShiftTimeValidationRejectsIncompleteOrMalformedOverrides(t *testing.T) {
	for _, body := range []string{`{"startsAt":"09:00"}`, `{"endsAt":"18:00"}`, `{"startsAt":"24:00","endsAt":"18:00"}`, `{"startsAt":"09:00","endsAt":"bad"}`, `{}`, `{`} {
		t.Run(body, func(t *testing.T) {
			h := &PlatformHandler{}
			r := auditScheduleRequest(h, h.UpdateStaffShift, http.MethodPatch, body, "1")
			if r.Code != http.StatusBadRequest || !strings.Contains(r.Body.String(), `"success":false`) {
				t.Fatalf("invalid input reached mutation: %d %s", r.Code, r.Body.String())
			}
		})
	}
}

func TestAuditGenerationRollsBackWhenFlexibleCoverageFails(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	branch := auditScheduleBranch(t, db)
	// Old rows can contain JSON null weekdays; this also exercises compatibility.
	auditScheduleStaff(t, db, branch, "cafe", `[{"startsAt":"09:00","endsAt":"18:00","weekdays":null},{"startsAt":"13:00","endsAt":"22:00","weekdays":null}]`)
	syncedThaiHolidayYears.Store(2099, struct{}{})
	function := fmt.Sprintf("audit_fail_cover_%d", branch)
	if _, err := db.Exec(fmt.Sprintf(`CREATE FUNCTION %s() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.branch_id=%d THEN RAISE EXCEPTION 'injected coverage update failure'; END IF; RETURN NEW; END $$`, function, branch)); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.Exec(fmt.Sprintf(`DROP FUNCTION %s() CASCADE`, function)); err != nil {
			t.Error(err)
		}
	})
	if _, err := db.Exec(fmt.Sprintf(`CREATE TRIGGER %s BEFORE UPDATE ON staff_shifts FOR EACH ROW EXECUTE FUNCTION %s()`, function, function)); err != nil {
		t.Fatal(err)
	}
	h := &PlatformHandler{db: db}
	r := auditScheduleRequest(h, h.GenerateStaffSchedules, http.MethodPost, fmt.Sprintf(`{"month":"2099-11","branchId":%d}`, branch), "")
	if r.Code != http.StatusInternalServerError {
		t.Fatalf("injected failure: %d %s", r.Code, r.Body.String())
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE branch_id=$1`, branch).Scan(&count); err != nil || count != 0 {
		t.Fatalf("failed generation retained %d rows: %v", count, err)
	}
}

func TestAuditReplaceShiftCannotCoverAnotherDepartmentAndRollsBackConflict(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	branch := auditScheduleBranch(t, db)
	cafe := auditScheduleStaff(t, db, branch, "cafe", `[]`)
	postal := auditScheduleStaff(t, db, branch, "postal", `[]`)
	h := &PlatformHandler{db: db}
	var source, target int64
	if err := db.QueryRow(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,'2099-11-02','09:00','18:00','scheduled') RETURNING id`, cafe, branch).Scan(&source); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,'2099-11-03','10:00','19:00','day_off') RETURNING id`, postal, branch).Scan(&target); err != nil {
		t.Fatal(err)
	}
	r := auditScheduleRequest(h, h.ReplaceStaffShift, http.MethodPost, fmt.Sprintf(`{"sourceShiftId":%d}`, source), strconv.FormatInt(target, 10))
	if r.Code != http.StatusBadRequest {
		t.Fatalf("cross-department replacement accepted: %d %s", r.Code, r.Body.String())
	}
	var user int64
	var status string
	if err := db.QueryRow(`SELECT user_id,status FROM staff_shifts WHERE id=$1`, target).Scan(&user, &status); err != nil || user != postal || status != "day_off" {
		t.Fatalf("target mutated: %d %s %v", user, status, err)
	}
	// Same department, but the source already has a row on the target date:
	// failure of the second UPDATE must roll back the first UPDATE as well.
	if _, err := db.Exec(`UPDATE users SET department='cafe' WHERE id=$1`, postal); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,'2099-11-03','09:00','18:00','scheduled')`, cafe, branch); err != nil {
		t.Fatal(err)
	}
	r = auditScheduleRequest(h, h.ReplaceStaffShift, http.MethodPost, fmt.Sprintf(`{"sourceShiftId":%d}`, source), strconv.FormatInt(target, 10))
	if r.Code != http.StatusConflict {
		t.Fatalf("duplicate target: %d %s", r.Code, r.Body.String())
	}
	if err := db.QueryRow(`SELECT status FROM staff_shifts WHERE id=$1`, source).Scan(&status); err != nil || status != "scheduled" {
		t.Fatalf("source not rolled back: %s %v", status, err)
	}
}

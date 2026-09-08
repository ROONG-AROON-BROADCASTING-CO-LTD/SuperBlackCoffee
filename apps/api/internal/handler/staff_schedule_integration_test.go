package handler

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/database"
	"y/internal/middleware"
)

func openStaffScheduleTestDB(t *testing.T) *sql.DB {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db, err := database.Open(context.Background(), url)
	if err != nil {
		t.Fatalf("เปิดฐานข้อมูลทดสอบ: %v", err)
	}
	if _, err := db.Exec(`SELECT setval(pg_get_serial_sequence('users','id'), GREATEST(COALESCE((SELECT MAX(id) FROM users), 1), 1), true)`); err != nil {
		_ = db.Close()
		t.Fatalf("ซิงก์ลำดับ user ในฐานข้อมูลทดสอบ: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func TestReconcileScheduledHolidayShiftsPreservesWorkedAndExplicitShifts(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	const (
		holidayDate = "2099-12-31"
		holidayName = "วันหยุดทดสอบ"
	)
	fixtureID := time.Now().UnixNano()

	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบวันหยุด-%d", fixtureID), fmt.Sprintf("HOLIDAY-TEST-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1`, holidayDate)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	if _, err := db.Exec(`INSERT INTO public_holidays(holiday_date,name) VALUES($1,$2)`, holidayDate, holidayName); err != nil {
		t.Fatalf("สร้างวันหยุดทดสอบ: %v", err)
	}
	userIDs := make([]int64, 4)
	for index := range userIDs {
		username := fmt.Sprintf("holiday-test-%d-%d", fixtureID, index)
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id) VALUES($1,$2,$3,'hash','cashier',$4) RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID).Scan(&userIDs[index]); err != nil {
			t.Fatalf("สร้างพนักงานทดสอบ %d: %v", index, err)
		}
	}
	statuses := []string{"scheduled", "compensatory_work", "scheduled", "leave"}
	for index, status := range statuses {
		if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status,leave_type) VALUES($1,$2,$3,'08:00','17:00',$4,NULL)`, userIDs[index], branchID, holidayDate, status); err != nil {
			t.Fatalf("สร้างกะทดสอบ %d: %v", index, err)
		}
	}
	if _, err := db.Exec(`INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES($1,$2,$3,now())`, userIDs[2], branchID, holidayDate); err != nil {
		t.Fatalf("สร้างการลงเวลาทดสอบ: %v", err)
	}

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	handler := &PlatformHandler{db: db}
	if err := handler.reconcileScheduledHolidayShifts(ctx, 2099); err != nil {
		t.Fatalf("reconcile scheduled holiday shifts: %v", err)
	}

	tests := []struct {
		name, wantStatus, wantLeaveType string
		userID                          int64
	}{
		{name: "unworked scheduled shift becomes day off", userID: userIDs[0], wantStatus: "day_off", wantLeaveType: holidayName},
		{name: "compensatory work remains explicit", userID: userIDs[1], wantStatus: "compensatory_work", wantLeaveType: ""},
		{name: "worked scheduled shift preserves history", userID: userIDs[2], wantStatus: "scheduled", wantLeaveType: ""},
		{name: "leave remains unchanged", userID: userIDs[3], wantStatus: "leave", wantLeaveType: ""},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var status, leaveType string
			if err := db.QueryRow(`SELECT status,COALESCE(leave_type,'') FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, test.userID, holidayDate).Scan(&status, &leaveType); err != nil {
				t.Fatalf("อ่านกะทดสอบ: %v", err)
			}
			if status != test.wantStatus || leaveType != test.wantLeaveType {
				t.Fatalf("กะ = (%q, %q), want (%q, %q)", status, leaveType, test.wantStatus, test.wantLeaveType)
			}
		})
	}
}

func TestScheduleCompensatoryWorkAfterHolidaysUsesFirstEligibleWorkday(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const holidayDate = "2099-12-20"

	var branchID, userID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบกะชดเชย-%d", fixtureID), fmt.Sprintf("COMP-TEST-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	username := fmt.Sprintf("compensatory-test-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id) VALUES($1,$2,$3,'hash','cashier',$4) RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID).Scan(&userID); err != nil {
		t.Fatalf("สร้างพนักงานทดสอบ: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1`, holidayDate)
		_, _ = db.Exec(`DELETE FROM staff_attendance WHERE user_id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
	if _, err := db.Exec(`INSERT INTO public_holidays(holiday_date,name) VALUES($1,'วันหยุดทดสอบ')`, holidayDate); err != nil {
		t.Fatalf("สร้างวันหยุดทดสอบ: %v", err)
	}

	month, err := time.Parse("2006-01", "2099-12")
	if err != nil {
		t.Fatal(err)
	}
	for day := 20; day <= 31; day++ {
		date := fmt.Sprintf("2099-12-%02d", day)
		if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,$3,'08:00','17:00','scheduled')`, userID, branchID, date); err != nil {
			t.Fatalf("สร้างกะทดสอบ %s: %v", date, err)
		}
	}

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", nil)
	handler := &PlatformHandler{db: db}
	if err := handler.scheduleCompensatoryWorkAfterHolidays(ctx, branchID, month, month.AddDate(0, 1, 0)); err != nil {
		t.Fatalf("จัดกะทำงานชดเชย: %v", err)
	}

	expectedDate := time.Date(2099, time.December, 21, 0, 0, 0, 0, time.UTC)

	var compensatoryDate string
	if err := db.QueryRow(`SELECT shift_date::text FROM staff_shifts WHERE user_id=$1 AND status='compensatory_work'`, userID).Scan(&compensatoryDate); err != nil {
		t.Fatalf("อ่านกะทำงานชดเชย: %v", err)
	}
	if compensatoryDate != expectedDate.Format("2006-01-02") {
		t.Fatalf("กะทำงานชดเชย = %s, want %s", compensatoryDate, expectedDate.Format("2006-01-02"))
	}
	var holidayStatus string
	if err := db.QueryRow(`SELECT status FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, holidayDate).Scan(&holidayStatus); err != nil {
		t.Fatal(err)
	}
	if holidayStatus != "scheduled" {
		t.Fatalf("วันนักขัตฤกษ์ต้องไม่ถูกเปลี่ยนเป็นกะชดเชย, got %s", holidayStatus)
	}
}

func TestGenerateStaffSchedulesGivesEveryEmployeeFourMonthlyDaysOff(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const holidayDate = "2099-12-10"

	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบโควตาวันหยุด-%d", fixtureID), fmt.Sprintf("QUOTA-TEST-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	userIDs := make([]int64, 2)
	for index := range userIDs {
		username := fmt.Sprintf("quota-test-%d-%d", fixtureID, index)
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00') RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID).Scan(&userIDs[index]); err != nil {
			t.Fatalf("สร้างพนักงานทดสอบ %d: %v", index, err)
		}
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1`, holidayDate)
		for _, userID := range userIDs {
			_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
			_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		}
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
	if _, err := db.Exec(`INSERT INTO public_holidays(holiday_date,name) VALUES($1,'วันหยุดทดสอบ')`, holidayDate); err != nil {
		t.Fatalf("สร้างวันหยุดทดสอบ: %v", err)
	}
	syncedThaiHolidayYears.Store(2099, struct{}{})

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"2099-12","branchId":%d}`, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
	if response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางอัตโนมัติ = %d: %s", response.Code, response.Body.String())
	}

	for _, userID := range userIDs {
		var monthlyDaysOff, totalDaysOff int
		if err := db.QueryRow(`SELECT COUNT(*) FILTER (WHERE leave_type='วันหยุดประจำเดือน'),COUNT(*) FILTER (WHERE status='day_off') FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-12-01' AND shift_date < '2100-01-01'`, userID).Scan(&monthlyDaysOff, &totalDaysOff); err != nil {
			t.Fatalf("อ่านโควตาวันหยุดของ %d: %v", userID, err)
		}
		if monthlyDaysOff != 4 || totalDaysOff != 5 {
			t.Fatalf("พนักงาน %d ได้วันหยุดรายเดือน=%d รวม=%d, ต้องการ 4 และ 5 (รวมวันนักขัตฤกษ์)", userID, monthlyDaysOff, totalDaysOff)
		}
	}
	var sharedMonthlyDayOffs int
	if err := db.QueryRow(`SELECT COUNT(*) FROM (SELECT shift_date FROM staff_shifts WHERE branch_id=$1 AND leave_type='วันหยุดประจำเดือน' GROUP BY shift_date HAVING COUNT(*) > 1) overlapping_days`, branchID).Scan(&sharedMonthlyDayOffs); err != nil {
		t.Fatalf("ตรวจสอบวันหยุดที่ชนกัน: %v", err)
	}
	if sharedMonthlyDayOffs != 0 {
		t.Fatalf("พบวันหยุดประจำเดือนซ้อนกัน %d วัน", sharedMonthlyDayOffs)
	}
}

func TestUpdateStaffMemberUpdatesUpcomingUnworkedScheduledShifts(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()

	var branchID, userID int64
	branchCode := fmt.Sprintf("HOURS-TEST-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบเวลา-%d", fixtureID), branchCode).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	username := fmt.Sprintf("hours-test-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,default_second_starts_at,default_second_ends_at) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00','12:00','21:00') RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID).Scan(&userID); err != nil {
		t.Fatalf("สร้างพนักงานทดสอบ: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM staff_attendance WHERE user_id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	const (
		workedDate   = "2099-12-28"
		firstDate    = "2099-12-29"
		secondDate   = "2099-12-30"
		dayOffDate   = "2099-12-27"
		compWorkDate = "2099-12-26"
	)
	for _, schedule := range []struct {
		date, status string
	}{
		{workedDate, "scheduled"},
		{firstDate, "scheduled"},
		{secondDate, "scheduled"},
		{dayOffDate, "day_off"},
		{compWorkDate, "compensatory_work"},
	} {
		if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,$3,'08:00','17:00',$4)`, userID, branchID, schedule.date, schedule.status); err != nil {
			t.Fatalf("สร้างกะทดสอบ %s: %v", schedule.date, err)
		}
	}
	if _, err := db.Exec(`INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES($1,$2,$3,now())`, userID, branchID, workedDate); err != nil {
		t.Fatalf("สร้างประวัติลงเวลา: %v", err)
	}
	var canEdit bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE id=$1 AND role IN ('cashier','branch_manager') AND franchisee_id IS NULL)`, userID).Scan(&canEdit); err != nil || !canEdit {
		t.Fatalf("พนักงานทดสอบต้องแก้ไขได้: exists=%t err=%v", canEdit, err)
	}

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPatch, "/", strings.NewReader(fmt.Sprintf(`{"name":"พนักงานเวลาใหม่","role":"cashier","branchId":%d,"defaultStartsAt":"09:00","defaultEndsAt":"18:00","defaultSecondStartsAt":"13:00","defaultSecondEndsAt":"22:00"}`, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Params = gin.Params{{Key: "id", Value: strconv.FormatInt(userID, 10)}}
	ctx.Set("claims", &middleware.Claims{Role: "admin"})

	(&PlatformHandler{db: db}).UpdateStaffMember(ctx)
	if response.Code != http.StatusOK {
		t.Fatalf("update = %d: %s (%v)", response.Code, response.Body.String(), ctx.Errors.Last())
	}

	expectedHours := func(date string) (string, string) {
		day, err := strconv.Atoi(date[len(date)-2:])
		if err != nil {
			t.Fatalf("อ่านวันจาก %q: %v", date, err)
		}
		if (day+int(userID))%2 == 0 {
			return "09:00:00", "18:00:00"
		}
		return "13:00:00", "22:00:00"
	}
	firstStart, firstEnd := expectedHours(firstDate)
	secondStart, secondEnd := expectedHours(secondDate)
	for _, test := range []struct {
		date, wantStart, wantEnd string
	}{
		{firstDate, firstStart, firstEnd},
		{secondDate, secondStart, secondEnd},
		{workedDate, "08:00:00", "17:00:00"},
		{dayOffDate, "08:00:00", "17:00:00"},
		{compWorkDate, "08:00:00", "17:00:00"},
	} {
		var startsAt, endsAt string
		if err := db.QueryRow(`SELECT starts_at::text,ends_at::text FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, test.date).Scan(&startsAt, &endsAt); err != nil {
			t.Fatalf("อ่านกะ %s: %v", test.date, err)
		}
		if startsAt != test.wantStart || endsAt != test.wantEnd {
			t.Errorf("กะ %s = %s-%s, want %s-%s", test.date, startsAt, endsAt, test.wantStart, test.wantEnd)
		}
	}
}

func TestCreateStaffMemberAllowsNoSecondShiftButRejectsAnIncompleteOne(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบกะตัวเลือก-%d", fixtureID), fmt.Sprintf("OPTIONAL-SHIFT-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM users WHERE branch_id=$1`, branchID)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	createRequest := func(body string) *httptest.ResponseRecorder {
		response := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(response)
		ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
		ctx.Request.Header.Set("Content-Type", "application/json")
		ctx.Set("claims", &middleware.Claims{Role: "admin"})
		(&PlatformHandler{db: db}).CreateStaffMember(ctx)
		return response
	}

	username := fmt.Sprintf("optional-shift-%d", fixtureID)
	response := createRequest(fmt.Sprintf(`{"name":"พนักงานกะเดียว","username":"%s","password":"password123","role":"cashier","branchId":%d,"defaultStartsAt":"08:00","defaultEndsAt":"17:00"}`, username, branchID))
	if response.Code != http.StatusCreated {
		t.Fatalf("สร้างพนักงานโดยไม่มีกะที่ 2 = %d: %s", response.Code, response.Body.String())
	}

	var secondStart, secondEnd sql.NullString
	if err := db.QueryRow(`SELECT default_second_starts_at::text,default_second_ends_at::text FROM users WHERE username=$1`, username).Scan(&secondStart, &secondEnd); err != nil {
		t.Fatalf("อ่านพนักงานที่สร้าง: %v", err)
	}
	if secondStart.Valid || secondEnd.Valid {
		t.Fatalf("กะที่ 2 ต้องเป็น NULL เมื่อไม่ระบุ แต่ได้ (%v, %v)", secondStart, secondEnd)
	}

	incompleteResponse := createRequest(fmt.Sprintf(`{"name":"พนักงานกะไม่ครบ","username":"optional-shift-incomplete-%d","password":"password123","role":"cashier","branchId":%d,"defaultStartsAt":"08:00","defaultEndsAt":"17:00","defaultSecondStartsAt":"13:00"}`, fixtureID, branchID))
	if incompleteResponse.Code != http.StatusBadRequest {
		t.Fatalf("สร้างพนักงานด้วยกะที่ 2 ไม่ครบ = %d: %s", incompleteResponse.Code, incompleteResponse.Body.String())
	}
}

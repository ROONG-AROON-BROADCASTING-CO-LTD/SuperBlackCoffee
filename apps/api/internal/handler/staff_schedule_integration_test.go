package handler

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
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
		if monthlyDaysOff != 4 || totalDaysOff != 4 {
			var generatedRows int
			if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-12-01' AND shift_date < '2100-01-01'`, userID).Scan(&generatedRows); err != nil {
				t.Fatalf("อ่านจำนวนกะของ %d: %v", userID, err)
			}
			t.Fatalf("พนักงาน %d ได้กะ=%d วันหยุดรายเดือน=%d รวม=%d, ต้องการ 31, 4 และ 4", userID, generatedRows, monthlyDaysOff, totalDaysOff)
		}
		var holidayStatus string
		if err := db.QueryRow(`SELECT status FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, holidayDate).Scan(&holidayStatus); err != nil {
			t.Fatalf("อ่านกะวันนักขัตฤกษ์ของ %d: %v", userID, err)
		}
		if holidayStatus != "scheduled" {
			t.Fatalf("วันนักขัตฤกษ์ต้องจัดกะปกติ, got %s", holidayStatus)
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

func TestExportStaffSchedulesXLSXCreatesReadableSchedule(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const holidayDate = "2097-12-08"
	var branchID, userID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาส่งออก-%d", fixtureID), fmt.Sprintf("EXPORT-TEST-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	username := fmt.Sprintf("export-test-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id) VALUES('พนักงานทดสอบ',$1,$2,'hash','cashier',$3) RETURNING id`, username, username+"@example.com", branchID).Scan(&userID); err != nil {
		t.Fatalf("สร้างพนักงานทดสอบ: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO public_holidays(holiday_date,name) VALUES($1,'วันหยุดทดสอบ Excel')`, holidayDate); err != nil {
		t.Fatalf("สร้างวันหยุดทดสอบ: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,$3,'08:00','17:00','scheduled')`, userID, branchID, holidayDate); err != nil {
		t.Fatalf("สร้างกะทดสอบ: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1`, holidayDate)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodGet, fmt.Sprintf("/?month=2097-12&branchId=%d", branchID), nil)
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).ExportStaffSchedulesXLSX(ctx)
	if response.Code != http.StatusOK {
		t.Fatalf("ส่งออก Excel = %d: %s", response.Code, response.Body.String())
	}
	if contentType := response.Header().Get("Content-Type"); contentType != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" {
		t.Fatalf("content type = %q", contentType)
	}
	workbook, err := excelize.OpenReader(bytes.NewReader(response.Body.Bytes()))
	if err != nil {
		t.Fatalf("เปิดไฟล์ Excel ไม่ได้: %v", err)
	}
	defer workbook.Close()
	if value, err := workbook.GetCellValue("ตารางงาน", "A1"); err != nil || value != "ตารางการทำงานประจำเดือน ธันวาคม 2640" {
		t.Fatalf("หัวรายงาน = %q, err = %v", value, err)
	}
	expectedFilename := fmt.Sprintf("ตารางงานพนักงาน-สาขาสาขาส่งออก-%d-ธันวาคม-2640.xlsx", fixtureID)
	if contentDisposition := response.Header().Get("Content-Disposition"); contentDisposition != "attachment; filename*=UTF-8''"+url.PathEscape(expectedFilename) {
		t.Fatalf("ชื่อไฟล์ส่งออก = %q", contentDisposition)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A5"); err != nil || value != "พนักงานทดสอบ" {
		t.Fatalf("ชื่อพนักงานใน Excel = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "K3"); err != nil || value != "8" {
		t.Fatalf("หัวคอลัมน์วันที่ใน Excel = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "K4"); err != nil || value != "PH" {
		t.Fatalf("ป้ายวันนักขัตฤกษ์ใน Excel = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "K5"); err != nil || value != "O" {
		t.Fatalf("สถานะกะใน Excel = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A7"); err != nil || !strings.Contains(value, "คำอธิบาย") {
		t.Fatalf("คำแนะนำใน Excel = %q, err = %v", value, err)
	}
}

func TestGenerateStaffSchedulesAlternatesTwoEmployeesByWeek(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const monthKey = "2098-01"

	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบสลับกะ-%d", fixtureID), fmt.Sprintf("WEEKLY-SWAP-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	userIDs := make([]int64, 2)
	for index := range userIDs {
		username := fmt.Sprintf("weekly-swap-%d-%d", fixtureID, index)
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,default_second_starts_at,default_second_ends_at) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00','12:00','21:00') RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID).Scan(&userIDs[index]); err != nil {
			t.Fatalf("สร้างพนักงานทดสอบ %d: %v", index, err)
		}
	}
	t.Cleanup(func() {
		for _, userID := range userIDs {
			_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
			_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		}
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	// Avoid fetching the external holiday calendar; this scenario has no holidays.
	syncedThaiHolidayYears.Store(2098, struct{}{})
	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"%s","branchId":%d}`, monthKey, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
	if response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางอัตโนมัติ = %d: %s", response.Code, response.Body.String())
	}

	month, err := time.Parse("2006-01", monthKey)
	if err != nil {
		t.Fatal(err)
	}
	firstMonday := month
	for firstMonday.Weekday() != time.Monday {
		firstMonday = firstMonday.AddDate(0, 0, 1)
	}
	secondMonday := firstMonday.AddDate(0, 0, 7)
	readHours := func(userID int64, date time.Time) (string, string) {
		t.Helper()
		var startsAt, endsAt string
		if err := db.QueryRow(`SELECT starts_at::text,ends_at::text FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, date.Format("2006-01-02")).Scan(&startsAt, &endsAt); err != nil {
			t.Fatalf("อ่านกะ %d วันที่ %s: %v", userID, date.Format("2006-01-02"), err)
		}
		return startsAt, endsAt
	}

	firstEmployeeWeekOneStart, firstEmployeeWeekOneEnd := readHours(userIDs[0], firstMonday)
	secondEmployeeWeekOneStart, secondEmployeeWeekOneEnd := readHours(userIDs[1], firstMonday)
	firstEmployeeSameWeekStart, firstEmployeeSameWeekEnd := readHours(userIDs[0], firstMonday.AddDate(0, 0, 1))
	secondEmployeeSameWeekStart, secondEmployeeSameWeekEnd := readHours(userIDs[1], firstMonday.AddDate(0, 0, 1))
	firstEmployeeWeekTwoStart, firstEmployeeWeekTwoEnd := readHours(userIDs[0], secondMonday)
	secondEmployeeWeekTwoStart, secondEmployeeWeekTwoEnd := readHours(userIDs[1], secondMonday)
	if firstEmployeeWeekOneStart == secondEmployeeWeekOneStart || firstEmployeeWeekOneEnd == secondEmployeeWeekOneEnd {
		t.Fatalf("สัปดาห์แรกต้องแบ่งเป็นคนละกะ: (%s-%s), (%s-%s)", firstEmployeeWeekOneStart, firstEmployeeWeekOneEnd, secondEmployeeWeekOneStart, secondEmployeeWeekOneEnd)
	}
	if firstEmployeeSameWeekStart != firstEmployeeWeekOneStart || firstEmployeeSameWeekEnd != firstEmployeeWeekOneEnd || secondEmployeeSameWeekStart != secondEmployeeWeekOneStart || secondEmployeeSameWeekEnd != secondEmployeeWeekOneEnd {
		t.Fatalf("พนักงานสองคนต้องอยู่กะเดิมตลอดสัปดาห์: Monday=(%s-%s),(%s-%s); Tuesday=(%s-%s),(%s-%s)", firstEmployeeWeekOneStart, firstEmployeeWeekOneEnd, secondEmployeeWeekOneStart, secondEmployeeWeekOneEnd, firstEmployeeSameWeekStart, firstEmployeeSameWeekEnd, secondEmployeeSameWeekStart, secondEmployeeSameWeekEnd)
	}
	if firstEmployeeWeekTwoStart != secondEmployeeWeekOneStart || firstEmployeeWeekTwoEnd != secondEmployeeWeekOneEnd || secondEmployeeWeekTwoStart != firstEmployeeWeekOneStart || secondEmployeeWeekTwoEnd != firstEmployeeWeekOneEnd {
		t.Fatalf("สัปดาห์ถัดไปต้องสลับกะ: week one=(%s-%s),(%s-%s); week two=(%s-%s),(%s-%s)", firstEmployeeWeekOneStart, firstEmployeeWeekOneEnd, secondEmployeeWeekOneStart, secondEmployeeWeekOneEnd, firstEmployeeWeekTwoStart, firstEmployeeWeekTwoEnd, secondEmployeeWeekTwoStart, secondEmployeeWeekTwoEnd)
	}
}

func TestGenerateStaffSchedulesKeepsDailyAlternationForThreeEmployees(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const monthKey = "2097-01"

	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบสามคน-%d", fixtureID), fmt.Sprintf("THREE-STAFF-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	userIDs := make([]int64, 3)
	for index := range userIDs {
		username := fmt.Sprintf("three-staff-%d-%d", fixtureID, index)
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,default_second_starts_at,default_second_ends_at) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00','12:00','21:00') RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID).Scan(&userIDs[index]); err != nil {
			t.Fatalf("สร้างพนักงานทดสอบ %d: %v", index, err)
		}
	}
	t.Cleanup(func() {
		for _, userID := range userIDs {
			_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
			_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		}
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	syncedThaiHolidayYears.Store(2097, struct{}{})
	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"%s","branchId":%d}`, monthKey, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
	if response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางอัตโนมัติ = %d: %s", response.Code, response.Body.String())
	}

	month, err := time.Parse("2006-01", monthKey)
	if err != nil {
		t.Fatal(err)
	}
	readStart := func(userID int64, date time.Time) string {
		t.Helper()
		var startsAt string
		if err := db.QueryRow(`SELECT starts_at::text FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, date.Format("2006-01-02")).Scan(&startsAt); err != nil {
			t.Fatalf("อ่านกะ %d วันที่ %s: %v", userID, date.Format("2006-01-02"), err)
		}
		return startsAt
	}
	for _, userID := range userIDs {
		if firstDay, secondDay := readStart(userID, month), readStart(userID, month.AddDate(0, 0, 1)); firstDay == secondDay {
			t.Fatalf("พนักงาน %d ในสาขาสามคนต้องยังสลับกะรายวัน: %s และ %s", userID, firstDay, secondDay)
		}
	}
}

func TestGenerateStaffSchedulesLocksSecondShiftToSelectedWeekdays(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const monthKey = "2098-02"

	var branchID, userID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบล็อกกะ-%d", fixtureID), fmt.Sprintf("LOCK-SHIFT-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	username := fmt.Sprintf("locked-shift-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,default_second_starts_at,default_second_ends_at,default_second_shift_days) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00','13:00','22:00',ARRAY[1]) RETURNING id`, "พนักงานล็อกกะ", username, username+"@example.com", branchID).Scan(&userID); err != nil {
		t.Fatalf("สร้างพนักงานทดสอบ: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	syncedThaiHolidayYears.Store(2098, struct{}{})
	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"%s","branchId":%d}`, monthKey, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
	if response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางอัตโนมัติ = %d: %s", response.Code, response.Body.String())
	}

	month, err := time.Parse("2006-01", monthKey)
	if err != nil {
		t.Fatal(err)
	}
	firstMonday := month
	for firstMonday.Weekday() != time.Monday {
		firstMonday = firstMonday.AddDate(0, 0, 1)
	}
	for _, test := range []struct {
		date               time.Time
		wantStart, wantEnd string
	}{
		{firstMonday, "13:00:00", "22:00:00"},
		{firstMonday.AddDate(0, 0, 1), "08:00:00", "17:00:00"},
	} {
		var startsAt, endsAt string
		if err := db.QueryRow(`SELECT starts_at::text,ends_at::text FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, test.date.Format("2006-01-02")).Scan(&startsAt, &endsAt); err != nil {
			t.Fatalf("อ่านกะวันที่ %s: %v", test.date.Format("2006-01-02"), err)
		}
		if startsAt != test.wantStart || endsAt != test.wantEnd {
			t.Errorf("กะวันที่ %s = %s-%s, want %s-%s", test.date.Format("2006-01-02"), startsAt, endsAt, test.wantStart, test.wantEnd)
		}
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
	firstShiftDate, err := time.Parse("2006-01-02", firstDate)
	if err != nil {
		t.Fatal(err)
	}
	secondShiftWeekday := int(firstShiftDate.Weekday())
	if secondShiftWeekday == 0 {
		secondShiftWeekday = 7
	}
	ctx.Request = httptest.NewRequest(http.MethodPatch, "/", strings.NewReader(fmt.Sprintf(`{"name":"พนักงานเวลาใหม่","role":"cashier","branchId":%d,"defaultStartsAt":"09:00","defaultEndsAt":"18:00","defaultSecondStartsAt":"13:00","defaultSecondEndsAt":"22:00","defaultSecondShiftDays":[%d]}`, branchID, secondShiftWeekday)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Params = gin.Params{{Key: "id", Value: strconv.FormatInt(userID, 10)}}
	ctx.Set("claims", &middleware.Claims{Role: "admin"})

	(&PlatformHandler{db: db}).UpdateStaffMember(ctx)
	if response.Code != http.StatusOK {
		t.Fatalf("update = %d: %s (%v)", response.Code, response.Body.String(), ctx.Errors.Last())
	}

	for _, test := range []struct {
		date, wantStart, wantEnd string
	}{
		{firstDate, "13:00:00", "22:00:00"},
		{secondDate, "09:00:00", "18:00:00"},
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

	weekdayUsername := fmt.Sprintf("optional-shift-days-%d", fixtureID)
	weekdayResponse := createRequest(fmt.Sprintf(`{"name":"พนักงานเลือกวันกะสอง","username":"%s","password":"password123","role":"cashier","branchId":%d,"defaultStartsAt":"08:00","defaultEndsAt":"17:00","defaultSecondStartsAt":"13:00","defaultSecondEndsAt":"22:00","defaultSecondShiftDays":[1,3,5]}`, weekdayUsername, branchID))
	if weekdayResponse.Code != http.StatusCreated {
		t.Fatalf("สร้างพนักงานพร้อมวันกะที่ 2 = %d: %s", weekdayResponse.Code, weekdayResponse.Body.String())
	}
	var weekdayValues string
	if err := db.QueryRow(`SELECT array_to_string(default_second_shift_days, ',') FROM users WHERE username=$1`, weekdayUsername).Scan(&weekdayValues); err != nil || weekdayValues != "1,3,5" {
		t.Fatalf("วันกะที่ 2 = %q, err = %v", weekdayValues, err)
	}

	incompleteResponse := createRequest(fmt.Sprintf(`{"name":"พนักงานกะไม่ครบ","username":"optional-shift-incomplete-%d","password":"password123","role":"cashier","branchId":%d,"defaultStartsAt":"08:00","defaultEndsAt":"17:00","defaultSecondStartsAt":"13:00"}`, fixtureID, branchID))
	if incompleteResponse.Code != http.StatusBadRequest {
		t.Fatalf("สร้างพนักงานด้วยกะที่ 2 ไม่ครบ = %d: %s", incompleteResponse.Code, incompleteResponse.Body.String())
	}
}

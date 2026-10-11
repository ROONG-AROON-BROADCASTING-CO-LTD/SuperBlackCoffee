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
	var customPolicyUserID int64
	customUsername := fmt.Sprintf("custom-weekend-test-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,day_off_policy,weekly_days_off) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00','custom',$5::smallint[]) RETURNING id`, "พนักงานกำหนดวันหยุด", customUsername, customUsername+"@example.com", branchID, "{6}").Scan(&customPolicyUserID); err != nil {
		t.Fatalf("สร้างพนักงานกำหนดวันหยุด: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1`, holidayDate)
		for _, userID := range userIDs {
			_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
			_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		}
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, customPolicyUserID)
		_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, customPolicyUserID)
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
		var monthlyDaysOff, compensatoryDays, totalDaysOff int
		if err := db.QueryRow(`SELECT COUNT(*) FILTER (WHERE leave_type='วันหยุดประจำเดือน'),COUNT(*) FILTER (WHERE leave_type LIKE 'วันหยุดชดเชยวันนักขัตฤกษ์:%'),COUNT(*) FILTER (WHERE status='day_off') FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-12-01' AND shift_date < '2100-01-01'`, userID).Scan(&monthlyDaysOff, &compensatoryDays, &totalDaysOff); err != nil {
			t.Fatalf("อ่านโควตาวันหยุดของ %d: %v", userID, err)
		}
		if monthlyDaysOff != 4 || totalDaysOff != 4+compensatoryDays {
			var generatedRows int
			if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-12-01' AND shift_date < '2100-01-01'`, userID).Scan(&generatedRows); err != nil {
				t.Fatalf("อ่านจำนวนกะของ %d: %v", userID, err)
			}
			t.Fatalf("พนักงาน %d ได้กะ=%d วันหยุดรายเดือน=%d วันชดเชย=%d รวม=%d", userID, generatedRows, monthlyDaysOff, compensatoryDays, totalDaysOff)
		}
		var holidayStatus string
		if err := db.QueryRow(`SELECT status FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, holidayDate).Scan(&holidayStatus); err != nil {
			t.Fatalf("อ่านกะวันนักขัตฤกษ์ของ %d: %v", userID, err)
		}
		if holidayStatus != "scheduled" {
			t.Fatalf("วันนักขัตฤกษ์ต้องจัดกะปกติ, got %s", holidayStatus)
		}
		var weekendDaysOff int
		if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-12-01' AND shift_date < '2100-01-01' AND leave_type='วันหยุดประจำเดือน' AND EXTRACT(ISODOW FROM shift_date)::int IN (6,7)`, userID).Scan(&weekendDaysOff); err != nil {
			t.Fatalf("ตรวจสอบวันหยุดเสาร์อาทิตย์ของ %d: %v", userID, err)
		}
		if weekendDaysOff != 0 {
			t.Fatalf("พนักงาน %d มีวันหยุดอัตโนมัติในเสาร์อาทิตย์ %d วัน", userID, weekendDaysOff)
		}
	}
	var sharedMonthlyDayOffs int
	if err := db.QueryRow(`SELECT COUNT(*) FROM (SELECT shift_date FROM staff_shifts WHERE branch_id=$1 AND leave_type='วันหยุดประจำเดือน' GROUP BY shift_date HAVING COUNT(*) > 1) overlapping_days`, branchID).Scan(&sharedMonthlyDayOffs); err != nil {
		t.Fatalf("ตรวจสอบวันหยุดที่ชนกัน: %v", err)
	}
	if sharedMonthlyDayOffs != 0 {
		t.Fatalf("พบวันหยุดประจำเดือนซ้อนกัน %d วัน", sharedMonthlyDayOffs)
	}
	var customSaturdayDaysOff, customSundayDaysOff int
	if err := db.QueryRow(`SELECT COUNT(*) FILTER (WHERE EXTRACT(ISODOW FROM shift_date)::int=6), COUNT(*) FILTER (WHERE EXTRACT(ISODOW FROM shift_date)::int=7) FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-12-01' AND shift_date < '2100-01-01' AND status='day_off'`, customPolicyUserID).Scan(&customSaturdayDaysOff, &customSundayDaysOff); err != nil {
		t.Fatalf("ตรวจสอบวันหยุดที่ผู้ดูแลกำหนด: %v", err)
	}
	if customSaturdayDaysOff == 0 || customSundayDaysOff != 0 {
		t.Fatalf("วันหยุดเสาร์ที่ผู้ดูแลกำหนดไม่ถูกต้อง: เสาร์=%d อาทิตย์=%d", customSaturdayDaysOff, customSundayDaysOff)
	}
}

func TestGenerateStaffSchedulesDoesNotGiveAnOnlyEmployeeAutomaticDaysOff(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	var branchID, userID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาพนักงานคนเดียว-%d", fixtureID), fmt.Sprintf("SOLO-TEST-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	username := fmt.Sprintf("solo-test-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at) VALUES('พนักงานทดสอบ',$1,$2,'hash','cashier',$3,'08:00','17:00') RETURNING id`, username, username+"@example.com", branchID).Scan(&userID); err != nil {
		t.Fatalf("สร้างพนักงานทดสอบ: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
	syncedThaiHolidayYears.Store(2099, struct{}{})

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"2099-11","branchId":%d}`, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
	if response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางอัตโนมัติ = %d: %s", response.Code, response.Body.String())
	}

	var generatedShifts, automaticDaysOff int
	if err := db.QueryRow(`SELECT COUNT(*), COUNT(*) FILTER (WHERE status='day_off' OR leave_type='วันหยุดประจำเดือน') FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-11-01' AND shift_date < '2099-12-01'`, userID).Scan(&generatedShifts, &automaticDaysOff); err != nil {
		t.Fatalf("อ่านตารางพนักงานคนเดียว: %v", err)
	}
	if generatedShifts != 30 || automaticDaysOff != 0 {
		t.Fatalf("พนักงานคนเดียวได้กะ=%d วันหยุดอัตโนมัติ=%d, ต้องการ 30 และ 0", generatedShifts, automaticDaysOff)
	}
}

func TestGenerateStaffSchedulesAllowsHeadquarters(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	holidayDate := "2099-11-10"
	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code,is_headquarters,work_days) VALUES($1,$2,true,ARRAY[1,2,3,4,5,6]::smallint[]) RETURNING id`, fmt.Sprintf("สำนักงานใหญ่ทดสอบตารางกะ-%d", fixtureID), fmt.Sprintf("HQ-SCHEDULE-TEST-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสำนักงานใหญ่ทดสอบ: %v", err)
	}
	userIDs := make([]int64, 2)
	for index := range userIDs {
		username := fmt.Sprintf("hq-schedule-test-%d-%d", fixtureID, index)
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at) VALUES($1,$2,$3,'hash','cashier',$4,'09:00','18:00') RETURNING id`, "พนักงานสำนักงานใหญ่", username, username+"@example.com", branchID).Scan(&userIDs[index]); err != nil {
			t.Fatalf("สร้างพนักงานสำนักงานใหญ่ %d: %v", index, err)
		}
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1 AND name='วันหยุดสำนักงานใหญ่ทดสอบ'`, holidayDate)
		for _, userID := range userIDs {
			_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, userID)
			_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, userID)
		}
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
	if _, err := db.Exec(`INSERT INTO public_holidays(holiday_date,name) VALUES($1,'วันหยุดสำนักงานใหญ่ทดสอบ')`, holidayDate); err != nil {
		t.Fatalf("สร้างวันหยุดสำนักงานใหญ่ทดสอบ: %v", err)
	}
	syncedThaiHolidayYears.Store(2099, struct{}{})

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"2099-11","branchId":%d}`, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
	if response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางสำนักงานใหญ่ = %d: %s", response.Code, response.Body.String())
	}

	for _, userID := range userIDs {
		var shifts, sundayDaysOff, publicHolidayDaysOff, monthlyDaysOff, compensatoryDays int
		if err := db.QueryRow(`
SELECT
  COUNT(*),
  COUNT(*) FILTER (WHERE status='day_off' AND EXTRACT(ISODOW FROM shift_date)::int=7),
  COUNT(*) FILTER (WHERE leave_type='วันหยุดนักขัตฤกษ์'),
  COUNT(*) FILTER (WHERE leave_type='วันหยุดประจำเดือน'),
  COUNT(*) FILTER (WHERE leave_type LIKE 'วันหยุดชดเชยวันนักขัตฤกษ์:%')
FROM staff_shifts
	WHERE user_id=$1 AND shift_date >= '2099-11-01' AND shift_date < '2099-12-01'`, userID).Scan(&shifts, &sundayDaysOff, &publicHolidayDaysOff, &monthlyDaysOff, &compensatoryDays); err != nil {
			t.Fatalf("อ่านตารางสำนักงานใหญ่: %v", err)
		}
		var sundaysInMonth int
		if err := db.QueryRow(`SELECT COUNT(*) FROM generate_series('2099-11-01'::date,'2099-11-30'::date,INTERVAL '1 day') day WHERE EXTRACT(ISODOW FROM day)::int=7`).Scan(&sundaysInMonth); err != nil {
			t.Fatalf("นับวันอาทิตย์สำนักงานใหญ่: %v", err)
		}
		if shifts != 30 || sundayDaysOff != sundaysInMonth || publicHolidayDaysOff != 1 || monthlyDaysOff != 0 || compensatoryDays != 0 {
			t.Fatalf("พนักงานสำนักงานใหญ่ %d ต้องหยุดวันอาทิตย์และวันนักขัตฤกษ์, got กะ=%d อาทิตย์=%d นักขัต=%d รายเดือน=%d ชดเชย=%d", userID, shifts, sundayDaysOff, publicHolidayDaysOff, monthlyDaysOff, compensatoryDays)
		}
	}
}

func TestGenerateStaffSchedulesCreatesACompensatoryDayOffAfterPublicHoliday(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	var branchID, userID, secondUserID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาวันหยุดชดเชย-%d", fixtureID), fmt.Sprintf("COMP-HOLIDAY-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	username := fmt.Sprintf("comp-holiday-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at) VALUES('พนักงานวันหยุดชดเชย',$1,$2,'hash','cashier',$3,'08:00','17:00') RETURNING id`, username, username+"@example.com", branchID).Scan(&userID); err != nil {
		t.Fatalf("สร้างพนักงานทดสอบ: %v", err)
	}
	secondUsername := fmt.Sprintf("comp-holiday-second-%d", fixtureID)
	if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at) VALUES('พนักงานวันหยุดชดเชยคนที่สอง',$1,$2,'hash','cashier',$3,'08:00','17:00') RETURNING id`, secondUsername, secondUsername+"@example.com", branchID).Scan(&secondUserID); err != nil {
		t.Fatalf("สร้างพนักงานทดสอบคนที่สอง: %v", err)
	}
	// Both holidays are Fridays, exercising the weekend candidate path.
	const firstHolidayDate = "2099-11-06"
	const firstHolidayName = "วันหยุดชดเชยทดสอบวันแรก"
	const secondHolidayDate = "2099-11-13"
	const secondHolidayName = "วันหยุดชดเชยทดสอบวันที่สอง"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date IN ($1,$2) AND name IN ($3,$4)`, firstHolidayDate, secondHolidayDate, firstHolidayName, secondHolidayName)
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id IN ($1,$2)`, userID, secondUserID)
		_, _ = db.Exec(`DELETE FROM users WHERE id IN ($1,$2)`, userID, secondUserID)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
	if _, err := db.Exec(`INSERT INTO public_holidays(holiday_date,name) VALUES($1,$2),($3,$4)`, firstHolidayDate, firstHolidayName, secondHolidayDate, secondHolidayName); err != nil {
		t.Fatalf("สร้างวันนักขัตฤกษ์: %v", err)
	}
	syncedThaiHolidayYears.Store(2099, struct{}{})

	generate := func() *httptest.ResponseRecorder {
		response := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(response)
		ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"2099-11","branchId":%d}`, branchID)))
		ctx.Request.Header.Set("Content-Type", "application/json")
		ctx.Set("claims", &middleware.Claims{Role: "admin"})
		(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
		return response
	}

	if response := generate(); response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางอัตโนมัติ = %d: %s", response.Code, response.Body.String())
	}
	var holidayWorkers, compensatoryDays, compensatoryRecipients, compensatoryDates int
	if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE user_id IN ($1,$2) AND shift_date IN ($3,$4) AND status='scheduled'`, userID, secondUserID, firstHolidayDate, secondHolidayDate).Scan(&holidayWorkers); err != nil {
		t.Fatalf("อ่านกะวันนักขัตฤกษ์: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*),COUNT(DISTINCT user_id),COUNT(DISTINCT shift_date) FROM staff_shifts WHERE user_id IN ($1,$2) AND status='day_off' AND leave_type LIKE 'วันหยุดชดเชยวันนักขัตฤกษ์:%'`, userID, secondUserID).Scan(&compensatoryDays, &compensatoryRecipients, &compensatoryDates); err != nil {
		t.Fatalf("อ่านวันหยุดชดเชย: %v", err)
	}
	if holidayWorkers != 4 || compensatoryDays != 4 || compensatoryRecipients != 2 || compensatoryDates != 4 {
		t.Fatalf("วันนักขัตฤกษ์ 2 วันต้องมีพนักงานทำงาน 4 กะและได้วันชดเชยคนละ 2 วันคนละวัน, got ทำงาน=%d ชดเชย=%d ผู้รับ=%d วันที่ไม่ซ้ำ=%d", holidayWorkers, compensatoryDays, compensatoryRecipients, compensatoryDates)
	}
	for _, employeeID := range []int64{userID, secondUserID} {
		var monthlyDaysOff, employeeCompensatoryDays, totalDaysOff int
		if err := db.QueryRow(`SELECT COUNT(*) FILTER (WHERE leave_type='วันหยุดประจำเดือน'),COUNT(*) FILTER (WHERE leave_type LIKE 'วันหยุดชดเชยวันนักขัตฤกษ์:%'),COUNT(*) FILTER (WHERE status='day_off') FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-11-01' AND shift_date < '2099-12-01'`, employeeID).Scan(&monthlyDaysOff, &employeeCompensatoryDays, &totalDaysOff); err != nil {
			t.Fatalf("อ่านวันหยุดรวมของพนักงาน %d: %v", employeeID, err)
		}
		if monthlyDaysOff != 4 || employeeCompensatoryDays != 2 || totalDaysOff != 6 {
			t.Fatalf("พนักงาน %d ต้องมีวันหยุดประจำเดือน 4 วันและวันชดเชยเพิ่ม 2 วัน, got เดือน=%d ชดเชย=%d รวม=%d", employeeID, monthlyDaysOff, employeeCompensatoryDays, totalDaysOff)
		}
	}
	var datesWithMultipleDaysOff int
	if err := db.QueryRow(`
SELECT COUNT(*)
FROM (
  SELECT shift_date
  FROM staff_shifts
  WHERE branch_id=$1 AND shift_date >= '2099-11-01' AND shift_date < '2099-12-01' AND status='day_off'
  GROUP BY shift_date
  HAVING COUNT(*) > 1
) duplicate_days_off`, branchID).Scan(&datesWithMultipleDaysOff); err != nil {
		t.Fatalf("ตรวจวันหยุดที่ชนกัน: %v", err)
	}
	if datesWithMultipleDaysOff != 0 {
		t.Fatalf("ต้องไม่จัดวันหยุดประจำเดือนหรือวันชดเชยซ้อนกันในวันเดียว, got %d วัน", datesWithMultipleDaysOff)
	}
	var threeConsecutiveDaysOff int
	if err := db.QueryRow(`
SELECT COUNT(*)
FROM staff_shifts first_day
JOIN staff_shifts second_day
  ON second_day.user_id=first_day.user_id AND second_day.shift_date=first_day.shift_date + 1
JOIN staff_shifts third_day
  ON third_day.user_id=first_day.user_id AND third_day.shift_date=first_day.shift_date + 2
WHERE first_day.user_id IN ($1,$2)
  AND first_day.status='day_off' AND second_day.status='day_off' AND third_day.status='day_off'`, userID, secondUserID).Scan(&threeConsecutiveDaysOff); err != nil {
		t.Fatalf("ตรวจวันหยุดติดต่อกันสามวัน: %v", err)
	}
	if threeConsecutiveDaysOff != 0 {
		t.Fatalf("ต้องไม่จัดวันหยุดติดต่อกัน 3 วัน, got %d ชุด", threeConsecutiveDaysOff)
	}

	if response := generate(); response.Code != http.StatusCreated {
		t.Fatalf("สร้างตารางซ้ำ = %d: %s", response.Code, response.Body.String())
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE user_id IN ($1,$2) AND leave_type LIKE 'วันหยุดชดเชยวันนักขัตฤกษ์:%'`, userID, secondUserID).Scan(&compensatoryDays); err != nil {
		t.Fatalf("อ่านจำนวนวันหยุดชดเชย: %v", err)
	}
	if compensatoryDays != 4 {
		t.Fatalf("ต้องมีวันหยุดชดเชย 4 วันหลังจัดตารางซ้ำ, got %d", compensatoryDays)
	}
}

func TestGenerateStaffSchedulesUsesFlexibleStaffToCoverAnAbsentPrimaryShift(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	var branchID, earlyUserID, secondEarlyUserID, lateUserID, flexibleUserID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาพนักงานสำรอง-%d", fixtureID), fmt.Sprintf("FLEX-TEST-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	createUser := func(name, suffix, startsAt, endsAt, policy, customDaysOff string, flexible bool) int64 {
		t.Helper()
		username := fmt.Sprintf("flex-test-%d-%s", fixtureID, suffix)
		defaultShifts := `'[]'::jsonb`
		if flexible {
			defaultShifts = `jsonb_build_array(jsonb_build_object('startsAt','09:00','endsAt','18:00','weekdays','[]'::jsonb),jsonb_build_object('startsAt','13:00','endsAt','22:00','weekdays','[]'::jsonb))`
		}
		query := fmt.Sprintf(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,default_shifts,day_off_policy,custom_days_off) VALUES($1,$2,$3,'hash','cashier',$4,$5::time,$6::time,%s,$7,$8::date[]) RETURNING id`, defaultShifts)
		var id int64
		if err := db.QueryRow(query, name, username, username+"@example.com", branchID, startsAt, endsAt, policy, customDaysOff).Scan(&id); err != nil {
			t.Fatalf("สร้างพนักงาน %s: %v", name, err)
		}
		return id
	}
	earlyUserID = createUser("พนักงานกะเช้า", "early", "08:00", "17:00", "custom", "{2099-12-01,2099-12-02}", false)
	secondEarlyUserID = createUser("พนักงานกะเช้าคนที่สอง", "early-second", "08:00", "17:00", "custom", "{2099-12-02}", false)
	lateUserID = createUser("พนักงานกะบ่าย", "late", "13:00", "22:00", "custom", "{}", false)
	flexibleUserID = createUser("พนักงานสำรอง", "flex", "09:00", "18:00", "custom", "{2099-12-03}", true)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id IN ($1,$2,$3,$4)`, earlyUserID, secondEarlyUserID, lateUserID, flexibleUserID)
		_, _ = db.Exec(`DELETE FROM users WHERE id IN ($1,$2,$3,$4)`, earlyUserID, secondEarlyUserID, lateUserID, flexibleUserID)
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})
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

	var startsAt, endsAt, status string
	if err := db.QueryRow(`SELECT starts_at::text,ends_at::text,status FROM staff_shifts WHERE user_id=$1 AND shift_date='2099-12-01'`, flexibleUserID).Scan(&startsAt, &endsAt, &status); err != nil {
		t.Fatalf("อ่านกะพนักงานสำรองวันที่ยังกะเช้าอยู่: %v", err)
	}
	if startsAt != "09:00:00" || endsAt != "18:00:00" || status != "scheduled" {
		t.Fatalf("พนักงานสำรองต้องใช้กะแรกเมื่อยังกะเช้าอยู่, got %s-%s (%s)", startsAt, endsAt, status)
	}
	if err := db.QueryRow(`SELECT starts_at::text,ends_at::text,status FROM staff_shifts WHERE user_id=$1 AND shift_date='2099-12-02'`, flexibleUserID).Scan(&startsAt, &endsAt, &status); err != nil {
		t.Fatalf("อ่านกะพนักงานสำรองวันที่ต้องแทน: %v", err)
	}
	if startsAt != "08:00:00" || endsAt != "17:00:00" || status != "scheduled" {
		t.Fatalf("พนักงานสำรองต้องแทนกะเช้าที่ไม่มีคนทำงาน, got %s-%s (%s)", startsAt, endsAt, status)
	}
	if err := db.QueryRow(`SELECT status FROM staff_shifts WHERE user_id=$1 AND shift_date='2099-12-03'`, flexibleUserID).Scan(&status); err != nil {
		t.Fatalf("อ่านวันหยุดพนักงานสำรอง: %v", err)
	}
	if status != "day_off" {
		t.Fatalf("วันหยุดของพนักงานสำรองต้องไม่ถูกเขียนทับ, got %s", status)
	}
}

func TestGenerateStaffSchedulesRepairsExistingAutomaticDaysOffToFour(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	var branchID, userID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาแก้โควตาวันหยุด-%d", fixtureID), fmt.Sprintf("REPAIR-QUOTA-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	userIDs := make([]int64, 2)
	for index := range userIDs {
		username := fmt.Sprintf("repair-quota-%d-%d", fixtureID, index)
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00') RETURNING id`, fmt.Sprintf("พนักงานแก้โควตา %d", index), username, username+"@example.com", branchID).Scan(&userIDs[index]); err != nil {
			t.Fatalf("สร้างพนักงานทดสอบ %d: %v", index, err)
		}
	}
	userID = userIDs[0]
	t.Cleanup(func() {
		for _, id := range userIDs {
			_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, id)
			_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, id)
		}
		_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
	})

	// Simulate a month generated by the previous rule: one of the four chosen
	// days is locked as compensatory work, so only three rows are marked as
	// monthly days off. A subsequent generation must move that day off to an
	// editable weekday rather than retain the stale three-day result.
	for day := 1; day <= 31; day++ {
		shiftDate := fmt.Sprintf("2099-10-%02d", day)
		status, leaveType := "scheduled", any(nil)
		if day == 1 {
			status, leaveType = "compensatory_work", "ทำงานชดเชยหลังวันหยุดนักขัตฤกษ์"
		} else if day == 6 || day == 15 || day == 27 {
			status, leaveType = "day_off", "วันหยุดประจำเดือน"
		}
		if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status,leave_type) VALUES($1,$2,$3,'08:00','17:00',$4,$5)`, userID, branchID, shiftDate, status, leaveType); err != nil {
			t.Fatalf("สร้างตารางเดิมวันที่ %s: %v", shiftDate, err)
		}
	}
	syncedThaiHolidayYears.Store(2099, struct{}{})

	gin.SetMode(gin.TestMode)
	response := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(response)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"2099-10","branchId":%d}`, branchID)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("claims", &middleware.Claims{Role: "admin"})
	(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
	if response.Code != http.StatusCreated {
		t.Fatalf("จัดตารางเดือนเดิมซ้ำ = %d: %s", response.Code, response.Body.String())
	}

	var monthlyDaysOff int
	if err := db.QueryRow(`SELECT COUNT(*) FROM staff_shifts WHERE user_id=$1 AND shift_date >= '2099-10-01' AND shift_date < '2099-11-01' AND leave_type='วันหยุดประจำเดือน'`, userID).Scan(&monthlyDaysOff); err != nil {
		t.Fatalf("อ่านจำนวนวันหยุดหลังสร้างตารางซ้ำ: %v", err)
	}
	if monthlyDaysOff != 4 {
		t.Fatalf("พนักงานที่มีตารางเดิมต้องถูกปรับเป็นวันหยุดรายเดือน 4 วัน, got %d", monthlyDaysOff)
	}
	var lockedStatus string
	if err := db.QueryRow(`SELECT status FROM staff_shifts WHERE user_id=$1 AND shift_date='2099-10-01'`, userID).Scan(&lockedStatus); err != nil {
		t.Fatalf("อ่านกะงานชดเชย: %v", err)
	}
	if lockedStatus != "compensatory_work" {
		t.Fatalf("กะงานชดเชยต้องไม่ถูกเขียนทับ, got %s", lockedStatus)
	}
}

func TestExportStaffSchedulesXLSXCreatesReadableSchedule(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const holidayDate = "2097-12-08"
	var branchID, userID, midShiftUserID, lateShiftUserID int64
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
	for _, fixture := range []struct {
		name     string
		username string
		startsAt string
		endsAt   string
		userID   *int64
	}{
		{name: "พนักงานกะบ่าย", username: username + "-late", startsAt: "13:00", endsAt: "22:00", userID: &lateShiftUserID},
		{name: "พนักงานกะสาย", username: username + "-mid", startsAt: "09:00", endsAt: "18:00", userID: &midShiftUserID},
	} {
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id) VALUES($1,$2,$3,'hash','cashier',$4) RETURNING id`, fixture.name, fixture.username, fixture.username+"@example.com", branchID).Scan(fixture.userID); err != nil {
			t.Fatalf("สร้างพนักงาน %s: %v", fixture.name, err)
		}
		if _, err := db.Exec(`INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status) VALUES($1,$2,$3,$4,$5,'scheduled')`, *fixture.userID, branchID, holidayDate, fixture.startsAt, fixture.endsAt); err != nil {
			t.Fatalf("สร้างกะของ %s: %v", fixture.name, err)
		}
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM public_holidays WHERE holiday_date=$1`, holidayDate)
		_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id IN ($1,$2,$3)`, userID, midShiftUserID, lateShiftUserID)
		_, _ = db.Exec(`DELETE FROM users WHERE id IN ($1,$2,$3)`, userID, midShiftUserID, lateShiftUserID)
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
	expectedFilename := fmt.Sprintf("ตารางงานพนักงาน-สาขาสาขาส่งออก-%d-ธันวาคม-2640.xlsx", fixtureID)
	if contentDisposition := response.Header().Get("Content-Disposition"); contentDisposition != "attachment; filename*=UTF-8''"+url.PathEscape(expectedFilename) {
		t.Fatalf("ชื่อไฟล์ส่งออก = %q", contentDisposition)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A2"); err != nil || !strings.Contains(value, "PH = วันหยุดนักขัตฤกษ์") {
		t.Fatalf("หมายเหตุการส่งออก = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "C3"); err != nil || value != "1" {
		t.Fatalf("หัวตารางรายเดือน = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A5"); err != nil || value != "พนักงานทดสอบ" {
		t.Fatalf("ชื่อพนักงานใน Excel = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A17"); err != nil || value != "วันนักขัตฤกษ์ประจำเดือน ธันวาคม 2640" {
		t.Fatalf("หัวข้อรายการวันนักขัตฤกษ์ = %q, err = %v", value, err)
	}
	if date, err := workbook.GetCellValue("ตารางงาน", "A18"); err != nil || date != "8 ธันวาคม 2640" {
		t.Fatalf("วันที่วันนักขัตฤกษ์ = %q, err = %v", date, err)
	}
	if name, err := workbook.GetCellValue("ตารางงาน", "B18"); err != nil || name != "วันหยุดทดสอบ Excel" {
		t.Fatalf("ชื่อวันนักขัตฤกษ์ = %q, err = %v", name, err)
	}
	allRows, err := workbook.GetRows("ตารางงาน")
	if err != nil {
		t.Fatalf("อ่านแถวใน Excel ไม่ได้: %v", err)
	}
	positions := map[string]int{}
	position := 0
	for _, values := range allRows {
		for _, value := range values {
			position++
			if _, found := positions[value]; !found {
				positions[value] = position
			}
		}
	}
	if !(positions["08:00\n17:00"] < positions["09:00\n18:00"] && positions["09:00\n18:00"] < positions["13:00\n22:00"]) {
		t.Fatalf("ลำดับเวลากะใน Excel ไม่เรียงจากเช้าไปดึก: %#v", positions)
	}
}

func TestBuildMonthlyStaffScheduleWorkbookMatchesMonthlyTemplateLayout(t *testing.T) {
	month := time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC)
	shiftsFor := func(userID int64, name, startsAt, endsAt string) staffScheduleExportGridRow {
		shift := staffScheduleExportRow{
			date: month, userID: userID, name: name, status: "scheduled", startsAt: startsAt, endsAt: endsAt,
		}
		return staffScheduleExportGridRow{
			userID: userID, name: name, startsAt: startsAt, endsAt: endsAt,
			shifts: map[string]staffScheduleExportRow{month.Format("2006-01-02"): shift},
		}
	}
	content, err := buildMonthlyStaffScheduleWorkbook(month, month.AddDate(0, 1, 0), "สาขาทดสอบ", map[string]bool{}, nil, []staffScheduleExportGridRow{
		shiftsFor(1, "กะเช้า", "08:00", "17:00"),
		shiftsFor(2, "กะสาย", "09:00", "18:00"),
		shiftsFor(3, "กะบ่าย", "13:00", "22:00"),
	})
	if err != nil {
		t.Fatalf("สร้างไฟล์ Excel แบบรายสัปดาห์ไม่ได้: %v", err)
	}
	workbook, err := excelize.OpenReader(bytes.NewReader(content.Bytes()))
	if err != nil {
		t.Fatalf("เปิดไฟล์ Excel ที่สร้างไม่ได้: %v", err)
	}
	defer workbook.Close()
	if value, err := workbook.GetCellValue("ตารางงาน", "C3"); err != nil || value != "1" {
		t.Fatalf("หัวตารางวันที่ 1 = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A5"); err != nil || value != "กะเช้า" {
		t.Fatalf("แถวพนักงานกะเช้า = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A6"); err != nil || value != "กะสาย" {
		t.Fatalf("แถวพนักงานกะสาย = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "A7"); err != nil || value != "กะบ่าย" {
		t.Fatalf("แถวพนักงานกะบ่าย = %q, err = %v", value, err)
	}
	if value, err := workbook.GetCellValue("ตารางงาน", "C5"); err != nil || value != "08:00\n17:00" {
		t.Fatalf("เวลากะเช้า = %q, err = %v", value, err)
	}
	titleStyleID, err := workbook.GetCellStyle("ตารางงาน", "A1")
	if err != nil {
		t.Fatalf("อ่านรูปแบบหัวเรื่อง Excel ไม่ได้: %v", err)
	}
	titleStyle, err := workbook.GetStyle(titleStyleID)
	if err != nil {
		t.Fatalf("อ่านรายละเอียดรูปแบบหัวเรื่อง Excel ไม่ได้: %v", err)
	}
	if titleStyle.Font == nil || titleStyle.Font.Family != "Tahoma" || titleStyle.Font.Size < 18 {
		t.Fatalf("หัวเรื่องต้องใช้ตัวอักษร Tahoma ขนาดใหญ่: %#v", titleStyle.Font)
	}
	shiftStyleID, err := workbook.GetCellStyle("ตารางงาน", "C5")
	if err != nil {
		t.Fatalf("อ่านรูปแบบกะงาน Excel ไม่ได้: %v", err)
	}
	shiftStyle, err := workbook.GetStyle(shiftStyleID)
	if err != nil {
		t.Fatalf("อ่านรายละเอียดรูปแบบกะงาน Excel ไม่ได้: %v", err)
	}
	if shiftStyle.Font == nil || shiftStyle.Font.Family != "Tahoma" || shiftStyle.Font.Size < 12 {
		t.Fatalf("ตารางกะต้องใช้ตัวอักษร Tahoma ที่อ่านง่าย: %#v", shiftStyle.Font)
	}
	if shiftStyle.Fill.Type != "pattern" || len(shiftStyle.Fill.Color) == 0 || shiftStyle.Fill.Color[0] != "E4F4E7" {
		t.Fatalf("กะงานต้องมีพื้นหลังสีอ่อนเพื่อเพิ่มความอ่านง่าย: %#v", shiftStyle.Fill)
	}
	height, err := workbook.GetRowHeight("ตารางงาน", 5)
	if err != nil {
		t.Fatalf("อ่านความสูงแถวพนักงาน Excel ไม่ได้: %v", err)
	}
	if height < 44 {
		t.Fatalf("แถวพนักงานต้องมีความสูงพอสำหรับตัวอักษรขนาดใหญ่: %v", height)
	}
	panes, err := workbook.GetPanes("ตารางงาน")
	if err != nil || !panes.Freeze || panes.XSplit != 2 || panes.YSplit != 4 || panes.TopLeftCell != "C5" {
		t.Fatalf("การตรึงแถวและคอลัมน์ = %#v, err = %v", panes, err)
	}
}

func TestBuildMonthlyStaffScheduleWorkbookHighlightsCompensatoryDayOff(t *testing.T) {
	month := time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC)
	content, err := buildMonthlyStaffScheduleWorkbook(month, month.AddDate(0, 1, 0), "สาขาทดสอบ", map[string]bool{}, nil, []staffScheduleExportGridRow{{
		userID: 1, name: "พนักงานทดสอบ", startsAt: "08:00", endsAt: "17:00",
		shifts: map[string]staffScheduleExportRow{
			month.Format("2006-01-02"): {
				date: month, userID: 1, name: "พนักงานทดสอบ", status: "day_off", leaveType: "วันหยุดชดเชยวันนักขัตฤกษ์: วันทดสอบ",
			},
		},
	}})
	if err != nil {
		t.Fatalf("สร้างไฟล์ Excel วันหยุดชดเชยไม่ได้: %v", err)
	}
	workbook, err := excelize.OpenReader(bytes.NewReader(content.Bytes()))
	if err != nil {
		t.Fatalf("เปิดไฟล์ Excel วันหยุดชดเชยไม่ได้: %v", err)
	}
	defer workbook.Close()
	if value, err := workbook.GetCellValue("ตารางงาน", "C5"); err != nil || value != "หยุดชดเชย" {
		t.Fatalf("ข้อความวันหยุดชดเชย = %q, err = %v", value, err)
	}
	styleID, err := workbook.GetCellStyle("ตารางงาน", "C5")
	if err != nil {
		t.Fatalf("อ่านรูปแบบวันหยุดชดเชยไม่ได้: %v", err)
	}
	style, err := workbook.GetStyle(styleID)
	if err != nil {
		t.Fatalf("อ่านรายละเอียดรูปแบบวันหยุดชดเชยไม่ได้: %v", err)
	}
	if style.Fill.Type != "pattern" || len(style.Fill.Color) == 0 || style.Fill.Color[0] != "DDEEFF" {
		t.Fatalf("สีวันหยุดชดเชยต้องต่างจากวันหยุดปกติ: %#v", style.Fill)
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
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,default_second_starts_at,default_second_ends_at,default_second_shift_days) VALUES($1,$2,$3,'hash','cashier',$4,'08:00','17:00','11:30','20:30',ARRAY[1,2,3,4,5,6,7]) RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID).Scan(&userIDs[index]); err != nil {
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

func TestGenerateStaffSchedulesRotatesTwoEmployeesUsingTheirConfiguredShiftTimes(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	fixtureID := time.Now().UnixNano()
	const monthKey = "2026-10"

	var branchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, fmt.Sprintf("สาขาทดสอบสลับกะจากเวลาที่ตั้ง-%d", fixtureID), fmt.Sprintf("CONFIGURED-WEEKLY-SWAP-%d", fixtureID)).Scan(&branchID); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	userIDs := make([]int64, 2)
	for index, shift := range []struct{ startsAt, endsAt string }{{"08:00", "17:00"}, {"11:30", "20:30"}} {
		username := fmt.Sprintf("configured-weekly-swap-%d-%d", fixtureID, index)
		if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at) VALUES($1,$2,$3,'hash','cashier',$4,$5::time,$6::time) RETURNING id`, "พนักงานทดสอบ", username, username+"@example.com", branchID, shift.startsAt, shift.endsAt).Scan(&userIDs[index]); err != nil {
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

	syncedThaiHolidayYears.Store(2026, struct{}{})
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

	readHours := func(userID int64, date string) (string, string) {
		t.Helper()
		var startsAt, endsAt string
		if err := db.QueryRow(`SELECT starts_at::text,ends_at::text FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, userID, date).Scan(&startsAt, &endsAt); err != nil {
			t.Fatalf("อ่านกะ %d วันที่ %s: %v", userID, date, err)
		}
		return startsAt, endsAt
	}
	for _, test := range []struct {
		userID                   int64
		date, wantStart, wantEnd string
	}{
		{userIDs[0], "2026-10-05", "08:00:00", "17:00:00"},
		{userIDs[1], "2026-10-05", "11:30:00", "20:30:00"},
		{userIDs[0], "2026-10-12", "11:30:00", "20:30:00"},
		{userIDs[1], "2026-10-12", "08:00:00", "17:00:00"},
	} {
		startsAt, endsAt := readHours(test.userID, test.date)
		if startsAt != test.wantStart || endsAt != test.wantEnd {
			t.Errorf("กะ user=%d วันที่ %s = %s-%s, want %s-%s", test.userID, test.date, startsAt, endsAt, test.wantStart, test.wantEnd)
		}
	}
}

func TestGenerateStaffSchedulesKeepsRotationTimePairsTogether(t *testing.T) {
	db := openStaffScheduleTestDB(t)
	for _, tc := range []struct {
		name, firstEnd, laterStart, laterEnd, secondStart, secondEnd, wantStart, wantEnd string
	}{
		{"same end does not select unrelated fallback end", "17:00", "11:30", "17:00", "12:00", "21:00", "11:30:00", "17:00:00"},
		{"fallback start and end come from the same employee", "17:00", "08:00", "17:00", "12:00", "18:00", "12:00:00", "18:00:00"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			fixtureID := time.Now().UnixNano()
			var branchID int64
			if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES($1,$2) RETURNING id`, tc.name, fmt.Sprintf("PAIR-%d", fixtureID)).Scan(&branchID); err != nil {
				t.Fatal(err)
			}
			userIDs := make([]int64, 2)
			t.Cleanup(func() {
				for _, id := range userIDs {
					_, _ = db.Exec(`DELETE FROM staff_shifts WHERE user_id=$1`, id)
					_, _ = db.Exec(`DELETE FROM users WHERE id=$1`, id)
				}
				_, _ = db.Exec(`DELETE FROM branches WHERE id=$1`, branchID)
			})
			for i, shift := range []struct{ start, end, secondStart, secondEnd string }{
				{"08:00", tc.firstEnd, "11:00", "22:00"},
				{tc.laterStart, tc.laterEnd, tc.secondStart, tc.secondEnd},
			} {
				username := fmt.Sprintf("pair-%d-%d", fixtureID, i)
				if err := db.QueryRow(`INSERT INTO users(name,username,email,password_hash,role,branch_id,default_starts_at,default_ends_at,default_second_starts_at,default_second_ends_at) VALUES($1,$1,$2,'hash','cashier',$3,$4::time,$5::time,$6::time,$7::time) RETURNING id`, username, username+"@example.com", branchID, shift.start, shift.end, shift.secondStart, shift.secondEnd).Scan(&userIDs[i]); err != nil {
					t.Fatal(err)
				}
			}
			syncedThaiHolidayYears.Store(2026, struct{}{})
			for attempt := 0; attempt < 2; attempt++ {
				response := httptest.NewRecorder()
				ctx, _ := gin.CreateTestContext(response)
				ctx.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(fmt.Sprintf(`{"month":"2026-10","branchId":%d}`, branchID)))
				ctx.Request.Header.Set("Content-Type", "application/json")
				ctx.Set("claims", &middleware.Claims{Role: "admin"})
				(&PlatformHandler{db: db}).GenerateStaffSchedules(ctx)
				if response.Code != http.StatusCreated {
					t.Fatalf("generate: %d %s", response.Code, response.Body.String())
				}
				for _, row := range []struct {
					user int64
					date string
				}{{userIDs[1], "2026-10-05"}, {userIDs[0], "2026-10-12"}} {
					var start, end string
					if err := db.QueryRow(`SELECT starts_at::text,ends_at::text FROM staff_shifts WHERE user_id=$1 AND shift_date=$2`, row.user, row.date).Scan(&start, &end); err != nil {
						t.Fatal(err)
					}
					if start != tc.wantStart || end != tc.wantEnd {
						t.Fatalf("attempt %d user %d date %s got %s-%s want %s-%s", attempt, row.user, row.date, start, end, tc.wantStart, tc.wantEnd)
					}
				}
			}
		})
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

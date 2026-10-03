package handler

import (
	"bufio"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"y/internal/middleware"
)

var syncedThaiHolidayYears sync.Map

func validSecondShiftDays(days []int) bool {
	seen := make(map[int]struct{}, len(days))
	for _, day := range days {
		if day < 1 || day > 7 {
			return false
		}
		if _, exists := seen[day]; exists {
			return false
		}
		seen[day] = struct{}{}
	}
	return true
}

func secondShiftDaysValue(days []int) string {
	values := make([]string, len(days))
	for index, day := range days {
		values[index] = strconv.Itoa(day)
	}
	return "{" + strings.Join(values, ",") + "}"
}

func normalizedDayOffPolicy(policy string) (string, bool) {
	if policy == "" {
		return "automatic", true
	}
	switch policy {
	case "automatic", "home_branch", "work_branch", "custom":
		return policy, true
	default:
		return "", false
	}
}

func customDaysOffValue(days []string) (string, bool) {
	seen := make(map[string]struct{}, len(days))
	values := make([]string, 0, len(days))
	for _, day := range days {
		parsed, err := time.Parse("2006-01-02", day)
		if err != nil || parsed.Format("2006-01-02") != day {
			return "", false
		}
		if _, exists := seen[day]; exists {
			return "", false
		}
		seen[day] = struct{}{}
		values = append(values, day)
	}
	return "{" + strings.Join(values, ",") + "}", true
}

func (h *PlatformHandler) validDayOffSource(c *gin.Context, sourceBranchID int64, franchiseeID *int64) bool {
	var exists bool
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM branches WHERE id=$1 AND franchisee_id IS NOT DISTINCT FROM $2)`, sourceBranchID, franchiseeID).Scan(&exists); err != nil {
		return false
	}
	return exists
}

func defaultStaffJobTitle(role string) string {
	if role == "branch_manager" {
		return "ผู้จัดการสาขา"
	}
	return "แคชเชียร์"
}

func employeeUsernamePrefix(branchCode string) string {
	parts := strings.FieldsFunc(strings.TrimSpace(branchCode), func(r rune) bool {
		return r == '-'
	})
	if len(parts) > 0 {
		last := parts[len(parts)-1]
		if _, err := strconv.Atoi(last); err == nil {
			parts = parts[:len(parts)-1]
		}
	}
	if len(parts) > 0 && strings.EqualFold(parts[0], "SBC") {
		parts = parts[1:]
	}
	prefix := strings.ToLower(strings.Join(parts, "-"))
	if prefix == "" {
		return "sbc"
	}
	return prefix
}

func (h *PlatformHandler) syncThaiPublicHolidays(c *gin.Context, year int) error {
	if _, synced := syncedThaiHolidayYears.Load(year); synced {
		return nil
	}
	start := fmt.Sprintf("%04d-01-01", year)
	end := fmt.Sprintf("%04d-01-01", year+1)
	var found bool
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM public_holidays WHERE holiday_date >= $1::date AND holiday_date < $2::date)`, start, end).Scan(&found); err != nil {
		return err
	}
	// Public holidays are display information only. Branches continue operating
	// and the schedule generator creates regular shifts on these dates.
	if found {
		syncedThaiHolidayYears.Store(year, struct{}{})
		return nil
	}

	request, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, "https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics", nil)
	if err != nil {
		return err
	}
	response, err := (&http.Client{Timeout: 8 * time.Second}).Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("thai holiday calendar returned %s", response.Status)
	}
	date, name, count := "", "", 0
	scanner := bufio.NewScanner(response.Body)
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case line == "BEGIN:VEVENT":
			date, name = "", ""
		case strings.HasPrefix(line, "DTSTART;VALUE=DATE:"):
			value := strings.TrimPrefix(line, "DTSTART;VALUE=DATE:")
			if len(value) == 8 && value[:4] == fmt.Sprintf("%04d", year) {
				date = value[:4] + "-" + value[4:6] + "-" + value[6:]
			}
		case strings.HasPrefix(line, "SUMMARY:"):
			name = strings.ReplaceAll(strings.TrimPrefix(line, "SUMMARY:"), `\,`, ",")
		case line == "END:VEVENT" && date != "" && name != "":
			if _, err := h.db.ExecContext(c.Request.Context(), `INSERT INTO public_holidays(holiday_date,name) VALUES($1,$2) ON CONFLICT (holiday_date) DO UPDATE SET name=EXCLUDED.name`, date, name); err != nil {
				return err
			}
			count++
		}
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("thai holiday calendar returned no holidays for %d", year)
	}
	syncedThaiHolidayYears.Store(year, struct{}{})
	return nil
}

func (h *PlatformHandler) ListPublicHolidays(c *gin.Context) {
	month, err := time.Parse("2006-01", c.DefaultQuery("month", time.Now().Format("2006-01")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "month ต้องอยู่ในรูปแบบ YYYY-MM"})
		return
	}
	if err := h.syncThaiPublicHolidays(c, month.Year()); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "message": "ไม่สามารถซิงก์วันนักขัตฤกษ์ได้"})
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT holiday_date::text,name FROM public_holidays WHERE holiday_date >= $1 AND holiday_date < $2 ORDER BY holiday_date`, month, month.AddDate(0, 1, 0))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์ได้"})
		return
	}
	defer rows.Close()
	holidayItems := []gin.H{}
	for rows.Next() {
		var date, name string
		if err := rows.Scan(&date, &name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์ได้"})
			return
		}
		holidayItems = append(holidayItems, gin.H{"date": date, "name": name})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": holidayItems})
}

func (h *PlatformHandler) CreateStaffMember(c *gin.Context) {
	var input struct {
		Name                   string   `json:"name" binding:"required"`
		Username               string   `json:"username"`
		Password               string   `json:"password" binding:"required,min=8"`
		Role                   string   `json:"role" binding:"required"`
		JobTitle               string   `json:"jobTitle"`
		BranchID               int64    `json:"branchId" binding:"required"`
		DefaultStartsAt        string   `json:"defaultStartsAt"`
		DefaultEndsAt          string   `json:"defaultEndsAt"`
		DefaultSecondStartsAt  string   `json:"defaultSecondStartsAt"`
		DefaultSecondEndsAt    string   `json:"defaultSecondEndsAt"`
		DefaultSecondShiftDays []int    `json:"defaultSecondShiftDays"`
		DayOffPolicy           string   `json:"dayOffPolicy"`
		DayOffSourceBranchID   *int64   `json:"dayOffSourceBranchId"`
		WeeklyDaysOff          []int    `json:"weeklyDaysOff"`
		CustomDaysOff          []string `json:"customDaysOff"`
	}
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรอกข้อมูลพนักงานให้ครบ และรหัสผ่านอย่างน้อย 8 ตัวอักษร"})
		return
	}
	if input.Role != "cashier" && input.Role != "branch_manager" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ตำแหน่งพนักงานไม่ถูกต้อง"})
		return
	}
	input.JobTitle = strings.TrimSpace(input.JobTitle)
	if input.JobTitle == "" {
		input.JobTitle = defaultStaffJobTitle(input.Role)
	}
	claims := middleware.ClaimsFrom(c)
	var franchiseeID *int64
	var branchCode string
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT franchisee_id, code FROM branches WHERE id=$1`, input.BranchID).Scan(&franchiseeID, &branchCode); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบสาขาที่เลือก"})
		return
	}
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok || branchID != input.BranchID || claims.FranchiseeID == nil || franchiseeID == nil || *franchiseeID != *claims.FranchiseeID {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "เพิ่มพนักงานได้เฉพาะสาขาแฟรนไชส์ของคุณ"})
			return
		}
	} else if franchiseeID != nil {
		// Keep the Admin staff workspace separate from franchise staff.
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "เพิ่มพนักงานแฟรนไชส์จากบัญชีแฟรนไชส์ของสาขานั้น"})
		return
	}
	username := strings.ToLower(strings.TrimSpace(input.Username))
	if username == "" {
		prefix := employeeUsernamePrefix(branchCode)
		var latestSequence int
		if err := h.db.QueryRowContext(c.Request.Context(), `
			SELECT COALESCE(MAX((regexp_match(LOWER(username), '-([0-9]+)$'))[1]::int), 0)
			FROM users
			WHERE LOWER(username) LIKE $1
		`, prefix+"-%").Scan(&latestSequence); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างชื่อผู้ใช้พนักงานได้"})
			return
		}
		username = fmt.Sprintf("%s-%03d", prefix, latestSequence+1)
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างบัญชีพนักงานได้"})
		return
	}
	var id int64
	if input.DefaultStartsAt == "" || input.DefaultEndsAt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุเวลาเข้างานและเวลาออกงานของกะที่ 1"})
		return
	}
	if (input.DefaultSecondStartsAt == "") != (input.DefaultSecondEndsAt == "") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หากเพิ่มกะที่ 2 กรุณาระบุเวลาเข้างานและเวลาออกงานให้ครบ"})
		return
	}
	if !validSecondShiftDays(input.DefaultSecondShiftDays) || (input.DefaultSecondStartsAt != "" && len(input.DefaultSecondShiftDays) == 0) || (input.DefaultSecondStartsAt == "" && len(input.DefaultSecondShiftDays) > 0) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาเลือกวันทำงานของกะที่ 2 ให้ถูกต้อง"})
		return
	}
	dayOffPolicy, validPolicy := normalizedDayOffPolicy(input.DayOffPolicy)
	customDaysOff, validCustomDaysOff := customDaysOffValue(input.CustomDaysOff)
	if !validPolicy || !validSecondShiftDays(input.WeeklyDaysOff) || !validCustomDaysOff || (dayOffPolicy == "custom" && len(input.WeeklyDaysOff) == 0 && len(input.CustomDaysOff) == 0) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "การตั้งค่าวันหยุดไม่ถูกต้อง"})
		return
	}
	dayOffSourceBranchID := input.DayOffSourceBranchID
	if dayOffSourceBranchID == nil {
		dayOffSourceBranchID = &input.BranchID
	}
	if dayOffPolicy == "home_branch" && !h.validDayOffSource(c, *dayOffSourceBranchID, franchiseeID) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบสาขาอ้างอิงวันหยุด"})
		return
	}
	err = h.db.QueryRowContext(c.Request.Context(), `INSERT INTO users(name,username,email,password_hash,role,job_title,franchisee_id,branch_id,default_starts_at,default_ends_at,default_second_starts_at,default_second_ends_at,default_second_shift_days,day_off_policy,day_off_source_branch_id,weekly_days_off,custom_days_off) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULLIF($11,'')::time,NULLIF($12,'')::time,$13::integer[],$14,$15,$16::smallint[],$17::date[]) RETURNING id`, strings.TrimSpace(input.Name), username, username+"@superblackcoffee.local", string(passwordHash), input.Role, input.JobTitle, franchiseeID, input.BranchID, input.DefaultStartsAt, input.DefaultEndsAt, input.DefaultSecondStartsAt, input.DefaultSecondEndsAt, secondShiftDaysValue(input.DefaultSecondShiftDays), dayOffPolicy, dayOffSourceBranchID, secondShiftDaysValue(input.WeeklyDaysOff), customDaysOff).Scan(&id)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "username นี้ถูกใช้งานแล้ว หรือไม่พบสาขาที่เลือก"})
		return
	}
	h.recordAudit(c, input.BranchID, "user", id, "create", gin.H{"username": username, "role": input.Role, "jobTitle": input.JobTitle})
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) UpdateStaffMember(c *gin.Context) {
	var input struct {
		Name                   string   `json:"name" binding:"required"`
		Role                   string   `json:"role" binding:"required"`
		JobTitle               string   `json:"jobTitle"`
		BranchID               int64    `json:"branchId" binding:"required"`
		DefaultStartsAt        string   `json:"defaultStartsAt"`
		DefaultEndsAt          string   `json:"defaultEndsAt"`
		DefaultSecondStartsAt  string   `json:"defaultSecondStartsAt"`
		DefaultSecondEndsAt    string   `json:"defaultSecondEndsAt"`
		DefaultSecondShiftDays []int    `json:"defaultSecondShiftDays"`
		DayOffPolicy           string   `json:"dayOffPolicy"`
		DayOffSourceBranchID   *int64   `json:"dayOffSourceBranchId"`
		WeeklyDaysOff          []int    `json:"weeklyDaysOff"`
		CustomDaysOff          []string `json:"customDaysOff"`
	}
	if c.ShouldBindJSON(&input) != nil || (input.Role != "cashier" && input.Role != "branch_manager") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลพนักงานไม่ถูกต้อง"})
		return
	}
	input.JobTitle = strings.TrimSpace(input.JobTitle)
	if input.JobTitle == "" {
		input.JobTitle = defaultStaffJobTitle(input.Role)
	}
	claims := middleware.ClaimsFrom(c)
	if input.DefaultStartsAt == "" || input.DefaultEndsAt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุเวลาเข้างานและเวลาออกงานของกะที่ 1"})
		return
	}
	if (input.DefaultSecondStartsAt == "") != (input.DefaultSecondEndsAt == "") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หากเพิ่มกะที่ 2 กรุณาระบุเวลาเข้างานและเวลาออกงานให้ครบ"})
		return
	}
	if !validSecondShiftDays(input.DefaultSecondShiftDays) || (input.DefaultSecondStartsAt != "" && len(input.DefaultSecondShiftDays) == 0) || (input.DefaultSecondStartsAt == "" && len(input.DefaultSecondShiftDays) > 0) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาเลือกวันทำงานของกะที่ 2 ให้ถูกต้อง"})
		return
	}
	dayOffPolicy, validPolicy := normalizedDayOffPolicy(input.DayOffPolicy)
	customDaysOff, validCustomDaysOff := customDaysOffValue(input.CustomDaysOff)
	if !validPolicy || !validSecondShiftDays(input.WeeklyDaysOff) || !validCustomDaysOff || (dayOffPolicy == "custom" && len(input.WeeklyDaysOff) == 0 && len(input.CustomDaysOff) == 0) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "การตั้งค่าวันหยุดไม่ถูกต้อง"})
		return
	}
	dayOffSourceBranchID := input.DayOffSourceBranchID
	if dayOffSourceBranchID == nil {
		dayOffSourceBranchID = &input.BranchID
	}
	query := `UPDATE users SET name=$1,role=$2,job_title=$3,branch_id=$4,default_starts_at=$5,default_ends_at=$6,default_second_starts_at=NULLIF($7,'')::time,default_second_ends_at=NULLIF($8,'')::time,default_second_shift_days=$9::integer[],day_off_policy=$10,day_off_source_branch_id=$11,weekly_days_off=$12::smallint[],custom_days_off=$13::date[] WHERE id=$14 AND role IN ('cashier','branch_manager') AND franchisee_id IS NULL`
	args := []any{strings.TrimSpace(input.Name), input.Role, input.JobTitle, input.BranchID, input.DefaultStartsAt, input.DefaultEndsAt, input.DefaultSecondStartsAt, input.DefaultSecondEndsAt, secondShiftDaysValue(input.DefaultSecondShiftDays), dayOffPolicy, dayOffSourceBranchID, secondShiftDaysValue(input.WeeklyDaysOff), customDaysOff, c.Param("id")}
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok || branchID != input.BranchID {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "ไม่มีสิทธิ์แก้ไขพนักงานนี้"})
			return
		}
		query = `UPDATE users SET name=$1,role=$2,job_title=$3,default_starts_at=$5,default_ends_at=$6,default_second_starts_at=NULLIF($7,'')::time,default_second_ends_at=NULLIF($8,'')::time,default_second_shift_days=$9::integer[],day_off_policy=$10,day_off_source_branch_id=$11,weekly_days_off=$12::smallint[],custom_days_off=$13::date[] WHERE id=$14 AND role IN ('cashier','branch_manager') AND branch_id=$4 AND franchisee_id=$15`
		args = append(args, *claims.FranchiseeID)
	}
	if dayOffPolicy == "home_branch" && !h.validDayOffSource(c, *dayOffSourceBranchID, claims.FranchiseeID) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบสาขาอ้างอิงวันหยุด"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขพนักงานได้"})
		return
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(c.Request.Context(), query, args...)
	if err != nil {
		_ = c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขพนักงานได้"})
		return
	}
	if rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบพนักงาน"})
		return
	}
	// Existing scheduled shifts keep their own persisted hours, so changing a
	// staff member's defaults must also update upcoming unworked shifts.
	_, err = tx.ExecContext(c.Request.Context(), `
		UPDATE staff_shifts AS shift
		SET
			starts_at = CASE WHEN cardinality(staff.default_second_shift_days) > 0
				THEN CASE WHEN EXTRACT(ISODOW FROM shift.shift_date)::int = ANY(staff.default_second_shift_days)
					THEN COALESCE(staff.default_second_starts_at, staff.default_starts_at)
					ELSE staff.default_starts_at
				END
				WHEN ((EXTRACT(DAY FROM shift.shift_date)::int + shift.user_id) % 2) = 0
				THEN staff.default_starts_at
				ELSE COALESCE(staff.default_second_starts_at, staff.default_starts_at)
			END,
			ends_at = CASE WHEN cardinality(staff.default_second_shift_days) > 0
				THEN CASE WHEN EXTRACT(ISODOW FROM shift.shift_date)::int = ANY(staff.default_second_shift_days)
					THEN COALESCE(staff.default_second_ends_at, staff.default_ends_at)
					ELSE staff.default_ends_at
				END
				WHEN ((EXTRACT(DAY FROM shift.shift_date)::int + shift.user_id) % 2) = 0
				THEN staff.default_ends_at
				ELSE COALESCE(staff.default_second_ends_at, staff.default_ends_at)
			END
		FROM users AS staff
		WHERE shift.user_id = staff.id
			AND shift.user_id = $1
			AND shift.branch_id = staff.branch_id
			AND shift.status = 'scheduled'
			AND shift.shift_date >= CURRENT_DATE
			AND NOT EXISTS (
				SELECT 1
				FROM staff_attendance AS attendance
				WHERE attendance.user_id = shift.user_id
					AND attendance.branch_id = shift.branch_id
					AND attendance.work_date = shift.shift_date
			)
	`, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตกะงานของพนักงานได้"})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขพนักงานได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": c.Param("id")}})
}

func (h *PlatformHandler) DeleteStaffMember(c *gin.Context) {
	claims := middleware.ClaimsFrom(c)
	query := `DELETE FROM users WHERE id=$1 AND role IN ('cashier','branch_manager') AND franchisee_id IS NULL`
	args := []any{c.Param("id")}
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok {
			return
		}
		query = `DELETE FROM users WHERE id=$1 AND role IN ('cashier','branch_manager') AND branch_id=$2 AND franchisee_id=$3`
		args = append(args, branchID, *claims.FranchiseeID)
	}
	result, err := h.db.ExecContext(c.Request.Context(), query, args...)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบพนักงาน"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PlatformHandler) ListStaffSchedules(c *gin.Context) {
	month, err := time.Parse("2006-01", c.DefaultQuery("month", time.Now().Format("2006-01")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "month ต้องอยู่ในรูปแบบ YYYY-MM"})
		return
	}
	nextMonth := month.AddDate(0, 1, 0)
	claims := middleware.ClaimsFrom(c)
	query := `SELECT s.id,s.user_id,u.name,s.branch_id,s.shift_date,s.starts_at,s.ends_at,s.status,COALESCE(s.leave_type,'') FROM staff_shifts s JOIN users u ON u.id=s.user_id JOIN branches b ON b.id=s.branch_id WHERE b.franchisee_id IS NULL AND u.franchisee_id IS NULL AND s.shift_date >= $1 AND s.shift_date < $2`
	args := []any{month, nextMonth}
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok || claims.FranchiseeID == nil {
			return
		}
		query = `SELECT s.id,s.user_id,u.name,s.branch_id,s.shift_date,s.starts_at,s.ends_at,s.status,COALESCE(s.leave_type,'') FROM staff_shifts s JOIN users u ON u.id=s.user_id JOIN branches b ON b.id=s.branch_id WHERE b.franchisee_id=$1 AND u.franchisee_id=$1 AND s.branch_id=$2 AND s.shift_date >= $3 AND s.shift_date < $4`
		args = []any{*claims.FranchiseeID, branchID, month, nextMonth}
	}
	query += ` ORDER BY s.shift_date,s.starts_at,u.name`
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถโหลดตารางงานได้"})
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, userID int64
		var branchID *int64
		var name, status, start, end, leaveType string
		var date time.Time
		if err := rows.Scan(&id, &userID, &name, &branchID, &date, &start, &end, &status, &leaveType); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านตารางงานได้"})
			return
		}
		items = append(items, gin.H{"id": id, "userId": userID, "name": name, "branchId": branchID, "date": date.Format("2006-01-02"), "startsAt": start, "endsAt": end, "status": status, "leaveType": leaveType})
	}
	c.JSON(200, gin.H{"success": true, "data": items})
}

func (h *PlatformHandler) UpdateStaffShift(c *gin.Context) {
	var input struct {
		ShiftDate *string `json:"shiftDate"`
		BranchID  *int64  `json:"branchId"`
		Status    *string `json:"status"`
		LeaveType *string `json:"leaveType"`
	}
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลกะงานไม่ถูกต้อง"})
		return
	}
	if input.ShiftDate == nil && input.BranchID == nil && input.Status == nil && input.LeaveType == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ต้องระบุข้อมูลที่ต้องการแก้ไข"})
		return
	}
	if input.ShiftDate != nil {
		if _, err := time.Parse("2006-01-02", *input.ShiftDate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD"})
			return
		}
	}
	if input.Status != nil {
		valid := map[string]bool{"scheduled": true, "compensatory_work": true, "leave": true, "sick_leave": true, "personal_leave": true, "day_off": true}
		if !valid[*input.Status] {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "สถานะกะงานไม่ถูกต้อง"})
			return
		}
	}
	claims := middleware.ClaimsFrom(c)
	query := `UPDATE staff_shifts SET shift_date=COALESCE($1,shift_date),branch_id=COALESCE($2,branch_id),status=COALESCE($3,status),leave_type=CASE WHEN COALESCE($3,status)='scheduled' THEN NULL ELSE COALESCE($4,leave_type) END WHERE id=$5`
	args := []any{input.ShiftDate, input.BranchID, input.Status, input.LeaveType, c.Param("id")}
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok || (input.BranchID != nil && *input.BranchID != branchID) {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "แก้ไขได้เฉพาะตารางของสาขาแฟรนไชส์คุณ"})
			return
		}
		query += ` AND branch_id=$6`
		args = append(args, branchID)
	}
	result, err := h.db.ExecContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่สามารถย้ายหรือแก้ไขกะงานได้"})
		return
	}
	updated, _ := result.RowsAffected()
	if updated == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบกะงาน"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": c.Param("id")}})
}

func (h *PlatformHandler) ReplaceStaffShift(c *gin.Context) {
	var input struct {
		SourceShiftID int64 `json:"sourceShiftId" binding:"required"`
	}
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ต้องระบุกะงานของพนักงานที่มาทดแทน"})
		return
	}
	targetID := c.Param("id")
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเริ่มย้ายกะงานได้"})
		return
	}
	defer tx.Rollback()
	var sourceUserID int64
	var sourceStatus, targetStatus string
	claims := middleware.ClaimsFrom(c)
	sourceQuery := `SELECT user_id,status FROM staff_shifts WHERE id=$1`
	targetQuery := `SELECT status FROM staff_shifts WHERE id=$1`
	var scopeArgs []any
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok {
			return
		}
		sourceQuery += ` AND branch_id=$2`
		targetQuery += ` AND branch_id=$2`
		scopeArgs = []any{branchID}
	}
	sourceQuery += ` FOR UPDATE`
	targetQuery += ` FOR UPDATE`
	sourceArgs := []any{input.SourceShiftID}
	targetArgs := []any{targetID}
	if len(scopeArgs) > 0 {
		sourceArgs = append(sourceArgs, scopeArgs...)
		targetArgs = append(targetArgs, scopeArgs...)
	}
	if err := tx.QueryRowContext(c.Request.Context(), sourceQuery, sourceArgs...).Scan(&sourceUserID, &sourceStatus); err != nil || sourceStatus != "scheduled" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "เลือกได้เฉพาะกะที่กำลังทำงาน"})
		return
	}
	if err := tx.QueryRowContext(c.Request.Context(), targetQuery, targetArgs...).Scan(&targetStatus); err != nil || targetStatus == "scheduled" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วางทดแทนได้เฉพาะกะที่ลางานหรือหยุด"})
		return
	}
	if _, err := tx.ExecContext(c.Request.Context(), `UPDATE staff_shifts SET status='day_off',leave_type='ย้ายไปช่วยแทนกะ' WHERE id=$1`, input.SourceShiftID); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถย้ายกะต้นทางได้"})
		return
	}
	if _, err := tx.ExecContext(c.Request.Context(), `UPDATE staff_shifts SET user_id=$1,status='scheduled',leave_type=NULL WHERE id=$2`, sourceUserID, targetID); err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "พนักงานคนนี้มีกะงานในวันดังกล่าวแล้ว"})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกการแทนกะได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": targetID}})
}

func (h *PlatformHandler) GenerateStaffSchedules(c *gin.Context) {
	var input struct {
		Month    string `json:"month" binding:"required"`
		BranchID int64  `json:"branchId" binding:"required"`
	}
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ต้องระบุ month"})
		return
	}
	month, err := time.Parse("2006-01", input.Month)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "month ต้องอยู่ในรูปแบบ YYYY-MM"})
		return
	}
	claims := middleware.ClaimsFrom(c)
	var isHeadquarters bool
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT is_headquarters FROM branches WHERE id=$1`, input.BranchID).Scan(&isHeadquarters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบสาขาที่เลือก"})
		return
	}
	if isHeadquarters {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "สำนักงานใหญ่ใช้เวลางานมาตรฐาน จึงไม่ต้องจัดตารางกะ"})
		return
	}
	if claims.Role == "franchise_owner" {
		branchID, ok := h.branchScope(c)
		if !ok || input.BranchID != branchID {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "จัดตารางได้เฉพาะสาขาแฟรนไชส์ของคุณ"})
			return
		}
	}
	monthEnd := month.AddDate(0, 1, 0)
	if err := h.syncThaiPublicHolidays(c, month.Year()); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "message": "ไม่สามารถซิงก์วันนักขัตฤกษ์ได้"})
		return
	}
	staffCountQuery := `SELECT COUNT(*) FROM users u JOIN branches b ON b.id=u.branch_id WHERE u.role IN ('cashier','branch_manager') AND u.branch_id=$1 AND u.day_off_policy='automatic'`
	staffCountArgs := []any{input.BranchID}
	if claims.Role == "franchise_owner" {
		staffCountQuery += ` AND u.franchisee_id=$2 AND b.franchisee_id=$2`
		staffCountArgs = append(staffCountArgs, *claims.FranchiseeID)
	} else {
		staffCountQuery += ` AND u.franchisee_id IS NULL AND b.franchisee_id IS NULL`
	}
	var staffCount, availableWorkdays int
	if err := h.db.QueryRowContext(c.Request.Context(), staffCountQuery, staffCountArgs...).Scan(&staffCount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบจำนวนพนักงานได้"})
		return
	}
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT COUNT(*) FROM generate_series($1::date,$2::date - INTERVAL '1 day',INTERVAL '1 day') day WHERE EXTRACT(ISODOW FROM day)::int BETWEEN 1 AND 5 AND NOT EXISTS (SELECT 1 FROM public_holidays holiday WHERE holiday.holiday_date=day::date)`, month, monthEnd).Scan(&availableWorkdays); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบวันทำงานได้"})
		return
	}
	if staffCount*4 > availableWorkdays {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"success": false, "message": "จำนวนพนักงานมากเกินกว่าจะจัดวันหยุดประจำเดือน 4 วันต่อคนโดยไม่ให้วันหยุดชนกัน"})
		return
	}
	query := `WITH staff_members AS (
  SELECT u.id AS user_id,u.branch_id,u.default_starts_at,u.default_ends_at,
    u.default_second_starts_at,u.default_second_ends_at,u.default_second_shift_days,
    u.day_off_policy,u.day_off_source_branch_id,u.weekly_days_off,u.custom_days_off,
    b.work_days AS work_branch_work_days,b.is_headquarters AS work_branch_is_headquarters,
    source_branch.work_days AS source_branch_work_days,source_branch.is_headquarters AS source_branch_is_headquarters,
  ROW_NUMBER() OVER (PARTITION BY u.branch_id ORDER BY u.id)::int - 1 AS employee_offset,
  COUNT(*) OVER (PARTITION BY u.branch_id)::int AS branch_staff_count,
  FIRST_VALUE(COALESCE(u.default_starts_at,TIME '08:00')) OVER (
    PARTITION BY u.branch_id
    ORDER BY COALESCE(u.default_starts_at,TIME '08:00'),u.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS rotation_first_starts_at,
  FIRST_VALUE(COALESCE(u.default_ends_at,TIME '17:00')) OVER (
    PARTITION BY u.branch_id
    ORDER BY COALESCE(u.default_starts_at,TIME '08:00'),u.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS rotation_first_ends_at,
  COALESCE(
    NULLIF(
      LAST_VALUE(COALESCE(u.default_starts_at,TIME '08:00')) OVER (
        PARTITION BY u.branch_id
        ORDER BY COALESCE(u.default_starts_at,TIME '08:00'),u.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      ),
      FIRST_VALUE(COALESCE(u.default_starts_at,TIME '08:00')) OVER (
        PARTITION BY u.branch_id
        ORDER BY COALESCE(u.default_starts_at,TIME '08:00'),u.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      )
    ),
    FIRST_VALUE(u.default_second_starts_at) OVER (
      PARTITION BY u.branch_id ORDER BY u.default_second_starts_at DESC NULLS LAST,u.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ),
    COALESCE(u.default_starts_at,TIME '08:00')
  ) AS rotation_second_starts_at,
  COALESCE(
    CASE WHEN
      LAST_VALUE(COALESCE(u.default_starts_at,TIME '08:00')) OVER (
        PARTITION BY u.branch_id
        ORDER BY COALESCE(u.default_starts_at,TIME '08:00'),u.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      ) <> FIRST_VALUE(COALESCE(u.default_starts_at,TIME '08:00')) OVER (
        PARTITION BY u.branch_id
        ORDER BY COALESCE(u.default_starts_at,TIME '08:00'),u.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      ) THEN LAST_VALUE(COALESCE(u.default_ends_at,TIME '17:00')) OVER (
        PARTITION BY u.branch_id
        ORDER BY COALESCE(u.default_starts_at,TIME '08:00'),u.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      ) END,
    FIRST_VALUE(u.default_second_ends_at) OVER (
      PARTITION BY u.branch_id ORDER BY u.default_second_starts_at DESC NULLS LAST,u.id
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ),
    COALESCE(u.default_ends_at,TIME '17:00')
  ) AS rotation_second_ends_at
  FROM users u
  JOIN branches b ON b.id=u.branch_id
	LEFT JOIN branches source_branch ON source_branch.id=u.day_off_source_branch_id
  WHERE u.role IN ('cashier','branch_manager') AND u.branch_id=$3`
	if claims.Role == "franchise_owner" {
		query += ` AND u.franchisee_id=$4 AND b.franchisee_id=$4`
	} else {
		query += ` AND u.franchisee_id IS NULL AND b.franchisee_id IS NULL`
	}
	query += `
), calendar_days AS (
  SELECT staff.*,d::date AS shift_date
  FROM staff_members staff
  CROSS JOIN generate_series($1::date,$2::date - INTERVAL '1 day',INTERVAL '1 day') d
), eligible_days AS (
  SELECT c.*,
    ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.shift_date) AS day_number,
    COUNT(*) OVER (PARTITION BY c.user_id) AS eligible_days
  FROM calendar_days c
  WHERE c.day_off_policy='automatic'
	    AND EXTRACT(ISODOW FROM c.shift_date)::int BETWEEN 1 AND 5
    AND NOT EXISTS (SELECT 1 FROM public_holidays holiday WHERE holiday.holiday_date=c.shift_date)
		AND NOT EXISTS (
			SELECT 1
			FROM staff_shifts existing_shift
			WHERE existing_shift.user_id=c.user_id
				AND existing_shift.shift_date=c.shift_date
				AND (
					existing_shift.status NOT IN ('scheduled','day_off')
					OR COALESCE(existing_shift.leave_type,'') NOT IN ('','วันหยุดประจำสัปดาห์','วันหยุดประจำเดือน','วันหยุดนักขัตฤกษ์','วันหยุดตามสาขาอ้างอิง','วันหยุดนักขัตฤกษ์ตามสำนักงานใหญ่','วันหยุดตามสาขาที่ปฏิบัติงาน','วันหยุดประจำ','วันหยุดเฉพาะวันที่')
					OR EXISTS (
						SELECT 1
						FROM staff_attendance attendance
						WHERE attendance.user_id=existing_shift.user_id
							AND attendance.work_date=existing_shift.shift_date
							AND attendance.check_in_at IS NOT NULL
					)
				)
		)
), classified_days AS (
  SELECT c.*,
    e.day_number,
    GREATEST(1,FLOOR(e.eligible_days / 4.0)::int) AS quota_segment
  FROM calendar_days c
  LEFT JOIN eligible_days e
    ON e.user_id=c.user_id AND e.shift_date=c.shift_date
)
INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status,leave_type)
SELECT c.user_id,c.branch_id,c.shift_date,
  CASE
    WHEN c.branch_staff_count = 2 THEN
      CASE WHEN (((c.shift_date - DATE '2000-01-03') / 7 + c.employee_offset) % 2) = 0
        THEN c.rotation_first_starts_at
        ELSE c.rotation_second_starts_at
      END
    WHEN cardinality(c.default_second_shift_days) > 0 THEN
      CASE WHEN EXTRACT(ISODOW FROM c.shift_date)::int = ANY(c.default_second_shift_days)
        THEN COALESCE(c.default_second_starts_at,c.default_starts_at)
        ELSE c.default_starts_at
      END
    WHEN ((EXTRACT(DAY FROM c.shift_date)::int + c.user_id) % 2) = 0 THEN c.default_starts_at
    ELSE COALESCE(c.default_second_starts_at,c.default_starts_at)
  END,
  CASE
    WHEN c.branch_staff_count = 2 THEN
      CASE WHEN (((c.shift_date - DATE '2000-01-03') / 7 + c.employee_offset) % 2) = 0
        THEN c.rotation_first_ends_at
        ELSE c.rotation_second_ends_at
      END
    WHEN cardinality(c.default_second_shift_days) > 0 THEN
      CASE WHEN EXTRACT(ISODOW FROM c.shift_date)::int = ANY(c.default_second_shift_days)
        THEN COALESCE(c.default_second_ends_at,c.default_ends_at)
        ELSE c.default_ends_at
      END
    WHEN ((EXTRACT(DAY FROM c.shift_date)::int + c.user_id) % 2) = 0 THEN c.default_ends_at
    ELSE COALESCE(c.default_second_ends_at,c.default_ends_at)
  END,
  CASE
    WHEN c.day_off_policy='home_branch' AND (
      NOT (EXTRACT(ISODOW FROM c.shift_date)::int = ANY(COALESCE(c.source_branch_work_days, ARRAY[]::smallint[])))
      OR (COALESCE(c.source_branch_is_headquarters,false) AND EXISTS (SELECT 1 FROM public_holidays holiday WHERE holiday.holiday_date=c.shift_date))
    ) THEN 'day_off'
    WHEN c.day_off_policy='work_branch' AND (
      NOT (EXTRACT(ISODOW FROM c.shift_date)::int = ANY(COALESCE(c.work_branch_work_days, ARRAY[]::smallint[])))
      OR (c.work_branch_is_headquarters AND EXISTS (SELECT 1 FROM public_holidays holiday WHERE holiday.holiday_date=c.shift_date))
    ) THEN 'day_off'
    WHEN c.day_off_policy='custom' AND (
      c.shift_date = ANY(COALESCE(c.custom_days_off, ARRAY[]::date[]))
      OR EXTRACT(ISODOW FROM c.shift_date)::int = ANY(COALESCE(c.weekly_days_off, ARRAY[]::smallint[]))
    ) THEN 'day_off'
    WHEN c.day_off_policy='automatic' AND c.branch_staff_count > 1 AND c.day_number IS NOT NULL AND c.day_number IN (
      1 + (c.employee_offset % c.quota_segment),
      1 + c.quota_segment + (c.employee_offset % c.quota_segment),
      1 + (c.quota_segment * 2) + (c.employee_offset % c.quota_segment),
      1 + (c.quota_segment * 3) + (c.employee_offset % c.quota_segment)
    ) THEN 'day_off'
    ELSE 'scheduled'
  END,
  CASE
    WHEN c.day_off_policy='home_branch' AND COALESCE(c.source_branch_is_headquarters,false) AND EXISTS (SELECT 1 FROM public_holidays holiday WHERE holiday.holiday_date=c.shift_date) THEN 'วันหยุดนักขัตฤกษ์ตามสำนักงานใหญ่'
    WHEN c.day_off_policy='home_branch' THEN 'วันหยุดตามสาขาอ้างอิง'
    WHEN c.day_off_policy='work_branch' THEN 'วันหยุดตามสาขาที่ปฏิบัติงาน'
    WHEN c.day_off_policy='custom' AND c.shift_date = ANY(COALESCE(c.custom_days_off, ARRAY[]::date[])) THEN 'วันหยุดเฉพาะวันที่'
    WHEN c.day_off_policy='custom' THEN 'วันหยุดประจำ'
    WHEN c.day_off_policy='automatic' AND c.branch_staff_count > 1 AND c.day_number IS NOT NULL AND c.day_number IN (
      1 + (c.employee_offset % c.quota_segment),
      1 + c.quota_segment + (c.employee_offset % c.quota_segment),
      1 + (c.quota_segment * 2) + (c.employee_offset % c.quota_segment),
      1 + (c.quota_segment * 3) + (c.employee_offset % c.quota_segment)
    ) THEN 'วันหยุดประจำเดือน'
    ELSE NULL
  END
FROM classified_days c
ON CONFLICT (user_id,shift_date) DO UPDATE SET
  starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,
  status=EXCLUDED.status,leave_type=EXCLUDED.leave_type
WHERE staff_shifts.status IN ('scheduled','day_off')
  AND COALESCE(staff_shifts.leave_type,'') IN ('','วันหยุดประจำสัปดาห์','วันหยุดประจำเดือน','วันหยุดนักขัตฤกษ์','วันหยุดตามสาขาอ้างอิง','วันหยุดนักขัตฤกษ์ตามสำนักงานใหญ่','วันหยุดตามสาขาที่ปฏิบัติงาน','วันหยุดประจำ','วันหยุดเฉพาะวันที่')
  AND NOT EXISTS (
    SELECT 1 FROM staff_attendance attendance
    WHERE attendance.user_id=staff_shifts.user_id
      AND attendance.work_date=staff_shifts.shift_date
      AND attendance.check_in_at IS NOT NULL
  )`
	args := []any{month, monthEnd, input.BranchID}
	if claims.Role == "franchise_owner" {
		args = append(args, *claims.FranchiseeID)
	}
	result, err := h.db.ExecContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถจัดตารางอัตโนมัติได้"})
		return
	}
	created, _ := result.RowsAffected()
	c.JSON(201, gin.H{"success": true, "data": gin.H{"created": created, "month": input.Month}})
}

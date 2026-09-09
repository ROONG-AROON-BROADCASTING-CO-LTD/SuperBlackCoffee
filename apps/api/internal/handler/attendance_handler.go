package handler

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"y/internal/middleware"
)

var thailandLocation = time.FixedZone("Asia/Bangkok", 7*60*60)

const attendancePINLoginLimit = 10
const attendancePINLoginWindow = 15 * time.Minute
const attendanceLateGraceMinutes = 10

type attendanceLoginInput struct {
	Username string `json:"username" binding:"required"`
	PIN      string `json:"pin"`
}

func (h *PlatformHandler) AttendanceLogin(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input attendanceLoginInput
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.Username) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ต้องระบุชื่อผู้ใช้"})
		return
	}
	loginKey := "sbc:attendance-pin:limit:" + c.ClientIP() + ":" + strings.ToLower(strings.TrimSpace(input.Username))
	if input.PIN != "" && !h.cache.AllowLogin(c, loginKey, attendancePINLoginLimit, attendancePINLoginWindow) {
		c.JSON(http.StatusTooManyRequests, gin.H{"success": false, "message": "ลองเข้าสู่ระบบใหม่ภายหลัง"})
		return
	}
	var userID, branchID int64
	var name, role, branchName, startsAt, endsAt string
	var pinHash *string
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT u.id,u.name,u.role,u.branch_id,b.name,COALESCE(u.default_starts_at,'08:00'),COALESCE(u.default_ends_at,'17:00'),u.attendance_pin_hash FROM users u JOIN branches b ON b.id=u.branch_id WHERE lower(u.username)=lower($1) AND u.role IN ('cashier','branch_manager')`, strings.TrimSpace(input.Username)).Scan(&userID, &name, &role, &branchID, &branchName, &startsAt, &endsAt, &pinHash)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "ไม่พบชื่อผู้ใช้พนักงาน"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเข้าสู่ระบบได้"})
		return
	}
	if pinHash == nil || *pinHash == "" {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"requiresPINSetup": true, "user": gin.H{"name": name}}})
		return
	}
	if input.PIN == "" {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"requiresPIN": true, "user": gin.H{"name": name}}})
		return
	}
	if len(input.PIN) != 6 || bcrypt.CompareHashAndPassword([]byte(*pinHash), []byte(input.PIN)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "PIN ไม่ถูกต้อง"})
		return
	}
	h.cache.Reset(c, loginKey)
	h.respondAttendanceSession(c, userID, branchID, name, role, branchName, startsAt, endsAt)
}

func (h *PlatformHandler) SetupAttendancePIN(c *gin.Context) {
	var input attendanceLoginInput
	if c.ShouldBindJSON(&input) != nil || len(input.PIN) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "PIN ต้องเป็นตัวเลข 6 หลัก"})
		return
	}
	for _, value := range input.PIN {
		if value < '0' || value > '9' {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "PIN ต้องเป็นตัวเลข 6 หลัก"})
			return
		}
	}
	var userID, branchID int64
	var name, role, branchName, startsAt, endsAt string
	var existing *string
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT u.id,u.name,u.role,u.branch_id,b.name,COALESCE(u.default_starts_at,'08:00'),COALESCE(u.default_ends_at,'17:00'),u.attendance_pin_hash FROM users u JOIN branches b ON b.id=u.branch_id WHERE lower(u.username)=lower($1) AND u.role IN ('cashier','branch_manager')`, strings.TrimSpace(input.Username)).Scan(&userID, &name, &role, &branchID, &branchName, &startsAt, &endsAt, &existing)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "ไม่พบชื่อผู้ใช้พนักงาน"})
		return
	}
	if existing != nil && *existing != "" {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ตั้ง PIN แล้ว กรุณาเข้าสู่ระบบด้วย PIN"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(input.PIN), bcrypt.DefaultCost)
	if _, err = h.db.ExecContext(c.Request.Context(), `UPDATE users SET attendance_pin_hash=$1 WHERE id=$2`, string(hash), userID); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตั้ง PIN ได้"})
		return
	}
	h.respondAttendanceSession(c, userID, branchID, name, role, branchName, startsAt, endsAt)
}

func (h *PlatformHandler) respondAttendanceSession(c *gin.Context, userID, branchID int64, name, role, branchName, startsAt, endsAt string) {
	claims := middleware.Claims{UserID: userID, Role: role, BranchID: &branchID, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)), IssuedAt: jwt.NewNumericDate(time.Now())}}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้าง access token ได้"})
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sbc_attendance_session", token, 30*24*60*60, "/api/v1", "", os.Getenv("APP_ENV") == "production", true)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": gin.H{"id": userID, "name": name, "role": role, "branchId": branchID, "branchName": branchName, "startsAt": startsAt, "endsAt": endsAt}}})
}

func (h *PlatformHandler) AttendanceSession(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	var name, role, branchName, startsAt, endsAt string
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT u.name,u.role,b.name,COALESCE(u.default_starts_at,'08:00'),COALESCE(u.default_ends_at,'17:00') FROM users u JOIN branches b ON b.id=u.branch_id WHERE u.id=$1 AND u.branch_id=$2 AND u.role IN ('cashier','branch_manager')`, claims.UserID, claims.BranchID).Scan(&name, &role, &branchName, &startsAt, &endsAt)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "เซสชันพนักงานไม่พร้อมใช้งาน"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": gin.H{"id": claims.UserID, "name": name, "role": role, "branchId": claims.BranchID, "branchName": branchName, "startsAt": startsAt, "endsAt": endsAt}}})
}

func (h *PlatformHandler) AttendanceLogout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sbc_attendance_session", "", -1, "/api/v1", "", os.Getenv("APP_ENV") == "production", true)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func attendanceClaims(c *gin.Context) (*middleware.Claims, bool) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil || (claims.Role != "cashier" && claims.Role != "branch_manager") {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "บัญชีนี้ไม่สามารถลงเวลาได้"})
		return nil, false
	}
	return claims, true
}

func attendanceToday() time.Time { return time.Now().In(thailandLocation) }

func canRecordAttendance(shiftStatus string) bool {
	return shiftStatus == "scheduled" || shiftStatus == "compensatory_work"
}

func (h *PlatformHandler) AttendanceToday(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	now := attendanceToday()
	var checkIn, checkOut *time.Time
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT check_in_at,check_out_at FROM staff_attendance WHERE user_id=$1 AND work_date=$2`, claims.UserID, now.Format("2006-01-02")).Scan(&checkIn, &checkOut)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสถานะลงเวลาได้"})
		return
	}
	var shiftStatus string
	shiftErr := h.db.QueryRowContext(c.Request.Context(), `SELECT status FROM staff_shifts WHERE user_id=$1 AND branch_id=$2 AND shift_date=$3`, claims.UserID, claims.BranchID, now.Format("2006-01-02")).Scan(&shiftStatus)
	if shiftErr != nil && shiftErr != sql.ErrNoRows {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบกะงานได้"})
		return
	}
	if shiftErr == sql.ErrNoRows {
		shiftStatus = ""
	}
	canActToday := canRecordAttendance(shiftStatus) && (checkIn == nil || checkOut == nil)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"date":                now.Format("2006-01-02"),
		"checkInAt":           checkIn,
		"checkOutAt":          checkOut,
		"checkedIn":           checkIn != nil && checkOut == nil,
		"shiftStatus":         shiftStatus,
		"canRecordAttendance": canActToday,
	}})
}

// AttendanceSummary returns the authenticated employee's current-month leave and punctuality totals.
func (h *PlatformHandler) AttendanceSummary(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	now := attendanceToday()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, thailandLocation)
	monthEnd := monthStart.AddDate(0, 1, 0)
	var sickLeaveCount, personalLeaveCount, otherLeaveCount, lateCount int
	err := h.db.QueryRowContext(c.Request.Context(), `
		SELECT
			COUNT(*) FILTER (WHERE status = 'sick_leave'),
			COUNT(*) FILTER (WHERE status = 'personal_leave'),
			COUNT(*) FILTER (WHERE status = 'leave'),
			(
				SELECT COUNT(*)
				FROM staff_attendance a
				JOIN staff_shifts scheduled_shift
					ON scheduled_shift.user_id = a.user_id
					AND scheduled_shift.shift_date = a.work_date
				WHERE a.user_id = $1
					AND a.work_date >= $2
					AND a.work_date < $3
					AND scheduled_shift.status IN ('scheduled', 'compensatory_work')
					AND a.check_in_at IS NOT NULL
					AND (a.check_in_at AT TIME ZONE 'Asia/Bangkok')::time > scheduled_shift.starts_at + ($4 * INTERVAL '1 minute')
			)
		FROM staff_shifts
		WHERE user_id = $1 AND shift_date >= $2 AND shift_date < $3`,
		claims.UserID,
		monthStart.Format("2006-01-02"),
		monthEnd.Format("2006-01-02"),
		attendanceLateGraceMinutes,
	).Scan(&sickLeaveCount, &personalLeaveCount, &otherLeaveCount, &lateCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสรุปการทำงานได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"month":              monthStart.Format("2006-01"),
		"sickLeaveCount":     sickLeaveCount,
		"personalLeaveCount": personalLeaveCount,
		"otherLeaveCount":    otherLeaveCount,
		"lateCount":          lateCount,
	}})
}

func (h *PlatformHandler) CheckIn(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	now := attendanceToday()
	var shiftStatus string
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT status FROM staff_shifts WHERE user_id=$1 AND branch_id=$2 AND shift_date=$3`, claims.UserID, claims.BranchID, now.Format("2006-01-02")).Scan(&shiftStatus)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบกะงานของวันนี้"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบกะงานได้"})
		return
	}
	if !canRecordAttendance(shiftStatus) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันนี้ไม่ใช่วันทำงานของคุณ"})
		return
	}
	var checkIn *time.Time
	err = h.db.QueryRowContext(c.Request.Context(), `INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,work_date) DO NOTHING RETURNING check_in_at`, claims.UserID, claims.BranchID, now.Format("2006-01-02"), now).Scan(&checkIn)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วันนี้เช็กอินไปแล้ว"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเช็กอินได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"checkInAt": checkIn, "checkedIn": true}})
}

func (h *PlatformHandler) CheckOut(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	now := attendanceToday()
	var checkOut *time.Time
	err := h.db.QueryRowContext(c.Request.Context(), `UPDATE staff_attendance SET check_out_at=$1,updated_at=now() WHERE user_id=$2 AND work_date=$3 AND check_in_at IS NOT NULL AND check_out_at IS NULL RETURNING check_out_at`, now, claims.UserID, now.Format("2006-01-02")).Scan(&checkOut)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบรายการเช็กอินที่ยังไม่ได้เช็กเอาต์"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเช็กเอาต์ได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"checkOutAt": checkOut, "checkedIn": false}})
}

func (h *PlatformHandler) AttendanceHistory(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT work_date::text,check_in_at,check_out_at FROM staff_attendance WHERE user_id=$1 ORDER BY work_date DESC LIMIT 31`, claims.UserID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติการทำงานได้"})
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var date string
		var checkIn, checkOut *time.Time
		if err := rows.Scan(&date, &checkIn, &checkOut); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติการทำงานได้"})
			return
		}
		items = append(items, gin.H{"date": date, "checkInAt": checkIn, "checkOutAt": checkOut})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (h *PlatformHandler) CreateLeaveRequest(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	var input struct {
		LeaveDate         string `json:"leaveDate" binding:"required"`
		LeaveEndDate      string `json:"leaveEndDate" binding:"required"`
		LeaveType         string `json:"leaveType" binding:"required"`
		Reason            string `json:"reason" binding:"required"`
		ContactPhone      string `json:"contactPhone"`
		AdditionalDetails string `json:"additionalDetails"`
	}
	var attachmentHeaders []*multipart.FileHeader
	if strings.HasPrefix(c.ContentType(), "multipart/form-data") {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 26<<20)
		if err := c.Request.ParseMultipartForm(26 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไฟล์แนบมีขนาดใหญ่เกินกำหนด"})
			return
		}
		input.LeaveDate = c.PostForm("leaveDate")
		input.LeaveEndDate = c.PostForm("leaveEndDate")
		input.LeaveType = c.PostForm("leaveType")
		input.Reason = c.PostForm("reason")
		input.ContactPhone = c.PostForm("contactPhone")
		input.AdditionalDetails = c.PostForm("additionalDetails")
		form, formErr := c.MultipartForm()
		if formErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่สามารถอ่านไฟล์แนบได้"})
			return
		}
		attachmentHeaders = form.File["attachments"]
	} else if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลคำขอลาไม่ถูกต้อง"})
		return
	}
	if strings.TrimSpace(input.Reason) == "" || (input.LeaveType != "sick" && input.LeaveType != "personal" && input.LeaveType != "vacation" && input.LeaveType != "other") {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลคำขอลาไม่ถูกต้อง"})
		return
	}
	attachments, err := readLeaveRequestAttachments(attachmentHeaders)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	startDate, err := time.Parse("2006-01-02", input.LeaveDate)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "วันที่ลาไม่ถูกต้อง"})
		return
	}
	endDate, err := time.Parse("2006-01-02", input.LeaveEndDate)
	if err != nil || endDate.Before(startDate) || endDate.Sub(startDate).Hours() > 31*24 {
		c.JSON(400, gin.H{"success": false, "message": "ช่วงวันลาไม่ถูกต้อง"})
		return
	}
	if input.LeaveDate < attendanceToday().Format("2006-01-02") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ส่งคำขอลาย้อนหลังไม่ได้"})
		return
	}
	var exists bool
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM staff_leave_requests WHERE user_id=$1 AND leave_date <= $3 AND COALESCE(leave_end_date,leave_date) >= $2 AND status IN ('pending','approved'))`, claims.UserID, input.LeaveDate, input.LeaveEndDate).Scan(&exists); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบคำขอลาได้"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "มีคำขอลาสำหรับวันนี้อยู่แล้ว"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถส่งคำขอลาได้"})
		return
	}
	defer tx.Rollback()
	var id int64
	err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO staff_leave_requests(user_id,branch_id,leave_date,leave_end_date,leave_type,reason,contact_phone,additional_details) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, claims.UserID, claims.BranchID, input.LeaveDate, input.LeaveEndDate, input.LeaveType, strings.TrimSpace(input.Reason), strings.TrimSpace(input.ContactPhone), strings.TrimSpace(input.AdditionalDetails)).Scan(&id)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถส่งคำขอลาได้"})
		return
	}
	for _, attachment := range attachments {
		if _, err := tx.ExecContext(c.Request.Context(), `INSERT INTO staff_leave_request_attachments(leave_request_id,original_name,content_type,size_bytes,content) VALUES($1,$2,$3,$4,$5)`, id, attachment.name, attachment.contentType, len(attachment.content), attachment.content); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกไฟล์แนบได้"})
			return
		}
	}
	if err := tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถส่งคำขอลาได้"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "status": "pending"}})
}

type leaveRequestAttachment struct {
	name        string
	contentType string
	content     []byte
}

func readLeaveRequestAttachments(headers []*multipart.FileHeader) ([]leaveRequestAttachment, error) {
	if len(headers) > 5 {
		return nil, fmt.Errorf("แนบเอกสารได้สูงสุด 5 ไฟล์")
	}
	attachments := make([]leaveRequestAttachment, 0, len(headers))
	allowedTypes := map[string]bool{"image/jpeg": true, "image/png": true, "image/webp": true, "application/pdf": true}
	for _, header := range headers {
		if header.Size <= 0 || header.Size > 5<<20 {
			return nil, fmt.Errorf("ไฟล์แนบแต่ละไฟล์ต้องมีขนาดไม่เกิน 5 MB")
		}
		file, err := header.Open()
		if err != nil {
			return nil, fmt.Errorf("ไม่สามารถอ่านไฟล์แนบได้")
		}
		content, readErr := io.ReadAll(io.LimitReader(file, 5<<20+1))
		file.Close()
		if readErr != nil || len(content) == 0 || len(content) > 5<<20 {
			return nil, fmt.Errorf("ไฟล์แนบแต่ละไฟล์ต้องมีขนาดไม่เกิน 5 MB")
		}
		contentType := http.DetectContentType(content)
		if !allowedTypes[contentType] {
			return nil, fmt.Errorf("รองรับเฉพาะไฟล์ JPG, PNG, WEBP และ PDF")
		}
		name := filepath.Base(strings.TrimSpace(header.Filename))
		if name == "." || name == "" || len([]rune(name)) > 160 {
			return nil, fmt.Errorf("ชื่อไฟล์แนบไม่ถูกต้อง")
		}
		attachments = append(attachments, leaveRequestAttachment{name: name, contentType: contentType, content: content})
	}
	return attachments, nil
}

func (h *PlatformHandler) ListMyLeaveRequests(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,leave_date::text,COALESCE(leave_end_date,leave_date)::text,leave_type,reason,contact_phone,additional_details,status,created_at FROM staff_leave_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านคำขอลาได้"})
		return
	}
	defer rows.Close()
	attachmentsByRequest := map[int64][]gin.H{}
	attachmentRows, err := h.db.QueryContext(c.Request.Context(), `SELECT a.leave_request_id,a.id,a.original_name,a.content_type,a.size_bytes FROM staff_leave_request_attachments a JOIN staff_leave_requests l ON l.id=a.leave_request_id WHERE l.user_id=$1 ORDER BY a.id`, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านไฟล์แนบคำขอลาได้"})
		return
	}
	defer attachmentRows.Close()
	for attachmentRows.Next() {
		var requestID, attachmentID int64
		var name, contentType string
		var sizeBytes int
		if err := attachmentRows.Scan(&requestID, &attachmentID, &name, &contentType, &sizeBytes); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านไฟล์แนบคำขอลาได้"})
			return
		}
		attachmentsByRequest[requestID] = append(attachmentsByRequest[requestID], gin.H{"id": attachmentID, "name": name, "contentType": contentType, "sizeBytes": sizeBytes})
	}
	items := []gin.H{}
	for rows.Next() {
		var id int64
		var leaveDate, leaveEndDate, leaveType, reason, contactPhone, additionalDetails, status string
		var createdAt time.Time
		if err := rows.Scan(&id, &leaveDate, &leaveEndDate, &leaveType, &reason, &contactPhone, &additionalDetails, &status, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านคำขอลาได้"})
			return
		}
		items = append(items, gin.H{"id": id, "leaveDate": leaveDate, "leaveEndDate": leaveEndDate, "leaveType": leaveType, "reason": reason, "contactPhone": contactPhone, "additionalDetails": additionalDetails, "attachments": attachmentsByRequest[id], "status": status, "createdAt": createdAt})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

// DeleteMyLeaveRequest cancels a pending request. The attachment foreign key
// cascades, so cancelling also removes every document the employee attached.
func (h *PlatformHandler) DeleteMyLeaveRequest(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสคำขอลาไม่ถูกต้อง"})
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `DELETE FROM staff_leave_requests WHERE id=$1 AND user_id=$2 AND status='pending'`, id, claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถยกเลิกคำขอลาได้"})
		return
	}
	deleted, err := result.RowsAffected()
	if err != nil || deleted == 0 {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ยกเลิกได้เฉพาะคำขอที่รอพิจารณา"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) DownloadMyLeaveRequestAttachment(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	requestID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	attachmentID, attachmentErr := strconv.ParseInt(c.Param("attachmentId"), 10, 64)
	if err != nil || attachmentErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสไฟล์แนบไม่ถูกต้อง"})
		return
	}
	var name, contentType string
	var content []byte
	err = h.db.QueryRowContext(c.Request.Context(), `SELECT a.original_name,a.content_type,a.content FROM staff_leave_request_attachments a JOIN staff_leave_requests l ON l.id=a.leave_request_id WHERE a.id=$1 AND a.leave_request_id=$2 AND l.user_id=$3`, attachmentID, requestID, claims.UserID).Scan(&name, &contentType, &content)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบไฟล์แนบ"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปิดไฟล์แนบได้"})
		return
	}
	c.Header("Content-Disposition", `inline; filename="`+strings.ReplaceAll(name, `"`, "'")+`"`)
	c.Data(http.StatusOK, contentType, content)
}

func (h *PlatformHandler) DownloadLeaveRequestPDF(c *gin.Context) {
	claims, ok := attendanceClaims(c)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสคำขอลาไม่ถูกต้อง"})
		return
	}
	var data leaveRequestPDFData
	err = h.db.QueryRowContext(c.Request.Context(), `SELECT l.id,l.created_at,u.name,COALESCE(u.username,''),u.role,b.name,l.leave_type,l.leave_date,COALESCE(l.leave_end_date,l.leave_date),l.contact_phone,l.reason,l.additional_details,l.status FROM staff_leave_requests l JOIN users u ON u.id=l.user_id JOIN branches b ON b.id=l.branch_id WHERE l.id=$1 AND l.user_id=$2`, id, claims.UserID).Scan(&data.ID, &data.SubmittedAt, &data.Name, &data.EmployeeCode, &data.Position, &data.BranchName, &data.LeaveType, &data.LeaveDate, &data.LeaveEndDate, &data.ContactPhone, &data.Reason, &data.AdditionalDetails, &data.Status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบคำขอลา"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างเอกสารใบลาได้"})
		return
	}
	attachments, err := h.leaveRequestImageAttachments(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านเอกสารแนบใบลาได้"})
		return
	}
	pdf, err := leaveRequestPDF(data, attachments...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างเอกสารใบลาได้"})
		return
	}
	c.Header("Content-Disposition", `inline; filename="leave-request-`+strconv.FormatInt(id, 10)+`.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdf)
}

func (h *PlatformHandler) leaveRequestImageAttachments(ctx context.Context, leaveRequestID int64) ([]leaveRequestPDFAttachment, error) {
	rows, err := h.db.QueryContext(ctx, `SELECT original_name,content_type,content FROM staff_leave_request_attachments WHERE leave_request_id=$1 AND content_type IN ('image/jpeg','image/png') ORDER BY id`, leaveRequestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	attachments := []leaveRequestPDFAttachment{}
	for rows.Next() {
		var attachment leaveRequestPDFAttachment
		if err := rows.Scan(&attachment.Name, &attachment.ContentType, &attachment.Content); err != nil {
			return nil, err
		}
		attachments = append(attachments, attachment)
	}
	return attachments, rows.Err()
}

func attendanceManagementScope(c *gin.Context) (string, []any, bool) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "ไม่พบสิทธิ์การใช้งาน"})
		return "", nil, false
	}
	if claims.Role == "admin" {
		return "b.franchisee_id IS NULL AND u.franchisee_id IS NULL", nil, true
	}
	if claims.Role == "franchise_owner" && claims.FranchiseeID != nil {
		return "b.franchisee_id=$1 AND u.franchisee_id=$1", []any{*claims.FranchiseeID}, true
	}
	c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "คุณไม่มีสิทธิ์ดูข้อมูลลงเวลานี้"})
	return "", nil, false
}

// ListAttendanceManagement exposes attendance only within the caller's company or franchise workspace.
func (h *PlatformHandler) ListAttendanceManagement(c *gin.Context) {
	scope, args, ok := attendanceManagementScope(c)
	if !ok {
		return
	}
	month := c.DefaultQuery("month", attendanceToday().Format("2006-01"))
	start, err := time.ParseInLocation("2006-01", month, thailandLocation)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "month ต้องอยู่ในรูปแบบ YYYY-MM"})
		return
	}
	end := start.AddDate(0, 1, 0)
	placeholder := len(args) + 1
	query := `SELECT a.id,u.id,u.name,b.id,b.name,a.work_date::text,a.check_in_at,a.check_out_at
		FROM staff_attendance a JOIN users u ON u.id=a.user_id JOIN branches b ON b.id=a.branch_id
		WHERE ` + scope + ` AND a.work_date >= $` + strconv.Itoa(placeholder) + ` AND a.work_date < $` + strconv.Itoa(placeholder+1) + ` ORDER BY a.work_date DESC,u.name`
	args = append(args, start.Format("2006-01-02"), end.Format("2006-01-02"))
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายการลงเวลาได้"})
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, userID, branchID int64
		var name, branchName, date string
		var checkIn, checkOut *time.Time
		if err := rows.Scan(&id, &userID, &name, &branchID, &branchName, &date, &checkIn, &checkOut); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายการลงเวลาได้"})
			return
		}
		items = append(items, gin.H{"id": id, "userId": userID, "name": name, "branchId": branchID, "branchName": branchName, "date": date, "checkInAt": checkIn, "checkOutAt": checkOut})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (h *PlatformHandler) ListLeaveRequests(c *gin.Context) {
	scope, args, ok := attendanceManagementScope(c)
	if !ok {
		return
	}
	query := `SELECT l.id,u.name,COALESCE(u.username,''),u.role,b.name,l.leave_date::text,COALESCE(l.leave_end_date,l.leave_date)::text,l.leave_type,l.reason,COALESCE(l.contact_phone,''),COALESCE(l.additional_details,''),l.status,l.created_at,l.approved_at,COALESCE(approver.name,''),COALESCE(l.decision_note,'')
		FROM staff_leave_requests l JOIN users u ON u.id=l.user_id JOIN branches b ON b.id=l.branch_id
		LEFT JOIN users approver ON approver.id=l.approved_by
		WHERE ` + scope + ` ORDER BY l.leave_date DESC,l.created_at DESC LIMIT 100`
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านคำขอลาได้"})
		return
	}
	defer rows.Close()
	attachmentsByRequest := map[int64][]gin.H{}
	attachmentRows, err := h.db.QueryContext(c.Request.Context(), `SELECT a.leave_request_id,a.id,a.original_name,a.content_type,a.size_bytes FROM staff_leave_request_attachments a JOIN staff_leave_requests l ON l.id=a.leave_request_id JOIN users u ON u.id=l.user_id JOIN branches b ON b.id=l.branch_id WHERE `+scope+` ORDER BY a.id`, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านไฟล์แนบคำขอลาได้"})
		return
	}
	defer attachmentRows.Close()
	for attachmentRows.Next() {
		var requestID, attachmentID int64
		var name, contentType string
		var sizeBytes int
		if err := attachmentRows.Scan(&requestID, &attachmentID, &name, &contentType, &sizeBytes); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านไฟล์แนบคำขอลาได้"})
			return
		}
		attachmentsByRequest[requestID] = append(attachmentsByRequest[requestID], gin.H{"id": attachmentID, "name": name, "contentType": contentType, "sizeBytes": sizeBytes})
	}
	items := []gin.H{}
	for rows.Next() {
		var id int64
		var name, employeeCode, position, branchName, date, endDate, leaveType, reason, contactPhone, additionalDetails, status string
		var createdAt time.Time
		var approvedAt *time.Time
		var approvedBy, decisionNote string
		if err := rows.Scan(&id, &name, &employeeCode, &position, &branchName, &date, &endDate, &leaveType, &reason, &contactPhone, &additionalDetails, &status, &createdAt, &approvedAt, &approvedBy, &decisionNote); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านคำขอลาได้"})
			return
		}
		items = append(items, gin.H{"id": id, "name": name, "employeeCode": employeeCode, "position": position, "branchName": branchName, "leaveDate": date, "leaveEndDate": endDate, "leaveType": leaveType, "reason": reason, "contactPhone": contactPhone, "additionalDetails": additionalDetails, "attachments": attachmentsByRequest[id], "status": status, "createdAt": createdAt, "approvedAt": approvedAt, "approvedBy": approvedBy, "decisionNote": decisionNote})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (h *PlatformHandler) DownloadManagedLeaveRequestAttachment(c *gin.Context) {
	scope, args, ok := attendanceManagementScope(c)
	if !ok {
		return
	}
	requestID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	attachmentID, attachmentErr := strconv.ParseInt(c.Param("attachmentId"), 10, 64)
	if err != nil || attachmentErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสไฟล์แนบไม่ถูกต้อง"})
		return
	}
	attachmentPlaceholder := len(args) + 1
	requestPlaceholder := attachmentPlaceholder + 1
	args = append(args, attachmentID, requestID)
	var name, contentType string
	var content []byte
	query := `SELECT a.original_name,a.content_type,a.content FROM staff_leave_request_attachments a JOIN staff_leave_requests l ON l.id=a.leave_request_id JOIN users u ON u.id=l.user_id JOIN branches b ON b.id=l.branch_id WHERE ` + scope + ` AND a.id=$` + strconv.Itoa(attachmentPlaceholder) + ` AND l.id=$` + strconv.Itoa(requestPlaceholder)
	err = h.db.QueryRowContext(c.Request.Context(), query, args...).Scan(&name, &contentType, &content)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบไฟล์แนบ"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปิดไฟล์แนบได้"})
		return
	}
	c.Header("Content-Disposition", `inline; filename="`+strings.ReplaceAll(name, `"`, "'")+`"`)
	c.Data(http.StatusOK, contentType, content)
}

func (h *PlatformHandler) DownloadManagedLeaveRequestPDF(c *gin.Context) {
	scope, args, ok := attendanceManagementScope(c)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสคำขอลาไม่ถูกต้อง"})
		return
	}
	args = append(args, id)
	idPlaceholder := len(args)
	var data leaveRequestPDFData
	query := `SELECT l.id,l.created_at,u.name,COALESCE(u.username,''),u.role,b.name,l.leave_type,l.leave_date,COALESCE(l.leave_end_date,l.leave_date),l.contact_phone,l.reason,l.additional_details,l.status FROM staff_leave_requests l JOIN users u ON u.id=l.user_id JOIN branches b ON b.id=l.branch_id WHERE ` + scope + ` AND l.id=$` + strconv.Itoa(idPlaceholder)
	err = h.db.QueryRowContext(c.Request.Context(), query, args...).Scan(&data.ID, &data.SubmittedAt, &data.Name, &data.EmployeeCode, &data.Position, &data.BranchName, &data.LeaveType, &data.LeaveDate, &data.LeaveEndDate, &data.ContactPhone, &data.Reason, &data.AdditionalDetails, &data.Status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบคำขอลา"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างเอกสารใบลาได้"})
		return
	}
	attachments, err := h.leaveRequestImageAttachments(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านเอกสารแนบใบลาได้"})
		return
	}
	pdf, err := leaveRequestPDF(data, attachments...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างเอกสารใบลาได้"})
		return
	}
	c.Header("Content-Disposition", `attachment; filename="leave-request-`+strconv.FormatInt(id, 10)+`.pdf"`)
	c.Data(http.StatusOK, "application/pdf", pdf)
}

func (h *PlatformHandler) UpdateLeaveRequestStatus(c *gin.Context) {
	scope, args, ok := attendanceManagementScope(c)
	if !ok {
		return
	}
	var input struct {
		Status       string `json:"status" binding:"required"`
		DecisionNote string `json:"decisionNote"`
	}
	if c.ShouldBindJSON(&input) != nil || (input.Status != "approved" && input.Status != "rejected") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "สถานะคำขอลาไม่ถูกต้อง"})
		return
	}
	requestID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสคำขอลาไม่ถูกต้อง"})
		return
	}
	placeholder := len(args) + 1
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเริ่มอัปเดตคำขอลาได้"})
		return
	}
	defer tx.Rollback()
	query := `UPDATE staff_leave_requests l SET status=$` + strconv.Itoa(placeholder) + `,approved_by=$` + strconv.Itoa(placeholder+1) + `,approved_at=now(),decision_note=$` + strconv.Itoa(placeholder+2) + `,updated_at=now()
		FROM users u JOIN branches b ON b.id=u.branch_id WHERE l.id=$` + strconv.Itoa(placeholder+3) + ` AND l.status='pending' AND u.id=l.user_id AND ` + scope + ` RETURNING l.user_id,l.branch_id,l.leave_date::text,COALESCE(l.leave_end_date,l.leave_date)::text,l.leave_type`
	claims := middleware.ClaimsFrom(c)
	args = append(args, input.Status, claims.UserID, strings.TrimSpace(input.DecisionNote), requestID)
	var userID, branchID int64
	var leaveDate, leaveEndDate, leaveType string
	if err := tx.QueryRowContext(c.Request.Context(), query, args...).Scan(&userID, &branchID, &leaveDate, &leaveEndDate, &leaveType); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบคำขอลาในขอบเขตที่ดูแล"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตคำขอลาได้"})
		return
	}
	if input.Status == "approved" {
		shiftStatus := "leave"
		switch leaveType {
		case "sick":
			shiftStatus = "sick_leave"
		case "personal":
			shiftStatus = "personal_leave"
		}
		_, err = tx.ExecContext(c.Request.Context(), `INSERT INTO staff_shifts(user_id,branch_id,shift_date,starts_at,ends_at,status,leave_type)
			SELECT u.id,u.branch_id,dates.shift_date,COALESCE(u.default_starts_at,'08:00'),COALESCE(u.default_ends_at,'17:00'),$5,$6 FROM users u CROSS JOIN LATERAL generate_series($3::date,$4::date,interval '1 day') AS dates(shift_date) WHERE u.id=$1 AND u.branch_id=$2
			ON CONFLICT (user_id,shift_date) DO UPDATE SET status=EXCLUDED.status,leave_type=EXCLUDED.leave_type`, userID, branchID, leaveDate, leaveEndDate, shiftStatus, leaveType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตตารางกะจากคำขอลาได้"})
			return
		}
	}
	if err := recordAuditTx(c, tx, branchID, claims.UserID, "staff_leave_request", requestID, "update", gin.H{"status": input.Status, "decisionNote": strings.TrimSpace(input.DecisionNote)}); err != nil || tx.Commit() != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกการอนุมัติคำขอลาได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": requestID, "status": input.Status}})
}

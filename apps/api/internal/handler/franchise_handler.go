package handler

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"y/internal/middleware"
)

func (h *PlatformHandler) ListFranchisees(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,name,email,plan,status,created_at FROM franchisees ORDER BY created_at DESC`)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดึงรายชื่อแฟรนไชส์ได้"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64
		var name, email, plan, status string
		var created time.Time
		_ = rows.Scan(&id, &name, &email, &plan, &status, &created)
		result = append(result, gin.H{"id": id, "name": name, "email": email, "plan": plan, "status": status, "createdAt": created})
	}
	c.JSON(200, gin.H{"success": true, "data": result})
}

type franchiseInput struct {
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Plan       string `json:"plan" binding:"required,oneof=S M L"`
	BranchName string `json:"branchName" binding:"required"`
	BranchCode string `json:"branchCode" binding:"required"`
	BranchSize string `json:"branchSize" binding:"omitempty,oneof=S M L"`
	Username   string `json:"username"`
	Password   string `json:"password"`
}

type franchiseStatusInput struct {
	Status string `json:"status" binding:"required,oneof=active inactive"`
}

type branchSizeInput struct {
	Size string `json:"size" binding:"required,oneof=S M L"`
}

type companyBranchInput struct {
	Name              string   `json:"name" binding:"required"`
	Code              string   `json:"code" binding:"required"`
	Size              string   `json:"size" binding:"required,oneof=S M L"`
	Address           string   `json:"address"`
	OpensAt           string   `json:"opensAt"`
	ClosesAt          string   `json:"closesAt"`
	Latitude          *float64 `json:"latitude"`
	Longitude         *float64 `json:"longitude"`
	AttendanceRadiusM int      `json:"attendanceRadiusM"`
	WorkDays          []int    `json:"workDays"`
}

func validBranchWorkDays(days []int) bool {
	if len(days) == 0 {
		return false
	}
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

func branchWorkDaysValue(days []int) string {
	values := make([]string, len(days))
	for index, day := range days {
		values[index] = strconv.Itoa(day)
	}
	return "{" + strings.Join(values, ",") + "}"
}

func parseBranchWorkDays(value string) ([]int, error) {
	if value == "" {
		return []int{1, 2, 3, 4, 5}, nil
	}
	days := make([]int, 0, 7)
	for _, part := range strings.Split(value, ",") {
		day, err := strconv.Atoi(part)
		if err != nil {
			return nil, err
		}
		days = append(days, day)
	}
	if !validBranchWorkDays(days) {
		return nil, fmt.Errorf("invalid work days")
	}
	return days, nil
}

func validateCompanyBranchDetails(input companyBranchInput) bool {
	if (input.Latitude == nil) != (input.Longitude == nil) ||
		(input.Latitude != nil && (*input.Latitude < -90 || *input.Latitude > 90)) ||
		(input.Longitude != nil && (*input.Longitude < -180 || *input.Longitude > 180)) ||
		(input.AttendanceRadiusM != 0 && (input.AttendanceRadiusM < 25 || input.AttendanceRadiusM > 1000)) {
		return false
	}
	if input.WorkDays != nil && !validBranchWorkDays(input.WorkDays) {
		return false
	}
	for _, value := range []string{input.OpensAt, input.ClosesAt} {
		if value != "" {
			if _, err := time.Parse("15:04", value); err != nil {
				return false
			}
		}
	}
	return true
}

// Both ownership types select from the same central catalog by branch size.
func copyCompanyCatalog(c context.Context, tx *sql.Tx, branchID int64, size string) error {
	templateID, err := assignBranchCatalogTemplateTx(c, tx, branchID, size)
	if err != nil {
		return err
	}
	return syncCatalogTemplateToBranchTx(c, tx, templateID, branchID)
}

func copyFranchiseCatalog(c context.Context, tx *sql.Tx, branchID int64, size string) error {
	templateID, err := assignBranchCatalogTemplateTx(c, tx, branchID, size)
	if err != nil {
		return err
	}
	return syncCatalogTemplateToBranchTx(c, tx, templateID, branchID)
}

func (h *PlatformHandler) CreateFranchisee(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input franchiseInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลแฟรนไชส์ไม่ถูกต้อง"})
		return
	}
	if strings.TrimSpace(input.Username) == "" {
		input.Username = "franchise_" + strings.ReplaceAll(strings.Split(input.Email, "@")[0], ".", "_")
	}
	if len(input.Password) < 8 {
		input.Password = "Temporary!" + input.Username
	}
	if input.BranchSize == "" {
		input.BranchSize = input.Plan
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างแฟรนไชส์ได้"})
		return
	}
	defer tx.Rollback()
	var franchiseeID int64
	err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO franchisees(name,email,plan,status) VALUES($1,$2,$3,'invited') RETURNING id`, input.Name, input.Email, input.Plan).Scan(&franchiseeID)
	var branchID int64
	if err == nil {
		err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO branches(franchisee_id,name,code,size,status) VALUES($1,$2,$3,$4,'inactive') RETURNING id`, franchiseeID, input.BranchName, input.BranchCode, input.BranchSize).Scan(&branchID)
	}
	if err == nil {
		err = copyFranchiseCatalog(c.Request.Context(), tx, branchID, input.BranchSize)
	}
	if err == nil {
		passwordHash, hashErr := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
		if hashErr != nil {
			err = hashErr
		} else {
			_, err = tx.ExecContext(c.Request.Context(), `INSERT INTO users(name,username,email,password_hash,role,franchisee_id,branch_id) VALUES($1,$2,$3,$4,'franchise_owner',$5,$6)`, strings.TrimSpace(input.Name), strings.TrimSpace(input.Username), strings.TrimSpace(input.Email), string(passwordHash), franchiseeID, branchID)
		}
	}
	if err != nil {
		c.JSON(409, gin.H{"success": false, "message": "อีเมลแฟรนไชส์หรือรหัสสาขานี้มีอยู่แล้ว"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกแฟรนไชส์ได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	h.invalidateMenuSummaryCache(c)
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": franchiseeID, "status": "invited"}})
}

func (h *PlatformHandler) UpdateFranchiseeStatus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input franchiseStatusInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "สถานะแฟรนไชส์ไม่ถูกต้อง"})
		return
	}
	franchiseeID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || franchiseeID < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสแฟรนไชส์ไม่ถูกต้อง"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะแฟรนไชส์ได้"})
		return
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(c.Request.Context(), `UPDATE franchisees SET status=$1 WHERE id=$2`, input.Status, franchiseeID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะแฟรนไชส์ได้"})
		return
	}
	updated, _ := result.RowsAffected()
	if updated == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบแฟรนไชส์"})
		return
	}
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE branches SET status=$1 WHERE franchisee_id=$2`, input.Status, franchiseeID); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะสาขาได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกสถานะแฟรนไชส์ได้"})
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"id": franchiseeID, "status": input.Status}})
}

func (h *PlatformHandler) ListBranches(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	query := `SELECT b.id,b.name,b.code,b.size,b.status,b.franchisee_id,f.name,b.address,COALESCE(to_char(b.opens_at,'HH24:MI'),''),COALESCE(to_char(b.closes_at,'HH24:MI'),''),b.latitude,b.longitude,b.attendance_radius_m,b.is_headquarters,COALESCE(array_to_string(b.work_days,','),'') FROM branches b LEFT JOIN franchisees f ON f.id=b.franchisee_id`
	args := []any{}
	if claims.Role != "admin" {
		if claims.Role == "branch_manager" && claims.BranchID != nil {
			query += ` WHERE b.id=$1`
			args = append(args, *claims.BranchID)
		} else if claims.FranchiseeID != nil {
			query += ` WHERE b.franchisee_id=$1`
			args = append(args, *claims.FranchiseeID)
		} else {
			c.JSON(403, gin.H{"success": false, "message": "ต้องกำหนดสิทธิ์เข้าถึงสาขา"})
			return
		}
	}
	query += ` ORDER BY b.name`
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดึงรายชื่อสาขาได้"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64
		var name, code, size, status string
		var franchiseeID sql.NullInt64
		var franchiseName sql.NullString
		var address, opensAt, closesAt string
		var latitude, longitude sql.NullFloat64
		var attendanceRadiusM int
		var isHeadquarters bool
		var workDaysValue string
		if err := rows.Scan(&id, &name, &code, &size, &status, &franchiseeID, &franchiseName, &address, &opensAt, &closesAt, &latitude, &longitude, &attendanceRadiusM, &isHeadquarters, &workDaysValue); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลสาขาได้"})
			return
		}
		workDays, workDaysErr := parseBranchWorkDays(workDaysValue)
		if workDaysErr != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านวันทำงานของสาขาได้"})
			return
		}
		branch := gin.H{"id": id, "name": name, "code": code, "size": size, "status": status, "franchiseeName": franchiseName.String, "address": address, "opensAt": opensAt, "closesAt": closesAt, "attendanceRadiusM": attendanceRadiusM, "isHeadquarters": isHeadquarters, "workDays": workDays}
		if latitude.Valid && longitude.Valid {
			branch["latitude"] = latitude.Float64
			branch["longitude"] = longitude.Float64
		}
		if franchiseeID.Valid {
			branch["franchiseeId"] = franchiseeID.Int64
		}
		result = append(result, branch)
	}
	c.JSON(200, gin.H{"success": true, "data": result})
}

// CreateCompanyBranch creates an SBC-owned branch, unlike CreateFranchisee
// which creates a franchise owner and their branch together.
func (h *PlatformHandler) CreateCompanyBranch(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input companyBranchInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลสาขาไม่ถูกต้อง"})
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Code = strings.ToUpper(strings.TrimSpace(input.Code))
	if input.Name == "" || input.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุชื่อและรหัสสาขา"})
		return
	}
	if !validateCompanyBranchDetails(input) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "พิกัด เวลาเปิดปิด หรือรัศมีเช็กอินไม่ถูกต้อง"})
		return
	}
	if input.AttendanceRadiusM == 0 {
		input.AttendanceRadiusM = 100
	}
	if input.WorkDays == nil {
		input.WorkDays = []int{1, 2, 3, 4, 5}
	}
	input.Address = strings.TrimSpace(input.Address)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างสาขาได้"})
		return
	}
	defer tx.Rollback()
	var branchID int64
	err = tx.QueryRowContext(c.Request.Context(), `
		INSERT INTO branches(name,code,size,status,address,opens_at,closes_at,latitude,longitude,attendance_radius_m,work_days)
		VALUES($1,$2,$3,'active',$4,NULLIF($5,'')::time,NULLIF($6,'')::time,$7,$8,$9,$10::smallint[])
		RETURNING id`, input.Name, input.Code, input.Size, input.Address, input.OpensAt, input.ClosesAt, input.Latitude, input.Longitude, input.AttendanceRadiusM, branchWorkDaysValue(input.WorkDays)).Scan(&branchID)
	if err == nil {
		err = copyCompanyCatalog(c.Request.Context(), tx, branchID, input.Size)
	}
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "รหัสสาขานี้มีอยู่แล้วหรือไม่สามารถคัดลอกรายการเริ่มต้นได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกสาขาได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	h.invalidateMenuSummaryCache(c)
	h.recordAudit(c, branchID, "branch", branchID, "created", gin.H{"name": input.Name, "code": input.Code, "size": input.Size})
	result := gin.H{"id": branchID, "name": input.Name, "code": input.Code, "size": input.Size, "status": "active", "address": input.Address, "opensAt": input.OpensAt, "closesAt": input.ClosesAt, "attendanceRadiusM": input.AttendanceRadiusM, "workDays": input.WorkDays}
	if input.Latitude != nil && input.Longitude != nil {
		result["latitude"] = *input.Latitude
		result["longitude"] = *input.Longitude
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) UpdateCompanyBranchDetails(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || branchID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
		return
	}
	var input companyBranchInput
	if c.ShouldBindJSON(&input) != nil || !validateCompanyBranchDetails(input) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลสาขาหรือพิกัดไม่ถูกต้อง"})
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Code = strings.ToUpper(strings.TrimSpace(input.Code))
	input.Address = strings.TrimSpace(input.Address)
	if input.Name == "" || input.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุชื่อและรหัสสาขา"})
		return
	}
	if input.AttendanceRadiusM == 0 {
		input.AttendanceRadiusM = 100
	}
	workDaysValue := ""
	if input.WorkDays != nil {
		workDaysValue = branchWorkDaysValue(input.WorkDays)
	}
	result, err := h.db.ExecContext(c.Request.Context(), `UPDATE branches SET name=$1,code=$2,address=$3,opens_at=NULLIF($4,'')::time,closes_at=NULLIF($5,'')::time,latitude=$6,longitude=$7,attendance_radius_m=$8,work_days=COALESCE(NULLIF($9,'')::smallint[],work_days) WHERE id=$10 AND franchisee_id IS NULL`, input.Name, input.Code, input.Address, input.OpensAt, input.ClosesAt, input.Latitude, input.Longitude, input.AttendanceRadiusM, workDaysValue, branchID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่สามารถบันทึกข้อมูลสาขาได้ กรุณาตรวจสอบรหัสสาขา"})
		return
	}
	if rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขา SBC"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": branchID}})
}

func (h *PlatformHandler) UpdateBranchSize(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || branchID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
		return
	}
	var input branchSizeInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ขนาดสาขาต้องเป็น S, M หรือ L"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนขนาดสาขาได้"})
		return
	}
	defer tx.Rollback()
	var isFranchiseBranch bool
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT franchisee_id IS NOT NULL FROM branches WHERE id=$1`, branchID).Scan(&isFranchiseBranch); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขา"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนขนาดสาขาได้"})
		return
	}
	result, err := tx.ExecContext(c.Request.Context(), `UPDATE branches SET size=$1 WHERE id=$2`, input.Size, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนขนาดสาขาได้"})
		return
	}
	if rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขา"})
		return
	}
	if isFranchiseBranch {
		err = copyFranchiseCatalog(c.Request.Context(), tx, branchID, input.Size)
	} else {
		err = copyCompanyCatalog(c.Request.Context(), tx, branchID, input.Size)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถปรับรายการตามขนาดสาขาได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนขนาดสาขาได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	h.invalidateMenuSummaryCache(c)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": branchID, "size": input.Size}})
}

// BranchSales returns sales recorded together with confirmed Stock app cuts.
func (h *PlatformHandler) BranchSales(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	start, end, ok := salesPeriodBounds(strings.TrimSpace(c.DefaultQuery("period", "today")))
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ช่วงเวลาที่เลือกไม่ถูกต้อง"})
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), fmt.Sprintf(`SELECT b.id,b.name,b.code,b.size,b.status,COALESCE(SUM(s.total),0),COUNT(s.id)
		FROM branches b
		LEFT JOIN stock_sales s ON s.branch_id=b.id AND s.created_at >= %s AND s.created_at < %s
		WHERE b.franchisee_id IS NULL
		GROUP BY b.id,b.name,b.code,b.size,b.status
		ORDER BY b.name`, start, end))
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถโหลดข้อมูลสาขาได้"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64
		var name, code, size, status string
		var sales float64
		var orders int
		if err := rows.Scan(&id, &name, &code, &size, &status, &sales, &orders); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลสาขาได้"})
			return
		}
		result = append(result, gin.H{"id": id, "name": name, "code": code, "size": size, "status": status, "sales": sales, "orders": orders})
	}
	c.JSON(200, gin.H{"success": true, "data": result})
}

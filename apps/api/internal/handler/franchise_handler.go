package handler

import (
	"context"
	"database/sql"
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
	Name string `json:"name" binding:"required"`
	Code string `json:"code" binding:"required"`
	Size string `json:"size" binding:"required,oneof=S M L"`
}

const franchiseCatalogTemplateBranchCode = "SBC-AYA-001"

// copyCompanyCatalog gives a new SBC branch the same starting catalogue as an
// existing SBC branch.  The first branch can still be created on a new system;
// its catalogue simply starts empty until central items are added.
func copyCompanyCatalog(c context.Context, tx *sql.Tx, branchID int64, size string) error {
	var sourceBranchID int64
	err := tx.QueryRowContext(c, `
		SELECT b.id
		FROM branches b
		WHERE b.franchisee_id IS NULL
		  AND b.id <> $1
		  AND EXISTS (SELECT 1 FROM menu_items m WHERE m.branch_id=b.id)
		ORDER BY
			CASE WHEN b.code=$2 THEN 0 ELSE 1 END,
			CASE b.size WHEN 'L' THEN 0 WHEN 'M' THEN 1 ELSE 2 END,
			b.id
		LIMIT 1`, branchID, franchiseCatalogTemplateBranchCode).Scan(&sourceBranchID)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(c, `
		INSERT INTO inventory_items(branch_id,catalog_item_id,name,category,stock_category,kind,quantity,unit,reorder_level,unit_cost,image_url,expiry_date)
		SELECT $1,i.catalog_item_id,i.name,i.category,i.stock_category,i.kind,i.quantity,i.unit,i.reorder_level,i.unit_cost,i.image_url,i.expiry_date
		FROM inventory_items i
		WHERE i.branch_id=$2
		  AND ($3 <> 'S' OR i.kind='stock' OR i.category <> 'วัตถุดิบอาหาร' OR EXISTS (
			SELECT 1 FROM menu_item_ingredients mi
			JOIN menu_items m ON m.id=mi.menu_item_id
			WHERE mi.inventory_item_id=i.id
			  AND m.branch_id=$2
			  AND lower(m.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery')
		  ))
		ON CONFLICT (branch_id,name) DO NOTHING`, branchID, sourceBranchID, size)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(c, `
		INSERT INTO menu_items(branch_id,name,category,store_price,store_price_available,lineman_price,lineman_price_available,cost_price,lineman_cost_price,status,image_url)
		SELECT $1,m.name,m.category,m.store_price,m.store_price_available,m.lineman_price,m.lineman_price_available,m.cost_price,m.lineman_cost_price,m.status,m.image_url
		FROM menu_items m
		WHERE m.branch_id=$2
		  AND ($3 <> 'S' OR lower(m.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery'))
		ON CONFLICT (branch_id,name) DO NOTHING`, branchID, sourceBranchID, size)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(c, `
		INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount)
		SELECT target_menu.id,target_inventory.id,mi.quantity,mi.unit,mi.cost_amount
		FROM menu_item_ingredients mi
		JOIN menu_items source_menu ON source_menu.id=mi.menu_item_id
		JOIN inventory_items source_inventory ON source_inventory.id=mi.inventory_item_id
		JOIN menu_items target_menu ON target_menu.branch_id=$1 AND target_menu.name=source_menu.name
		JOIN inventory_items target_inventory ON target_inventory.branch_id=$1 AND target_inventory.catalog_item_id=source_inventory.catalog_item_id
		WHERE source_menu.branch_id=$2
		  AND ($3 <> 'S' OR lower(source_menu.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery'))
		ON CONFLICT (menu_item_id,inventory_item_id) DO NOTHING`, branchID, sourceBranchID, size)
	return err
}

func copyFranchiseCatalog(c context.Context, tx *sql.Tx, branchID int64, plan string) error {
	var sourceBranchID int64
	err := tx.QueryRowContext(c, `
		SELECT b.id
		FROM branches b
		WHERE b.franchisee_id IS NULL
		  AND b.id <> $1
		ORDER BY
			CASE
				WHEN $2 = 'S' AND b.code = $3 THEN 0
				WHEN $2 IN ('M', 'L') AND b.size = $2 THEN 0
				WHEN $2 IN ('M', 'L') AND b.size IN ('M', 'L') THEN 1
				WHEN b.code = $3 THEN 2
				ELSE 3
			END,
			b.id
		LIMIT 1`, branchID, plan, franchiseCatalogTemplateBranchCode).Scan(&sourceBranchID)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(c, `
		INSERT INTO inventory_items(branch_id,catalog_item_id,name,category,stock_category,kind,quantity,unit,reorder_level,unit_cost,image_url,expiry_date)
		SELECT $1,i.catalog_item_id,i.name,i.category,i.stock_category,i.kind,i.quantity,i.unit,i.reorder_level,i.unit_cost,i.image_url,i.expiry_date
		FROM inventory_items i
		WHERE i.branch_id=$2
		  AND ($3 != 'S' OR i.kind='stock' OR i.category <> 'วัตถุดิบอาหาร' OR (
			i.kind='ingredient' AND EXISTS (
				SELECT 1 FROM menu_item_ingredients mi
				JOIN menu_items m ON m.id=mi.menu_item_id
				WHERE mi.inventory_item_id=i.id AND m.branch_id=$2
				AND CASE WHEN $3='S' THEN lower(m.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery')
					         ELSE lower(m.category) NOT IN ('เบเกอรี่','bakery') END
			)
		  ))
		ON CONFLICT (branch_id,name) DO NOTHING`, branchID, sourceBranchID, plan)
	if err != nil {
		return err
	}
	// Older franchise catalogues were copied before stock categories existed.
	// Align their stock buckets with the central template as well, so equipment
	// is returned by the drink and postal stock endpoints.
	if _, err = tx.ExecContext(c, `
		UPDATE inventory_items target
		SET stock_category=source.stock_category
		FROM inventory_items source
		WHERE target.branch_id=$1
		AND target.kind='stock'
		AND source.kind='stock'
		AND source.branch_id=$2
		AND target.name=source.name
		AND source.stock_category IS NOT NULL
		AND target.stock_category IS DISTINCT FROM source.stock_category`, branchID, sourceBranchID); err != nil {
		return err
	}
	_, err = tx.ExecContext(c, `
		INSERT INTO menu_items(branch_id,name,category,store_price,store_price_available,lineman_price,lineman_price_available,cost_price,lineman_cost_price,status,image_url)
		SELECT $1,m.name,m.category,m.store_price,m.store_price_available,m.lineman_price,m.lineman_price_available,m.cost_price,m.lineman_cost_price,m.status,m.image_url
		FROM menu_items m
		WHERE m.branch_id=$2
		  AND ($3 != 'S' OR lower(m.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery'))
		ON CONFLICT (branch_id,name) DO NOTHING`, branchID, sourceBranchID, plan)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(c, `
		INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount)
		SELECT target_menu.id,target_inventory.id,mi.quantity,mi.unit,mi.cost_amount
		FROM menu_item_ingredients mi
		JOIN menu_items source_menu ON source_menu.id=mi.menu_item_id
		JOIN inventory_items source_inventory ON source_inventory.id=mi.inventory_item_id
		JOIN menu_items target_menu ON target_menu.branch_id=$1 AND target_menu.name=source_menu.name
		JOIN inventory_items target_inventory ON target_inventory.branch_id=$1 AND target_inventory.catalog_item_id=source_inventory.catalog_item_id
		WHERE source_menu.branch_id=$2
		  AND ($3 != 'S' OR lower(source_menu.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery'))
		ON CONFLICT (menu_item_id,inventory_item_id) DO NOTHING`, branchID, sourceBranchID, plan)
	return err
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
	query := `SELECT b.id,b.name,b.code,b.size,b.status,b.franchisee_id,f.name FROM branches b LEFT JOIN franchisees f ON f.id=b.franchisee_id`
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
		if err := rows.Scan(&id, &name, &code, &size, &status, &franchiseeID, &franchiseName); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลสาขาได้"})
			return
		}
		branch := gin.H{"id": id, "name": name, "code": code, "size": size, "status": status, "franchiseeName": franchiseName.String}
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
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างสาขาได้"})
		return
	}
	defer tx.Rollback()
	var branchID int64
	err = tx.QueryRowContext(c.Request.Context(), `
		INSERT INTO branches(name,code,size,status)
		VALUES($1,$2,$3,'active')
		RETURNING id`, input.Name, input.Code, input.Size).Scan(&branchID)
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
	h.recordAudit(c, branchID, "branch", branchID, "created", gin.H{"name": input.Name, "code": input.Code, "size": input.Size})
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": branchID, "name": input.Name, "code": input.Code, "size": input.Size, "status": "active"}})
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
		if err = copyFranchiseCatalog(c.Request.Context(), tx, branchID, input.Size); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถปรับรายการตามขนาดสาขาได้"})
			return
		}
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนขนาดสาขาได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": branchID, "size": input.Size}})
}

// BranchSales preserves the Admin branch overview until a future sales provider is connected.
func (h *PlatformHandler) BranchSales(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,name,code,size,status FROM branches WHERE franchisee_id IS NULL ORDER BY name`)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถโหลดข้อมูลสาขาได้"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64
		var name, code, size, status string
		if err := rows.Scan(&id, &name, &code, &size, &status); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลสาขาได้"})
			return
		}
		result = append(result, gin.H{"id": id, "name": name, "code": code, "size": size, "status": status, "sales": 0, "orders": 0})
	}
	c.JSON(200, gin.H{"success": true, "data": result})
}

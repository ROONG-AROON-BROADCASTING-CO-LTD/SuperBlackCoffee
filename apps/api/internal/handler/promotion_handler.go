package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/dto"
	"y/internal/middleware"
	"y/internal/model"
)

var promotionStatuses = map[string]bool{"draft": true, "active": true, "paused": true, "expired": true}

func promotionInput(input *dto.PromotionRequest) (time.Time, time.Time, bool, string) {
	input.Name = strings.TrimSpace(input.Name)
	input.Type = strings.TrimSpace(input.Type)
	input.Benefit = strings.TrimSpace(input.Benefit)
	input.Status = strings.TrimSpace(input.Status)
	if input.Name == "" || input.Type == "" || input.Benefit == "" || !promotionStatuses[input.Status] {
		return time.Time{}, time.Time{}, false, "ข้อมูลโปรโมชั่นไม่ครบถ้วน"
	}
	var starts, ends time.Time
	var err error
	if input.StartsOn != "" {
		starts, err = time.Parse("2006-01-02", input.StartsOn)
		if err != nil {
			return time.Time{}, time.Time{}, false, "วันเริ่มต้นไม่ถูกต้อง"
		}
	}
	if input.EndsOn != "" {
		ends, err = time.Parse("2006-01-02", input.EndsOn)
		if err != nil {
			return time.Time{}, time.Time{}, false, "วันสิ้นสุดไม่ถูกต้อง"
		}
	}
	if !starts.IsZero() && !ends.IsZero() && ends.Before(starts) {
		return time.Time{}, time.Time{}, false, "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น"
	}
	if len(uniquePositiveIDs(input.MenuItemIDs)) == 0 {
		return time.Time{}, time.Time{}, false, "ต้องเลือกเมนูที่ร่วมรายการอย่างน้อย 1 เมนู"
	}
	input.BranchIDs = uniquePositiveIDs(input.BranchIDs)
	input.MenuItemIDs = uniquePositiveIDs(input.MenuItemIDs)
	input.Channels = cleanStrings(input.Channels)
	input.Terms = cleanStrings(input.Terms)
	if len(input.Channels) == 0 {
		input.Channels = []string{"storefront"}
	}
	return starts, ends, true, ""
}

func uniquePositiveIDs(ids []int64) []int64 {
	seen := make(map[int64]struct{}, len(ids))
	result := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id > 0 {
			if _, ok := seen[id]; !ok {
				seen[id] = struct{}{}
				result = append(result, id)
			}
		}
	}
	return result
}

func cleanStrings(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			if _, ok := seen[value]; !ok {
				seen[value] = struct{}{}
				result = append(result, value)
			}
		}
	}
	return result
}

func nullableDate(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}

func (h *PlatformHandler) ListPromotions(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "กรุณาเข้าสู่ระบบ"})
		return
	}
	query := `SELECT p.id,p.name,p.promotion_type,p.benefit,p.status,p.image_url,COALESCE(to_json(p.channels)::text,'[]'),p.eligibility,p.starts_on,p.ends_on,COALESCE(to_json(p.terms)::text,'[]'),COUNT(redemption.id)
		FROM promotions p LEFT JOIN promotion_redemptions redemption ON redemption.promotion_id=p.id`
	args := []any{}
	if claims.Role != "admin" {
		branchID, ok := h.branchScope(c)
		if !ok {
			return
		}
		query += ` WHERE NOT EXISTS (SELECT 1 FROM promotion_branches all_branches WHERE all_branches.promotion_id=p.id) OR EXISTS (SELECT 1 FROM promotion_branches scoped_branches WHERE scoped_branches.promotion_id=p.id AND scoped_branches.branch_id=$1)`
		args = append(args, branchID)
	}
	query += ` GROUP BY p.id ORDER BY p.updated_at DESC,p.id DESC`
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดึงรายการโปรโมชั่นได้"})
		return
	}
	defer rows.Close()
	result := []model.Promotion{}
	for rows.Next() {
		var promotion model.Promotion
		var startsOn, endsOn sql.NullTime
		var channels, terms string
		if err := rows.Scan(&promotion.ID, &promotion.Name, &promotion.Type, &promotion.Benefit, &promotion.Status, &promotion.ImageURL, &channels, &promotion.Eligibility, &startsOn, &endsOn, &terms, &promotion.Usage); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลโปรโมชั่นได้"})
			return
		}
		if json.Unmarshal([]byte(channels), &promotion.Channels) != nil || json.Unmarshal([]byte(terms), &promotion.Terms) != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลโปรโมชั่นได้"})
			return
		}
		if startsOn.Valid {
			promotion.StartsOn = &startsOn.Time
		}
		if endsOn.Valid {
			promotion.EndsOn = &endsOn.Time
		}
		if err := h.populatePromotion(c, &promotion); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านรายละเอียดโปรโมชั่นได้"})
			return
		}
		result = append(result, promotion)
	}
	if err := rows.Err(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลโปรโมชั่นได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) populatePromotion(c *gin.Context, promotion *model.Promotion) error {
	branchRows, err := h.db.QueryContext(c.Request.Context(), `SELECT b.id,b.name,b.code FROM promotion_branches pb JOIN branches b ON b.id=pb.branch_id WHERE pb.promotion_id=$1 ORDER BY b.name`, promotion.ID)
	if err != nil {
		return err
	}
	defer branchRows.Close()
	for branchRows.Next() {
		var branch model.PromotionBranch
		if err := branchRows.Scan(&branch.ID, &branch.Name, &branch.Code); err != nil {
			return err
		}
		promotion.Branches = append(promotion.Branches, branch)
	}
	if err := branchRows.Err(); err != nil {
		return err
	}
	menuRows, err := h.db.QueryContext(c.Request.Context(), `SELECT m.id,m.name,m.category,m.store_price,m.image_url FROM promotion_menu_items pm JOIN menu_items m ON m.id=pm.menu_item_id WHERE pm.promotion_id=$1 ORDER BY m.name`, promotion.ID)
	if err != nil {
		return err
	}
	defer menuRows.Close()
	for menuRows.Next() {
		var menu model.PromotionMenuItem
		if err := menuRows.Scan(&menu.ID, &menu.Name, &menu.Category, &menu.Price, &menu.ImageURL); err != nil {
			return err
		}
		promotion.MenuItems = append(promotion.MenuItems, menu)
	}
	return menuRows.Err()
}

func (h *PlatformHandler) CreatePromotion(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input dto.PromotionRequest
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลโปรโมชั่นไม่ถูกต้อง"})
		return
	}
	starts, ends, ok, message := promotionInput(&input)
	if !ok {
		c.JSON(400, gin.H{"success": false, "message": message})
		return
	}
	promotion, err := h.writePromotion(c, 0, input, starts, ends)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": promotion})
}

func (h *PlatformHandler) UpdatePromotion(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสโปรโมชั่นไม่ถูกต้อง"})
		return
	}
	var input dto.PromotionRequest
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลโปรโมชั่นไม่ถูกต้อง"})
		return
	}
	starts, ends, ok, message := promotionInput(&input)
	if !ok {
		c.JSON(400, gin.H{"success": false, "message": message})
		return
	}
	promotion, err := h.writePromotion(c, id, input, starts, ends)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "ไม่พบโปรโมชั่น" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": promotion})
}

func (h *PlatformHandler) writePromotion(c *gin.Context, id int64, input dto.PromotionRequest, starts, ends time.Time) (model.Promotion, error) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		return model.Promotion{}, sql.ErrNoRows
	}
	if err := h.validatePromotionScope(c, id, &input); err != nil {
		return model.Promotion{}, err
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		return model.Promotion{}, err
	}
	defer tx.Rollback()
	var promotionID int64
	if id == 0 {
		err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO promotions(name,promotion_type,benefit,status,image_url,channels,eligibility,starts_on,ends_on,terms,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, input.Name, input.Type, input.Benefit, input.Status, strings.TrimSpace(input.ImageURL), input.Channels, strings.TrimSpace(input.Eligibility), nullableDate(starts), nullableDate(ends), input.Terms, claims.UserID).Scan(&promotionID)
	} else {
		result, updateErr := tx.ExecContext(c.Request.Context(), `UPDATE promotions SET name=$1,promotion_type=$2,benefit=$3,status=$4,image_url=$5,channels=$6,eligibility=$7,starts_on=$8,ends_on=$9,terms=$10,updated_at=now() WHERE id=$11`, input.Name, input.Type, input.Benefit, input.Status, strings.TrimSpace(input.ImageURL), input.Channels, strings.TrimSpace(input.Eligibility), nullableDate(starts), nullableDate(ends), input.Terms, id)
		if updateErr != nil {
			return model.Promotion{}, updateErr
		}
		if rowsAffected(result) == 0 {
			return model.Promotion{}, fmtError("ไม่พบโปรโมชั่น")
		}
		promotionID = id
		if _, err = tx.ExecContext(c.Request.Context(), `DELETE FROM promotion_branches WHERE promotion_id=$1`, promotionID); err != nil {
			return model.Promotion{}, err
		}
		if _, err = tx.ExecContext(c.Request.Context(), `DELETE FROM promotion_menu_items WHERE promotion_id=$1`, promotionID); err != nil {
			return model.Promotion{}, err
		}
	}
	for _, branchID := range input.BranchIDs {
		if _, err = tx.ExecContext(c.Request.Context(), `INSERT INTO promotion_branches(promotion_id,branch_id) VALUES($1,$2)`, promotionID, branchID); err != nil {
			return model.Promotion{}, fmtError("พบสาขาที่ไม่ถูกต้อง")
		}
	}
	for _, menuID := range input.MenuItemIDs {
		if _, err = tx.ExecContext(c.Request.Context(), `INSERT INTO promotion_menu_items(promotion_id,menu_item_id) VALUES($1,$2)`, promotionID, menuID); err != nil {
			return model.Promotion{}, fmtError("พบเมนูที่ไม่ถูกต้อง")
		}
	}
	auditBranch := int64(0)
	if len(input.BranchIDs) > 0 {
		auditBranch = input.BranchIDs[0]
	}
	if auditBranch == 0 {
		_ = tx.QueryRowContext(c.Request.Context(), `SELECT branch_id FROM menu_items WHERE id=$1`, input.MenuItemIDs[0]).Scan(&auditBranch)
	}
	if auditBranch > 0 {
		action := "created"
		if id != 0 {
			action = "updated"
		}
		if err = recordAuditTx(c, tx, auditBranch, claims.UserID, "promotion", promotionID, action, gin.H{"name": input.Name, "status": input.Status}); err != nil {
			return model.Promotion{}, err
		}
	}
	if err = tx.Commit(); err != nil {
		return model.Promotion{}, err
	}
	promotion := model.Promotion{ID: promotionID, Name: input.Name, Type: input.Type, Benefit: input.Benefit, Status: input.Status, ImageURL: strings.TrimSpace(input.ImageURL), Channels: input.Channels, Eligibility: strings.TrimSpace(input.Eligibility), Terms: input.Terms}
	if !starts.IsZero() {
		promotion.StartsOn = &starts
	}
	if !ends.IsZero() {
		promotion.EndsOn = &ends
	}
	if err := h.populatePromotion(c, &promotion); err != nil {
		return model.Promotion{}, err
	}
	return promotion, nil
}

func (h *PlatformHandler) DeletePromotion(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสโปรโมชั่นไม่ถูกต้อง"})
		return
	}
	if !h.canManagePromotion(c, id) {
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `DELETE FROM promotions WHERE id=$1`, id)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถลบโปรโมชั่นได้"})
		return
	}
	if rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบโปรโมชั่น"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *PlatformHandler) validatePromotionScope(c *gin.Context, id int64, input *dto.PromotionRequest) error {
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		return fmtError("กรุณาเข้าสู่ระบบ")
	}
	if claims.Role == "admin" {
		var branchCount, menuCount int
		if len(input.BranchIDs) > 0 {
			if err := h.db.QueryRowContext(c.Request.Context(), `SELECT COUNT(*) FROM branches WHERE id=ANY($1)`, input.BranchIDs).Scan(&branchCount); err != nil || branchCount != len(input.BranchIDs) {
				return fmtError("พบสาขาที่ไม่ถูกต้อง")
			}
		}
		if err := h.db.QueryRowContext(c.Request.Context(), `SELECT COUNT(*) FROM menu_items WHERE id=ANY($1) AND template_enabled`, input.MenuItemIDs).Scan(&menuCount); err != nil || menuCount != len(input.MenuItemIDs) {
			return fmtError("พบเมนูที่ไม่ถูกต้อง")
		}
		return nil
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return fmtError("ไม่พบขอบเขตสาขา")
	}
	if id > 0 {
		var allowed bool
		if err := h.db.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM promotion_branches WHERE promotion_id=$1 AND branch_id=$2) AND NOT EXISTS(SELECT 1 FROM promotion_branches WHERE promotion_id=$1 AND branch_id<>$2)`, id, branchID).Scan(&allowed); err != nil || !allowed {
			return fmtError("ไม่มีสิทธิ์แก้ไขโปรโมชั่นนี้")
		}
	}
	if len(input.BranchIDs) == 0 {
		input.BranchIDs = []int64{branchID}
	} else {
		for _, candidate := range input.BranchIDs {
			if candidate != branchID {
				return fmtError("ไม่มีสิทธิ์เลือกสาขาอื่น")
			}
		}
	}
	var menuCount int
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT COUNT(*) FROM menu_items WHERE id=ANY($1) AND branch_id=$2 AND template_enabled`, input.MenuItemIDs, branchID).Scan(&menuCount); err != nil || menuCount != len(input.MenuItemIDs) {
		return fmtError("พบเมนูที่ไม่ถูกต้องสำหรับสาขานี้")
	}
	return nil
}

func (h *PlatformHandler) canManagePromotion(c *gin.Context, promotionID int64) bool {
	claims := middleware.ClaimsFrom(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "กรุณาเข้าสู่ระบบ"})
		return false
	}
	if claims.Role == "admin" {
		return true
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return false
	}
	var allowed bool
	err := h.db.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM promotion_branches WHERE promotion_id=$1 AND branch_id=$2) AND NOT EXISTS(SELECT 1 FROM promotion_branches WHERE promotion_id=$1 AND branch_id<>$2)`, promotionID, branchID).Scan(&allowed)
	if err != nil || !allowed {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "ไม่มีสิทธิ์จัดการโปรโมชั่นนี้"})
		return false
	}
	return true
}

type promotionError string

func (e promotionError) Error() string { return string(e) }
func fmtError(message string) error    { return promotionError(message) }

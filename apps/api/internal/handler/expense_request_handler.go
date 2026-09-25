package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/dto"
	"y/internal/middleware"
)

func (h *PlatformHandler) CreateExpenseRequest(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input dto.ExpenseRequest
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรอกข้อมูลคำขอค่าใช้จ่ายให้ครบถ้วน"})
		return
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ระบุชื่อรายการค่าใช้จ่าย"})
		return
	}
	branchID, ok := h.requestBranchScope(c, input.BranchID)
	if !ok {
		return
	}
	claims := middleware.ClaimsFrom(c)
	var id int64
	err := h.db.QueryRowContext(c.Request.Context(), `
		INSERT INTO expense_requests(branch_id,title,category,estimated_amount,note,requested_by)
		VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
		branchID, title, input.Category, input.EstimatedAmount, strings.TrimSpace(input.Note), claims.UserID,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถส่งคำขอค่าใช้จ่ายได้"})
		return
	}
	h.recordAudit(c, branchID, "expense_request", id, "created", gin.H{
		"title": title, "category": input.Category, "estimatedAmount": input.EstimatedAmount,
	})
	h.cache.Publish(c, "sbc:events", gin.H{"type": "expense.request.created", "requestId": id, "branchId": branchID})
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "status": "pending"}})
}

func (h *PlatformHandler) ListExpenseRequests(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	claims := middleware.ClaimsFrom(c)
	query := `SELECT r.id,r.title,r.category,r.estimated_amount,r.note,r.status,r.created_at,r.updated_at,b.id,b.name,b.franchisee_id IS NOT NULL,
		COALESCE(u.name,'') FROM expense_requests r JOIN branches b ON b.id=r.branch_id LEFT JOIN users u ON u.id=r.requested_by`
	args := []any{}
	if claims.Role != "admin" {
		branchID, ok := h.branchScope(c)
		if !ok {
			return
		}
		query += " WHERE r.branch_id=$1"
		args = append(args, branchID)
	}
	query += " ORDER BY r.created_at DESC"
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถดึงคำขอค่าใช้จ่ายได้"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id, branchID int64
		var title, category, note, status, branchName, requester string
		var amount float64
		var createdAt, updatedAt time.Time
		var isFranchise bool
		if err := rows.Scan(&id, &title, &category, &amount, &note, &status, &createdAt, &updatedAt, &branchID, &branchName, &isFranchise, &requester); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านคำขอค่าใช้จ่ายได้"})
			return
		}
		result = append(result, gin.H{"id": id, "title": title, "category": category, "estimatedAmount": amount, "note": note, "status": status, "createdAt": createdAt, "updatedAt": updatedAt, "requestedByName": requester, "branch": gin.H{"id": branchID, "name": branchName, "isFranchise": isFranchise}})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านคำขอค่าใช้จ่ายได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) UpdateExpenseRequestStatus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสคำขอไม่ถูกต้อง"})
		return
	}
	var input dto.ExpenseRequestStatus
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "สถานะคำขอไม่ถูกต้อง"})
		return
	}
	allowed := map[string][]string{
		"approved": {"pending"}, "funded": {"approved"}, "purchasing": {"funded"},
		"awaiting_documents": {"purchasing"}, "completed": {"awaiting_documents"},
		"rejected": {"pending", "approved"},
	}
	claims := middleware.ClaimsFrom(c)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตคำขอได้"})
		return
	}
	defer tx.Rollback()
	var branchID int64
	var previousStatus string
	err = tx.QueryRowContext(c.Request.Context(), `SELECT branch_id,status FROM expense_requests WHERE id=$1 AND status = ANY($2) FOR UPDATE`, id, allowed[input.Status]).Scan(&branchID, &previousStatus)
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนสถานะคำขอนี้ได้"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตคำขอได้"})
		return
	}
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE expense_requests SET status=$1,updated_by=$2,updated_at=now() WHERE id=$3`, input.Status, claims.UserID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตคำขอได้"})
		return
	}
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "expense_request", id, input.Status, gin.H{"beforeStatus": previousStatus, "afterStatus": input.Status}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติคำขอได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตคำขอได้"})
		return
	}
	h.cache.Publish(c, "sbc:events", gin.H{"type": "expense.request.updated", "requestId": id, "status": input.Status})
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": input.Status}})
}

package handler

import (
	"bytes"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

const maxCompanyDocumentSize = 10 << 20

var companyDocumentContentTypes = map[string]bool{
	"application/pdf":    true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
}

var companyDocumentCategories = map[string]bool{
	"job_application": true,
	"company_policy":  true,
	"leave_form":      true,
	"other":           true,
}

func (h *PlatformHandler) ListCompanyDocuments(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,title,category,original_name,content_type,size_bytes,created_at FROM company_documents ORDER BY created_at DESC,id DESC`)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดึงเอกสารส่วนกลางได้"})
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id int64
		var title, category, name, contentType string
		var size int64
		var createdAt any
		if err := rows.Scan(&id, &title, &category, &name, &contentType, &size, &createdAt); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านเอกสารส่วนกลางได้"})
			return
		}
		items = append(items, gin.H{"id": id, "title": title, "category": category, "fileName": name, "contentType": contentType, "sizeBytes": size, "createdAt": createdAt})
	}
	c.JSON(200, gin.H{"success": true, "data": items})
}

func (h *PlatformHandler) CreateCompanyDocument(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	title, category := strings.TrimSpace(c.PostForm("title")), strings.TrimSpace(c.PostForm("category"))
	if title == "" {
		c.JSON(400, gin.H{"success": false, "message": "กรุณาระบุชื่อเอกสาร"})
		return
	}
	if category == "" {
		category = "other"
	}
	if !companyDocumentCategories[category] {
		c.JSON(400, gin.H{"success": false, "message": "ประเภทเอกสารไม่ถูกต้อง"})
		return
	}
	file, err := c.FormFile("file")
	if err != nil || file.Size < 1 || file.Size > maxCompanyDocumentSize {
		c.JSON(400, gin.H{"success": false, "message": "ไฟล์ต้องมีขนาดไม่เกิน 10 MB"})
		return
	}
	contentType := file.Header.Get("Content-Type")
	if !companyDocumentContentTypes[contentType] {
		c.JSON(400, gin.H{"success": false, "message": "รองรับเฉพาะ PDF, Word และ Excel"})
		return
	}
	source, err := file.Open()
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "ไม่สามารถเปิดไฟล์ได้"})
		return
	}
	defer source.Close()
	content, err := io.ReadAll(source)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "ไม่สามารถอ่านไฟล์ได้"})
		return
	}
	claims := middleware.ClaimsFrom(c)
	var id int64
	err = h.db.QueryRowContext(c.Request.Context(), `INSERT INTO company_documents(title,category,original_name,content_type,size_bytes,content,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, title, category, filepath.Base(file.Filename), contentType, file.Size, content, claims.UserID).Scan(&id)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกเอกสารได้"})
		return
	}
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) DownloadCompanyDocument(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสเอกสารไม่ถูกต้อง"})
		return
	}
	var name, contentType string
	var content []byte
	err = h.db.QueryRowContext(c.Request.Context(), `SELECT original_name,content_type,content FROM company_documents WHERE id=$1`, id).Scan(&name, &contentType, &content)
	if err != nil {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบเอกสาร"})
		return
	}
	c.DataFromReader(200, int64(len(content)), contentType, bytes.NewReader(content), map[string]string{"Content-Disposition": "attachment; filename*=UTF-8''" + url.PathEscape(name)})
}

func (h *PlatformHandler) DeleteCompanyDocument(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสเอกสารไม่ถูกต้อง"})
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `DELETE FROM company_documents WHERE id=$1`, id)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบเอกสาร"})
		return
	}
	c.Status(http.StatusNoContent)
}

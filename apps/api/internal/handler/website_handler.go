package handler

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type websiteLeadInput struct {
	Name     string `json:"name" binding:"required,min=2,max=120"`
	Phone    string `json:"phone" binding:"required,min=8,max=40"`
	Email    string `json:"email" binding:"omitempty,email,max=160"`
	Topic    string `json:"topic" binding:"omitempty,oneof=franchise branch general"`
	Plan     string `json:"plan" binding:"omitempty,max=20"`
	Province string `json:"province" binding:"omitempty,max=120"`
	Message  string `json:"message" binding:"omitempty,max=2000"`
}

func (h *PlatformHandler) UpdateWebsiteLeadStatus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสลีดไม่ถูกต้อง"})
		return
	}
	var input struct {
		Status string `json:"status" binding:"required,oneof=new contacted closed"`
	}
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(400, gin.H{"success": false, "message": "สถานะลีดไม่ถูกต้อง"})
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `UPDATE website_leads SET status=$1,updated_at=now() WHERE id=$2`, input.Status, id)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบลีดที่ระบุ"})
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"id": id, "status": input.Status}})
}

// CreateWebsiteLead accepts a public enquiry and places it in the admin inbox.
func (h *PlatformHandler) CreateWebsiteLead(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input websiteLeadInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณากรอกชื่อและเบอร์โทรศัพท์ให้ถูกต้อง"})
		return
	}
	if !h.cache.AllowLogin(c, "website-lead:"+c.ClientIP(), 5, time.Hour) {
		c.JSON(http.StatusTooManyRequests, gin.H{"success": false, "message": "ส่งข้อมูลบ่อยเกินไป กรุณาลองใหม่อีกครั้งภายหลัง"})
		return
	}
	topic := input.Topic
	if topic == "" {
		topic = "franchise"
	}
	var id int64
	err := h.db.QueryRowContext(c.Request.Context(), `INSERT INTO website_leads(name,phone,email,topic,plan,province,message) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, strings.TrimSpace(input.Name), strings.TrimSpace(input.Phone), strings.TrimSpace(input.Email), topic, strings.TrimSpace(input.Plan), strings.TrimSpace(input.Province), strings.TrimSpace(input.Message)).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกข้อความได้ กรุณาลองใหม่อีกครั้ง"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}, "message": "ส่งข้อมูลถึงทีมงานแล้ว"})
}

func (h *PlatformHandler) ListWebsiteLeads(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,name,phone,email,topic,plan,province,message,status,created_at FROM website_leads ORDER BY created_at DESC LIMIT 200`)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถดึงข้อความจากเว็บไซต์ได้"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64
		var name, phone, topic, status string
		var email, plan, province, message sql.NullString
		var created time.Time
		if err := rows.Scan(&id, &name, &phone, &email, &topic, &plan, &province, &message, &status, &created); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลข้อความได้"})
			return
		}
		result = append(result, gin.H{"id": id, "name": name, "phone": phone, "email": email.String, "topic": topic, "plan": plan.String, "province": province.String, "message": message.String, "status": status, "createdAt": created})
	}
	c.JSON(200, gin.H{"success": true, "data": result})
}

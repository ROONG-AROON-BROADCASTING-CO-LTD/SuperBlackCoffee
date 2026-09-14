package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

var technicianInspectionChecklist = []string{
	"ร้านคาเฟ่: ตู้เมนไฟและเบรกเกอร์มีฝาครอบ ป้ายวงจร และไม่มีรอยไหม้",
	"ร้านคาเฟ่: ทดสอบเครื่องตัดไฟรั่วและตรวจสายดินของอุปกรณ์หลัก",
	"ร้านคาเฟ่: ปลั๊ก สวิตช์ สายไฟ และรางสายไฟไม่หลวม แตก หรือร้อนผิดปกติ",
	"ร้านคาเฟ่: ไฟส่องสว่างหน้าเคาน์เตอร์ หลังร้าน และป้ายสาขาติดครบ",
	"ร้านคาเฟ่: เครื่องชงกาแฟแรงดัน น้ำร้อน ไอน้ำ และหัวชงทำงานปกติ",
	"ร้านคาเฟ่: ตรวจการรั่วซึมของเครื่องชง สายยาง ข้อต่อ และถาดรองน้ำ",
	"ร้านคาเฟ่: เครื่องบดกาแฟเสียงปกติ ใบมีดไม่สึก และตั้งค่าบดได้",
	"ร้านคาเฟ่: เครื่องปั่น เครื่องซีล และอุปกรณ์บาร์เปิดใช้งานได้ครบ",
	"ร้านคาเฟ่: ตู้เย็น ตู้แช่ และเครื่องทำน้ำแข็งมีอุณหภูมิตามกำหนด",
	"ร้านคาเฟ่: ยางขอบตู้เย็น ประตู และบานพับปิดสนิท ไม่มีน้ำหยด",
	"ร้านคาเฟ่: ก๊อกน้ำ ซิงก์ และท่อน้ำทิ้งไหลสะดวก ไม่มีรั่วหรืออุดตัน",
	"ร้านคาเฟ่: เครื่องปรับอากาศและพัดลมไม่มีเสียงดัง กลิ่นอับ หรือน้ำหยด",
	"ร้านคาเฟ่: พื้น ผนัง ฝ้า ประตู และเฟอร์นิเจอร์ไม่แตกร้าว หลวม หรือคม",
	"ร้านคาเฟ่: ถังดับเพลิงยังไม่หมดอายุ เกจปกติ และเข้าถึงได้ง่าย",
	"ร้านคาเฟ่: ทางหนีไฟ ป้ายความปลอดภัย และไฟฉุกเฉินมองเห็นชัดเจน",
	"ตู้ชาร์จรถ EV: ตัวตู้ ประตูตู้ และชุดล็อกไม่มีรอยกระแทก น้ำเข้า หรือสนิม",
	"ตู้ชาร์จรถ EV: หน้าจอ ปุ่มควบคุม และไฟแสดงสถานะอ่านค่าได้ถูกต้อง",
	"ตู้ชาร์จรถ EV: หัวชาร์จ สายชาร์จ และขั้วต่อไม่มีรอยแตก บิดงอ หรือร้อน",
	"ตู้ชาร์จรถ EV: เบรกเกอร์ สายดิน และระบบป้องกันไฟรั่วอยู่ในสภาพพร้อมใช้",
	"ตู้ชาร์จรถ EV: ปุ่มหยุดฉุกเฉินทำงานจริง มีป้าย และเข้าถึงได้ทันที",
	"ตู้ชาร์จรถ EV: ทดสอบเริ่มและหยุดชาร์จ พร้อมตรวจรหัสแจ้งเตือนบนหน้าจอ",
	"ตู้ชาร์จรถ EV: ไม่มีความร้อน เสียง กลิ่นไหม้ หรือความชื้นผิดปกติที่ตู้",
	"ตู้ชาร์จรถ EV: พื้นที่จอด เส้นตีช่อง ป้ายใช้งาน และไฟรอบตู้ชัดเจน",
	"ตู้ชาร์จรถ EV: ตรวจช่องระบายน้ำและพื้นที่รอบฐานตู้ไม่ให้น้ำขัง",
	"ตู้ชาร์จรถ EV: ตรวจการเชื่อมต่อเครือข่ายและสถานะระบบรับชำระเงิน",
	"ห้องน้ำ: โถสุขภัณฑ์ ฝารองนั่ง และระบบกดชำระล้างใช้งานได้ปกติ",
	"ห้องน้ำ: อ่างล้างมือ ก๊อกน้ำ สบู่ และเครื่องเป่ามือหรือกระดาษพร้อมใช้",
	"ห้องน้ำ: ท่อน้ำทิ้งไหลดี ไม่มีกลิ่นย้อน น้ำรั่ว หรือน้ำขังบนพื้น",
	"ห้องน้ำ: พัดลมระบายอากาศและช่องลมทำงาน ลดกลิ่นอับภายในห้อง",
	"ห้องน้ำ: ไฟส่องสว่าง สวิตช์ และปลั๊กในพื้นที่เปียกปลอดภัย",
	"ห้องน้ำ: ประตู กลอน มือจับ และอุปกรณ์ช่วยเปิดปิดไม่หลวม",
	"ห้องน้ำ: พื้นกันลื่น กระเบื้อง ร่องยาแนว และผนังไม่มีรอยชำรุด",
	"ห้องน้ำ: ป้ายเตือน วัสดุสิ้นเปลือง และถังขยะอยู่ครบและสะอาด",
	"ห้องน้ำ: ตรวจจุดเสี่ยงลื่นล้มและเก็บสิ่งกีดขวางทางเข้าออก",
}

func (h *PlatformHandler) operationsBranchID(c *gin.Context, code string) (int64, bool) {
	var id int64
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT id FROM branches WHERE code=$1`, code).Scan(&id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบสาขา"})
		return 0, false
	}
	return id, true
}

func (h *PlatformHandler) ListAssets(c *gin.Context) {
	h.listOps(c, `SELECT a.id,b.code,b.name,a.name,a.asset_type,COALESCE(a.serial_number,''),a.warranty_until,a.maintenance_due,a.status FROM branch_assets a JOIN branches b ON b.id=a.branch_id`, "assets")
}
func (h *PlatformHandler) ListAssetEvents(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	assetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || assetID < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสทรัพย์สินไม่ถูกต้อง"})
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT e.id,b.code,b.name,e.event_type,e.note,e.created_at FROM branch_asset_events e JOIN branches b ON b.id=e.branch_id WHERE e.asset_id=$1 ORDER BY e.created_at DESC,e.id DESC`, assetID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถโหลดประวัติทรัพย์สินได้"})
		return
	}
	defer rows.Close()
	events := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var code, branch, eventType, note string
		var createdAt time.Time
		if err = rows.Scan(&id, &code, &branch, &eventType, &note, &createdAt); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านประวัติทรัพย์สินได้"})
			return
		}
		events = append(events, gin.H{"id": id, "branchCode": code, "branchName": branch, "eventType": eventType, "note": note, "createdAt": createdAt})
	}
	c.JSON(200, gin.H{"success": true, "data": events})
}
func (h *PlatformHandler) ListMaintenanceTickets(c *gin.Context) {
	h.listOps(c, `SELECT t.id,b.code,b.name,t.title,t.description,t.priority,t.status,COALESCE(t.technician_name,''),t.labor_cost+t.parts_cost+t.travel_cost,t.due_at FROM maintenance_tickets t JOIN branches b ON b.id=t.branch_id`, "maintenance")
}

func (h *PlatformHandler) franchiseMaintenanceScope(c *gin.Context) (branchID, franchiseID int64, ok bool) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil || claims.Role != "franchise_owner" || claims.BranchID == nil || claims.FranchiseeID == nil {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "บัญชีนี้ไม่มีสิทธิ์แจ้งซ่อม"})
		return 0, 0, false
	}
	return *claims.BranchID, *claims.FranchiseeID, true
}

// ListFranchiseMaintenanceTickets returns only tickets belonging to the branch
// embedded in the franchise session; a client cannot switch branches by query.
func (h *PlatformHandler) ListFranchiseMaintenanceTickets(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, franchiseID, ok := h.franchiseMaintenanceScope(c)
	if !ok {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT t.id,b.code,b.name,t.title,t.priority,t.status,COALESCE(t.technician_name,''),t.due_at,t.created_at
		FROM maintenance_tickets t
		JOIN branches b ON b.id=t.branch_id
		WHERE t.branch_id=$1 AND b.franchisee_id=$2
		ORDER BY t.created_at DESC,t.id DESC`, branchID, franchiseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดรายการแจ้งซ่อมได้"})
		return
	}
	defer rows.Close()
	tickets := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var code, branchName, title, priority, status, technician string
		var dueAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(&id, &code, &branchName, &title, &priority, &status, &technician, &dueAt, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายการแจ้งซ่อมได้"})
			return
		}
		tickets = append(tickets, gin.H{"id": id, "branchCode": code, "branchName": branchName, "title": title, "priority": priority, "status": status, "technicianName": technician, "dueAt": dueAt, "createdAt": createdAt})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดรายการแจ้งซ่อมได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": tickets})
}

// CreateFranchiseMaintenanceTicket creates a repair request for the signed-in
// franchise branch only. The branch id is never trusted from the request body.
func (h *PlatformHandler) CreateFranchiseMaintenanceTicket(c *gin.Context) {
	var in struct {
		Title, Description, Priority, DueAt string
	}
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลแจ้งซ่อมไม่ถูกต้อง"})
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	in.Priority = defaultString(strings.TrimSpace(in.Priority), "normal")
	in.DueAt = strings.TrimSpace(in.DueAt)
	if in.Title == "" || !isMaintenancePriority(in.Priority) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลแจ้งซ่อมไม่ถูกต้อง"})
		return
	}
	if in.DueAt != "" {
		if _, err := time.Parse("2006-01-02", in.DueAt); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลแจ้งซ่อมไม่ถูกต้อง"})
			return
		}
	}
	if h.unavailable(c) {
		return
	}
	branchID, franchiseID, ok := h.franchiseMaintenanceScope(c)
	if !ok {
		return
	}
	var ticketID int64
	err := h.db.QueryRowContext(c.Request.Context(), `
		INSERT INTO maintenance_tickets(branch_id,title,description,priority,due_at)
		SELECT b.id,$3,$4,$5,NULLIF($6,'')::date
		FROM branches b
		WHERE b.id=$1 AND b.franchisee_id=$2
		RETURNING id`, branchID, franchiseID, in.Title, in.Description, in.Priority, in.DueAt).Scan(&ticketID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "สาขานี้ไม่อยู่ในความดูแลของคุณ"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถส่งแจ้งซ่อมได้"})
		return
	}
	h.recordAudit(c, branchID, "maintenance_ticket", ticketID, "created", gin.H{"title": in.Title, "source": "franchise"})
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": ticketID, "status": "open"}})
}
func (h *PlatformHandler) ListInspections(c *gin.Context) {
	h.listOps(c, `SELECT i.id,b.code,b.name,b.size,i.inspector_name,i.status,i.score,i.findings,i.due_at,i.action_owner,i.checklist_results,i.evidence_urls,i.maintenance_ticket_id,i.template_id,COALESCE(t.name,'') FROM inspections i JOIN branches b ON b.id=i.branch_id LEFT JOIN inspection_templates t ON t.id=i.template_id`, "inspections")
}
func (h *PlatformHandler) ListServiceInvoices(c *gin.Context) {
	h.listOps(c, `SELECT i.id,b.code,b.name,i.invoice_number,i.service_type,i.amount,i.status,i.due_at FROM service_invoices i JOIN branches b ON b.id=i.branch_id`, "invoices")
}

func (h *PlatformHandler) listOps(c *gin.Context, query, kind string) {
	if h.unavailable(c) {
		return
	}
	args := []any{}
	if code := strings.TrimSpace(c.Query("branchCode")); code != "" {
		query += " WHERE b.code=$1"
		args = []any{code}
	}
	query += " ORDER BY 1 DESC"
	rows, err := h.db.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถโหลดข้อมูลได้"})
		return
	}
	defer rows.Close()
	out := []gin.H{}
	for rows.Next() {
		switch kind {
		case "assets":
			var id int64
			var code, branchName, assetName, assetType, serial, status string
			var warranty, due *time.Time
			if err = rows.Scan(&id, &code, &branchName, &assetName, &assetType, &serial, &warranty, &due, &status); err == nil {
				out = append(out, gin.H{"id": id, "branchCode": code, "branchName": branchName, "name": assetName, "assetType": assetType, "serialNumber": serial, "warrantyUntil": warranty, "maintenanceDue": due, "status": status})
			}
		case "maintenance":
			var id int64
			var code, branch, title, description, priority, status, tech string
			var cost float64
			var due *time.Time
			if err = rows.Scan(&id, &code, &branch, &title, &description, &priority, &status, &tech, &cost, &due); err == nil {
				out = append(out, gin.H{"id": id, "branchCode": code, "branchName": branch, "title": title, "description": description, "priority": priority, "status": status, "technicianName": tech, "cost": cost, "dueAt": due})
			}
		case "inspections":
			var id int64
			var code, branch, branchSize, inspector, status, findings string
			var score *float64
			var due *time.Time
			var owner string
			var checklist, evidence []byte
			var ticketID, templateID *int64
			var templateName string
			if err = rows.Scan(&id, &code, &branch, &branchSize, &inspector, &status, &score, &findings, &due, &owner, &checklist, &evidence, &ticketID, &templateID, &templateName); err == nil {
				out = append(out, gin.H{"id": id, "branchCode": code, "branchName": branch, "branchSize": branchSize, "inspectorName": inspector, "status": status, "score": score, "findings": findings, "dueAt": due, "actionOwner": owner, "checklistResults": json.RawMessage(checklist), "evidenceURLs": json.RawMessage(evidence), "maintenanceTicketId": ticketID, "templateId": templateID, "templateName": templateName})
			}
		case "invoices":
			var id int64
			var code, branch, no, service, status string
			var amount float64
			var due *time.Time
			if err = rows.Scan(&id, &code, &branch, &no, &service, &amount, &status, &due); err == nil {
				out = append(out, gin.H{"id": id, "branchCode": code, "branchName": branch, "invoiceNumber": no, "serviceType": service, "amount": amount, "status": status, "dueAt": due})
			}
		}
	}
	c.JSON(200, gin.H{"success": true, "data": out})
}

func (h *PlatformHandler) CreateMaintenanceTicket(c *gin.Context) {
	var in struct {
		BranchCode, Title, Description, Priority, TechnicianName, DueAt string
		LaborCost, PartsCost, TravelCost                                float64
	}
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลใบงานไม่ถูกต้อง"})
		return
	}
	in.BranchCode = strings.TrimSpace(in.BranchCode)
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	in.TechnicianName = strings.TrimSpace(in.TechnicianName)
	in.Priority = defaultString(strings.TrimSpace(in.Priority), "normal")
	if in.BranchCode == "" || in.Title == "" || !isMaintenancePriority(in.Priority) {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลใบงานไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	id, ok := h.operationsBranchID(c, in.BranchCode)
	if !ok {
		return
	}
	var ticketID int64
	err := h.db.QueryRowContext(c.Request.Context(), `INSERT INTO maintenance_tickets(branch_id,title,description,priority,technician_name,labor_cost,parts_cost,travel_cost,due_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,'')::date) RETURNING id`, id, in.Title, in.Description, in.Priority, in.TechnicianName, in.LaborCost, in.PartsCost, in.TravelCost, in.DueAt).Scan(&ticketID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างใบงานได้"})
		return
	}
	h.recordAudit(c, id, "maintenance_ticket", ticketID, "created", gin.H{"title": in.Title})
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": ticketID}})
}

func (h *PlatformHandler) DownloadMaintenancePDF(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสใบงานซ่อมไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	var data maintenancePDFData
	err = h.db.QueryRowContext(c.Request.Context(), `
		SELECT t.id,b.code,b.name,t.title,COALESCE(t.description,''),t.priority,t.status,
			COALESCE(t.technician_name,''),t.due_at,t.created_at
		FROM maintenance_tickets t
		JOIN branches b ON b.id=t.branch_id
		WHERE t.id=$1`, id).Scan(
		&data.ID,
		&data.BranchCode,
		&data.BranchName,
		&data.Title,
		&data.Description,
		&data.Priority,
		&data.Status,
		&data.TechnicianName,
		&data.DueAt,
		&data.CreatedAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบใบงานซ่อม"})
		return
	}
	pdf, err := maintenancePDF(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างใบงานซ่อม PDF ได้"})
		return
	}
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+url.PathEscape(maintenancePDFDownloadFilename(data)))
	c.Data(http.StatusOK, "application/pdf", pdf)
}

func (h *PlatformHandler) UpdateMaintenanceStatus(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var in struct {
		Status string `json:"status"`
	}
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"success": false})
		return
	}
	in.Status = strings.TrimSpace(in.Status)
	if id < 1 || !isMaintenanceStatus(in.Status) {
		c.JSON(400, gin.H{"success": false})
		return
	}
	if h.unavailable(c) {
		return
	}
	_, err := h.db.ExecContext(c.Request.Context(), `UPDATE maintenance_tickets SET status=$1,completed_at=CASE WHEN $1='completed' THEN now() ELSE completed_at END,updated_at=now() WHERE id=$2`, in.Status, id)
	if err != nil {
		c.JSON(500, gin.H{"success": false})
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func maintenancePDFDownloadFilename(data maintenancePDFData) string {
	return "ใบงานแจ้งซ่อม_งานที่-" + strconv.FormatInt(data.ID, 10) + "_สาขา-" + data.BranchName + "_" + data.BranchCode + ".pdf"
}

func isMaintenancePriority(value string) bool {
	return value == "low" || value == "normal" || value == "urgent"
}

func isMaintenanceStatus(value string) bool {
	return value == "open" || value == "assigned" || value == "waiting_parts" || value == "completed"
}

func isInspectionStatus(value string) bool {
	return value == "passed" || value == "needs_action" || value == "failed"
}

func isInspectionTemplateSize(value string) bool {
	return value == "all" || value == "S" || value == "M" || value == "L"
}

func isAssetStatus(value string) bool {
	return value == "active" || value == "repairing" || value == "retired"
}

func isInvoiceStatus(value string) bool {
	return value == "draft" || value == "sent" || value == "paid" || value == "overdue"
}

func isServiceType(value string) bool {
	return value == "inspection" || value == "maintenance" || value == "parts" || value == "subscription"
}

func (h *PlatformHandler) ListInspectionTemplates(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,name,branch_size,checklist,active,created_at FROM inspection_templates WHERE active=true ORDER BY created_at DESC,id DESC`)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถโหลดชุดตรวจได้"})
		return
	}
	defer rows.Close()
	templates := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var name, branchSize string
		var checklist []byte
		var active bool
		var createdAt time.Time
		if err = rows.Scan(&id, &name, &branchSize, &checklist, &active, &createdAt); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านชุดตรวจได้"})
			return
		}
		templates = append(templates, gin.H{"id": id, "name": name, "branchSize": branchSize, "checklist": json.RawMessage(checklist), "active": active, "createdAt": createdAt})
	}
	c.JSON(200, gin.H{"success": true, "data": templates})
}

func (h *PlatformHandler) CreateInspectionTemplate(c *gin.Context) {
	var in struct {
		Name       string   `json:"name"`
		BranchSize string   `json:"branchSize"`
		Checklist  []string `json:"checklist"`
	}
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลชุดตรวจไม่ถูกต้อง"})
		return
	}
	in.Name, in.BranchSize = strings.TrimSpace(in.Name), defaultString(strings.TrimSpace(in.BranchSize), "all")
	items := make([]string, 0, len(in.Checklist))
	for _, item := range in.Checklist {
		if value := strings.TrimSpace(item); value != "" {
			items = append(items, value)
		}
	}
	if in.Name == "" || !isInspectionTemplateSize(in.BranchSize) || len(items) == 0 || len(items) > 100 {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลชุดตรวจไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	checklist, _ := json.Marshal(items)
	var id int64
	if err := h.db.QueryRowContext(c.Request.Context(), `INSERT INTO inspection_templates(name,branch_size,checklist) VALUES($1,$2,$3) RETURNING id`, in.Name, in.BranchSize, checklist).Scan(&id); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างชุดตรวจได้"})
		return
	}
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": id}})
}

func (h *PlatformHandler) RandomizeInspection(c *gin.Context) {
	var in struct {
		InspectorName string `json:"inspectorName"`
		BranchSize    string `json:"branchSize"`
		DueAt         string `json:"dueAt"`
		ExcludeDays   int    `json:"excludeDays"`
	}
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลการสุ่มตรวจไม่ถูกต้อง"})
		return
	}
	in.InspectorName = strings.TrimSpace(in.InspectorName)
	in.BranchSize = defaultString(strings.TrimSpace(in.BranchSize), "all")
	if in.ExcludeDays == 0 {
		in.ExcludeDays = 30
	}
	if in.InspectorName == "" || !isInspectionTemplateSize(in.BranchSize) || in.ExcludeDays < 0 || in.ExcludeDays > 365 {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลการสุ่มตรวจไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	// Random inspection is a technician work order. It deliberately does not
	// depend on configurable QA templates, which keeps every new assignment
	// complete and ready to hand to a technician.
	checklist, _ := json.Marshal(technicianInspectionChecklist)
	templateName := "ใบงานตรวจช่างมาตรฐาน"
	type branchCandidate struct {
		id               int64
		code, name, size string
	}
	findBranch := func(ignoreRecent bool) (branchCandidate, error) {
		base := `SELECT b.id,b.code,b.name,b.size FROM branches b WHERE b.status='active' AND ($1='all' OR b.size=$1)`
		arguments := []any{in.BranchSize}
		if !ignoreRecent {
			base += ` AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.branch_id=b.id AND i.created_at >= now()-make_interval(days => $2))`
			arguments = append(arguments, in.ExcludeDays)
		}
		base += ` ORDER BY random() LIMIT 1`
		var branch branchCandidate
		err := h.db.QueryRowContext(c.Request.Context(), base, arguments...).Scan(&branch.id, &branch.code, &branch.name, &branch.size)
		return branch, err
	}
	branch, err := findBranch(false)
	if err != nil {
		branch, err = findBranch(true)
	}
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "ไม่พบสาขาที่สามารถสุ่มตรวจได้"})
		return
	}
	var inspectionID int64
	err = h.db.QueryRowContext(c.Request.Context(), `INSERT INTO inspections(branch_id,inspector_name,status,due_at,checklist_results,evidence_urls) VALUES($1,$2,'scheduled',NULLIF($3,'')::date,$4,'[]'::jsonb) RETURNING id`, branch.id, in.InspectorName, strings.TrimSpace(in.DueAt), checklist).Scan(&inspectionID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างงานสุ่มตรวจได้"})
		return
	}
	h.recordAudit(c, branch.id, "inspection", inspectionID, "scheduled", gin.H{"templateName": templateName})
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": inspectionID, "branchCode": branch.code, "branchName": branch.name, "branchSize": branch.size, "inspectorName": in.InspectorName, "templateId": 0, "templateName": templateName, "checklist": json.RawMessage(checklist), "dueAt": strings.TrimSpace(in.DueAt)}})
}

func (h *PlatformHandler) CreateInspection(c *gin.Context) {
	var in struct {
		BranchCode, InspectorName, Status, Findings, DueAt, ActionOwner string
		Score                                                           *float64
		ChecklistResults, EvidenceURLs                                  []string
	}
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลผลตรวจไม่ถูกต้อง"})
		return
	}
	in.BranchCode, in.InspectorName, in.Status = strings.TrimSpace(in.BranchCode), strings.TrimSpace(in.InspectorName), strings.TrimSpace(in.Status)
	if in.BranchCode == "" || in.InspectorName == "" || !isInspectionStatus(in.Status) || in.Score == nil || *in.Score < 0 || *in.Score > 100 {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลผลตรวจไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.operationsBranchID(c, in.BranchCode)
	if !ok {
		return
	}
	checklist, _ := json.Marshal(in.ChecklistResults)
	evidence, _ := json.Marshal(in.EvidenceURLs)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกผลตรวจได้"})
		return
	}
	defer tx.Rollback()
	var inspectionID int64
	err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO inspections(branch_id,inspector_name,status,score,findings,due_at,action_owner,checklist_results,evidence_urls,completed_at) VALUES($1,$2,$3,$4,$5,NULLIF($6,'')::date,$7,$8,$9,now()) RETURNING id`, branchID, in.InspectorName, in.Status, in.Score, strings.TrimSpace(in.Findings), strings.TrimSpace(in.DueAt), strings.TrimSpace(in.ActionOwner), checklist, evidence).Scan(&inspectionID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกผลตรวจได้"})
		return
	}
	var ticketID *int64
	if in.Status == "needs_action" || in.Status == "failed" {
		var createdTicketID int64
		title := "แก้ไขตามผลตรวจมาตรฐาน"
		if err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO maintenance_tickets(branch_id,title,description,priority,technician_name,due_at) VALUES($1,$2,$3,$4,$5,NULLIF($6,'')::date) RETURNING id`, branchID, title, strings.TrimSpace(in.Findings), "normal", strings.TrimSpace(in.ActionOwner), strings.TrimSpace(in.DueAt)).Scan(&createdTicketID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างใบงานแก้ไขได้"})
			return
		}
		if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inspections SET maintenance_ticket_id=$1 WHERE id=$2`, createdTicketID, inspectionID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเชื่อมใบงานแก้ไขได้"})
			return
		}
		ticketID = &createdTicketID
	}
	claims := middleware.ClaimsFrom(c)
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "inspection", inspectionID, "completed", gin.H{"status": in.Status, "score": in.Score, "maintenanceTicketId": ticketID}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกผลตรวจได้"})
		return
	}
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": inspectionID, "maintenanceTicketId": ticketID}})
}

func (h *PlatformHandler) CompleteInspection(c *gin.Context) {
	inspectionID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || inspectionID < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสงานตรวจไม่ถูกต้อง"})
		return
	}
	var in struct {
		Status, Findings, DueAt, ActionOwner string
		Score                                *float64
		ChecklistResults, EvidenceURLs       []string
	}
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลผลตรวจไม่ถูกต้อง"})
		return
	}
	in.Status = strings.TrimSpace(in.Status)
	if !isInspectionStatus(in.Status) || in.Score == nil || *in.Score < 0 || *in.Score > 100 {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลผลตรวจไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	checklist, _ := json.Marshal(in.ChecklistResults)
	evidence, _ := json.Marshal(in.EvidenceURLs)
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกผลตรวจได้"})
		return
	}
	defer tx.Rollback()
	var branchID int64
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT branch_id FROM inspections WHERE id=$1 AND status='scheduled' FOR UPDATE`, inspectionID).Scan(&branchID); err != nil {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบงานตรวจที่รอดำเนินการ"})
		return
	}
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inspections SET status=$1,score=$2,findings=$3,due_at=NULLIF($4,'')::date,action_owner=$5,checklist_results=$6,evidence_urls=$7,completed_at=now() WHERE id=$8`, in.Status, in.Score, strings.TrimSpace(in.Findings), strings.TrimSpace(in.DueAt), strings.TrimSpace(in.ActionOwner), checklist, evidence, inspectionID); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกผลตรวจได้"})
		return
	}
	var ticketID *int64
	if in.Status == "needs_action" || in.Status == "failed" {
		var createdTicketID int64
		if err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO maintenance_tickets(branch_id,title,description,priority,technician_name,due_at) VALUES($1,$2,$3,$4,$5,NULLIF($6,'')::date) RETURNING id`, branchID, "แก้ไขตามผลตรวจมาตรฐาน", strings.TrimSpace(in.Findings), "normal", strings.TrimSpace(in.ActionOwner), strings.TrimSpace(in.DueAt)).Scan(&createdTicketID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างใบงานแก้ไขได้"})
			return
		}
		if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inspections SET maintenance_ticket_id=$1 WHERE id=$2`, createdTicketID, inspectionID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเชื่อมใบงานแก้ไขได้"})
			return
		}
		ticketID = &createdTicketID
	}
	claims := middleware.ClaimsFrom(c)
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "inspection", inspectionID, "completed", gin.H{"status": in.Status, "score": in.Score, "maintenanceTicketId": ticketID}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกผลตรวจได้"})
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"id": inspectionID, "maintenanceTicketId": ticketID}})
}

func (h *PlatformHandler) DownloadInspectionPDF(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(400, gin.H{"success": false, "message": "รหัสงานตรวจไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	var data inspectionPDFData
	var checklist []byte
	err = h.db.QueryRowContext(c.Request.Context(), `SELECT i.id,b.code,b.name,i.inspector_name,i.status,i.score,i.due_at,i.checklist_results,i.findings FROM inspections i JOIN branches b ON b.id=i.branch_id WHERE i.id=$1`, id).Scan(&data.ID, &data.BranchCode, &data.BranchName, &data.InspectorName, &data.Status, &data.Score, &data.DueAt, &checklist, &data.Findings)
	if err != nil {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบงานตรวจ"})
		return
	}
	data.Checklist = parseInspectionChecklist(checklist)
	pdf, err := inspectionPDF(data)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างรายงาน PDF ได้"})
		return
	}
	filename := inspectionPDFDownloadFilename(data)
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+url.PathEscape(filename))
	c.Data(200, "application/pdf", pdf)
}

// inspectionPDFDownloadFilename keeps downloaded inspection reports identifiable
// when several branches and work orders are stored in the same folder.
func inspectionPDFDownloadFilename(data inspectionPDFData) string {
	return "ใบงานตรวจช่าง_งานที่-" + strconv.FormatInt(data.ID, 10) + "_สาขา-" + data.BranchName + "_" + data.BranchCode + ".pdf"
}

func (h *PlatformHandler) CreateAsset(c *gin.Context) {
	var in struct{ BranchCode, Name, AssetType, SerialNumber, WarrantyUntil, MaintenanceDue string }
	if c.ShouldBindJSON(&in) != nil || strings.TrimSpace(in.BranchCode) == "" || strings.TrimSpace(in.Name) == "" || strings.TrimSpace(in.AssetType) == "" {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลทรัพย์สินไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.operationsBranchID(c, strings.TrimSpace(in.BranchCode))
	if !ok {
		return
	}
	var assetID int64
	err := h.db.QueryRowContext(c.Request.Context(), `INSERT INTO branch_assets(branch_id,name,asset_type,serial_number,warranty_until,maintenance_due) VALUES($1,$2,$3,$4,NULLIF($5,'')::date,NULLIF($6,'')::date) RETURNING id`, branchID, strings.TrimSpace(in.Name), strings.TrimSpace(in.AssetType), strings.TrimSpace(in.SerialNumber), strings.TrimSpace(in.WarrantyUntil), strings.TrimSpace(in.MaintenanceDue)).Scan(&assetID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถเพิ่มทรัพย์สินได้"})
		return
	}
	_, _ = h.db.ExecContext(c.Request.Context(), `INSERT INTO branch_asset_events(asset_id,branch_id,event_type,note) VALUES($1,$2,'created',$3)`, assetID, branchID, "เพิ่มทรัพย์สิน")
	h.recordAudit(c, branchID, "branch_asset", assetID, "created", gin.H{"name": strings.TrimSpace(in.Name)})
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": assetID}})
}

func (h *PlatformHandler) UpdateAsset(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	var in struct{ BranchCode, Status, Note, EventType string }
	if err != nil || id < 1 || c.ShouldBindJSON(&in) != nil || !isAssetStatus(strings.TrimSpace(in.Status)) {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลทรัพย์สินไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.operationsBranchID(c, strings.TrimSpace(in.BranchCode))
	if !ok {
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `UPDATE branch_assets SET branch_id=$1,status=$2,updated_at=now() WHERE id=$3`, branchID, strings.TrimSpace(in.Status), id)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบทรัพย์สิน"})
		return
	}
	event := "updated"
	if strings.TrimSpace(in.EventType) == "transferred" {
		event = "transferred"
	}
	if in.Status == "repairing" {
		event = "repairing"
	}
	if in.Status == "retired" {
		event = "retired"
	}
	_, _ = h.db.ExecContext(c.Request.Context(), `INSERT INTO branch_asset_events(asset_id,branch_id,event_type,note) VALUES($1,$2,$3,$4)`, id, branchID, event, strings.TrimSpace(in.Note))
	h.recordAudit(c, branchID, "branch_asset", id, event, gin.H{"status": strings.TrimSpace(in.Status)})
	c.JSON(200, gin.H{"success": true})
}

func (h *PlatformHandler) CreateServiceInvoice(c *gin.Context) {
	var in struct {
		BranchCode, InvoiceNumber, ServiceType, DueAt string
		Amount                                        float64
		MaintenanceTicketID, InspectionID             *int64
	}
	if c.ShouldBindJSON(&in) != nil || strings.TrimSpace(in.BranchCode) == "" || strings.TrimSpace(in.InvoiceNumber) == "" || !isServiceType(strings.TrimSpace(in.ServiceType)) || in.Amount < 0 {
		c.JSON(400, gin.H{"success": false, "message": "ข้อมูลใบเรียกเก็บเงินไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	branchID, ok := h.operationsBranchID(c, strings.TrimSpace(in.BranchCode))
	if !ok {
		return
	}
	var invoiceID int64
	err := h.db.QueryRowContext(c.Request.Context(), `INSERT INTO service_invoices(branch_id,maintenance_ticket_id,inspection_id,invoice_number,service_type,amount,due_at) VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,'')::date) RETURNING id`, branchID, in.MaintenanceTicketID, in.InspectionID, strings.TrimSpace(in.InvoiceNumber), strings.TrimSpace(in.ServiceType), in.Amount, strings.TrimSpace(in.DueAt)).Scan(&invoiceID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถสร้างใบเรียกเก็บเงินได้"})
		return
	}
	h.recordAudit(c, branchID, "service_invoice", invoiceID, "created", gin.H{"invoiceNumber": strings.TrimSpace(in.InvoiceNumber), "amount": in.Amount})
	c.JSON(201, gin.H{"success": true, "data": gin.H{"id": invoiceID}})
}

func (h *PlatformHandler) UpdateServiceInvoiceStatus(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	var in struct {
		Status string `json:"status"`
	}
	if err != nil || id < 1 || c.ShouldBindJSON(&in) != nil || !isInvoiceStatus(strings.TrimSpace(in.Status)) {
		c.JSON(400, gin.H{"success": false, "message": "สถานะใบเรียกเก็บเงินไม่ถูกต้อง"})
		return
	}
	if h.unavailable(c) {
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `UPDATE service_invoices SET status=$1,paid_at=CASE WHEN $1='paid' THEN now() ELSE paid_at END WHERE id=$2`, strings.TrimSpace(in.Status), id)
	if err != nil || rowsAffected(result) == 0 {
		c.JSON(404, gin.H{"success": false, "message": "ไม่พบใบเรียกเก็บเงิน"})
		return
	}
	c.JSON(200, gin.H{"success": true})
}

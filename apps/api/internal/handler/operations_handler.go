package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

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
func (h *PlatformHandler) ListMaintenanceTickets(c *gin.Context) {
	h.listOps(c, `SELECT t.id,b.code,b.name,t.title,t.priority,t.status,COALESCE(t.technician_name,''),t.labor_cost+t.parts_cost+t.travel_cost,t.due_at FROM maintenance_tickets t JOIN branches b ON b.id=t.branch_id`, "maintenance")
}
func (h *PlatformHandler) ListInspections(c *gin.Context) {
	h.listOps(c, `SELECT i.id,b.code,b.name,i.inspector_name,i.status,i.score,i.findings,i.due_at FROM inspections i JOIN branches b ON b.id=i.branch_id`, "inspections")
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
			var code, branch, title, priority, status, tech string
			var cost float64
			var due *time.Time
			if err = rows.Scan(&id, &code, &branch, &title, &priority, &status, &tech, &cost, &due); err == nil {
				out = append(out, gin.H{"id": id, "branchCode": code, "branchName": branch, "title": title, "priority": priority, "status": status, "technicianName": tech, "cost": cost, "dueAt": due})
			}
		case "inspections":
			var id int64
			var code, branch, inspector, status, findings string
			var score *float64
			var due *time.Time
			if err = rows.Scan(&id, &code, &branch, &inspector, &status, &score, &findings, &due); err == nil {
				out = append(out, gin.H{"id": id, "branchCode": code, "branchName": branch, "inspectorName": inspector, "status": status, "score": score, "findings": findings, "dueAt": due})
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

func isMaintenancePriority(value string) bool {
	return value == "low" || value == "normal" || value == "urgent"
}

func isMaintenanceStatus(value string) bool {
	return value == "open" || value == "assigned" || value == "waiting_parts" || value == "completed"
}

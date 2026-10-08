package handler

import (
	"bytes"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"y/internal/middleware"
)

type staffScheduleExportRow struct {
	date      time.Time
	userID    int64
	name      string
	status    string
	startsAt  string
	endsAt    string
	leaveType string
}

type staffScheduleExportGridRow struct {
	userID   int64
	name     string
	startsAt string
	endsAt   string
	shifts   map[string]staffScheduleExportRow
}

func thaiScheduleMonthYear(date time.Time) string {
	months := [...]string{"", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"}
	return fmt.Sprintf("%s %d", months[date.Month()], date.Year()+543)
}

func safeScheduleExportBranchName(branchName string) string {
	return strings.TrimSpace(strings.NewReplacer("/", "-", "\\", "-").Replace(branchName))
}

func thaiScheduleWeekday(date time.Time) string {
	weekdays := [...]string{"อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"}
	return weekdays[date.Weekday()]
}

func staffScheduleWeeklyGridValue(shift staffScheduleExportRow) string {
	switch shift.status {
	case "scheduled", "compensatory_work":
		if len(shift.startsAt) >= 5 && len(shift.endsAt) >= 5 {
			start := strings.TrimPrefix(strings.ReplaceAll(shift.startsAt[:5], ":", "."), "0")
			end := strings.TrimPrefix(strings.ReplaceAll(shift.endsAt[:5], ":", "."), "0")
			return fmt.Sprintf("%s-%s", start, end)
		}
		return fmt.Sprintf("%s-%s", shift.startsAt, shift.endsAt)
	case "day_off":
		return "OFF"
	default:
		if shift.leaveType != "" {
			return shift.leaveType
		}
		return "ลา"
	}
}

func buildWeeklyStaffScheduleWorkbook(month, monthEnd time.Time, gridRows []staffScheduleExportGridRow) (*bytes.Buffer, error) {
	workbook := excelize.NewFile()
	defer func() { _ = workbook.Close() }()
	const sheet = "ตารางงาน"
	workbook.SetSheetName(workbook.GetSheetName(0), sheet)

	border := []excelize.Border{
		{Type: "left", Color: "000000", Style: 1},
		{Type: "right", Color: "000000", Style: 1},
		{Type: "top", Color: "000000", Style: 1},
		{Type: "bottom", Color: "000000", Style: 1},
	}
	weekdayStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 11, Color: "000000"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFE699"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    border,
	})
	dateStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 11, Color: "000000"},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		NumFmt:    14,
		Border:    border,
	})
	cellStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 11, Color: "000000"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    border,
	})
	nameStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 11, Color: "000000"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    border,
	})

	_ = workbook.SetColWidth(sheet, "A", "A", 2)
	_ = workbook.SetColWidth(sheet, "B", "B", 16)
	_ = workbook.SetColWidth(sheet, "C", "I", 17)
	hideGridLines := false
	_ = workbook.SetSheetView(sheet, 0, &excelize.ViewOptions{ShowGridLines: &hideGridLines})

	firstWeekStart := month.AddDate(0, 0, -((int(month.Weekday()) + 6) % 7))
	lastDate := monthEnd.AddDate(0, 0, -1)
	row := 2
	for weekStart := firstWeekStart; !weekStart.After(lastDate); weekStart = weekStart.AddDate(0, 0, 7) {
		for blockRow := row; blockRow < row+3+len(gridRows)*2; blockRow++ {
			workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", blockRow), fmt.Sprintf("I%d", blockRow), cellStyle)
		}
		for dayOffset := 0; dayOffset < 7; dayOffset++ {
			date := weekStart.AddDate(0, 0, dayOffset)
			column, _ := excelize.ColumnNumberToName(dayOffset + 3)
			weekdayCell := fmt.Sprintf("%s%d", column, row)
			dateCell := fmt.Sprintf("%s%d", column, row+1)
			workbook.SetCellValue(sheet, weekdayCell, thaiScheduleWeekday(date))
			workbook.SetCellStyle(sheet, weekdayCell, weekdayCell, weekdayStyle)
			if !date.Before(month) && date.Before(monthEnd) {
				workbook.SetCellValue(sheet, dateCell, date)
			}
			workbook.SetCellStyle(sheet, dateCell, dateCell, dateStyle)
		}
		workbook.SetRowHeight(sheet, row, 23)
		workbook.SetRowHeight(sheet, row+1, 23)

		for index, item := range gridRows {
			staffRow := row + 3 + index*2
			workbook.SetCellValue(sheet, fmt.Sprintf("B%d", staffRow), item.name)
			workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", staffRow), fmt.Sprintf("B%d", staffRow), nameStyle)
			for dayOffset := 0; dayOffset < 7; dayOffset++ {
				date := weekStart.AddDate(0, 0, dayOffset)
				if date.Before(month) || !date.Before(monthEnd) {
					continue
				}
				shift, exists := item.shifts[date.Format("2006-01-02")]
				if !exists {
					continue
				}
				column, _ := excelize.ColumnNumberToName(dayOffset + 3)
				workbook.SetCellValue(sheet, fmt.Sprintf("%s%d", column, staffRow), staffScheduleWeeklyGridValue(shift))
			}
			workbook.SetRowHeight(sheet, staffRow, 23)
			workbook.SetRowHeight(sheet, staffRow+1, 23)
		}
		if len(gridRows) == 0 {
			workbook.SetCellValue(sheet, fmt.Sprintf("B%d", row+3), "ยังไม่มีตารางงานสำหรับเดือนนี้")
			workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", row+3), fmt.Sprintf("I%d", row+3), nameStyle)
		}
		row += 3 + len(gridRows)*2
	}
	return workbook.WriteToBuffer()
}

// ExportStaffSchedulesXLSX exports a monthly schedule as weekly Monday-to-Sunday blocks.
func (h *PlatformHandler) ExportStaffSchedulesXLSX(c *gin.Context) {
	month, err := time.Parse("2006-01", c.Query("month"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "month ต้องอยู่ในรูปแบบ YYYY-MM"})
		return
	}
	var branchID int64
	if _, err := fmt.Sscan(c.Query("branchId"), &branchID); err != nil || branchID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุสาขาที่ต้องการส่งออก"})
		return
	}
	claims := middleware.ClaimsFrom(c)
	if claims.Role == "franchise_owner" {
		scopedBranchID, ok := h.branchScope(c)
		if !ok || claims.FranchiseeID == nil || scopedBranchID != branchID {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "ส่งออกได้เฉพาะสาขาแฟรนไชส์ของคุณ"})
			return
		}
	}

	var branchName string
	branchQuery := `SELECT name FROM branches WHERE id=$1 AND franchisee_id IS NULL`
	branchArgs := []any{branchID}
	if claims.Role == "franchise_owner" {
		branchQuery = `SELECT name FROM branches WHERE id=$1 AND franchisee_id=$2`
		branchArgs = append(branchArgs, *claims.FranchiseeID)
	}
	if err := h.db.QueryRowContext(c.Request.Context(), branchQuery, branchArgs...).Scan(&branchName); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่เลือก"})
		return
	}

	monthEnd := month.AddDate(0, 1, 0)
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT schedule.shift_date,
			staff.id,
			staff.name,
			schedule.status,
			schedule.starts_at::text,
			schedule.ends_at::text,
			COALESCE(schedule.leave_type,'')
		FROM staff_shifts schedule
		JOIN users staff ON staff.id=schedule.user_id
		WHERE schedule.branch_id=$1 AND schedule.shift_date >= $2::date AND schedule.shift_date < $3::date
		ORDER BY schedule.starts_at,schedule.ends_at,staff.name,staff.id,schedule.shift_date
	`, branchID, month, monthEnd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านตารางงานเพื่อส่งออกได้"})
		return
	}
	defer rows.Close()

	gridRows := []staffScheduleExportGridRow{}
	gridRowsByKey := map[string]int{}
	for rows.Next() {
		var schedule staffScheduleExportRow
		if err := rows.Scan(&schedule.date, &schedule.userID, &schedule.name, &schedule.status, &schedule.startsAt, &schedule.endsAt, &schedule.leaveType); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านตารางงานเพื่อส่งออกได้"})
			return
		}
		key := fmt.Sprintf("%d|%s|%s", schedule.userID, schedule.startsAt, schedule.endsAt)
		index, exists := gridRowsByKey[key]
		if !exists {
			index = len(gridRows)
			gridRowsByKey[key] = index
			gridRows = append(gridRows, staffScheduleExportGridRow{
				userID: schedule.userID, name: schedule.name, startsAt: schedule.startsAt, endsAt: schedule.endsAt, shifts: map[string]staffScheduleExportRow{},
			})
		}
		gridRows[index].shifts[schedule.date.Format("2006-01-02")] = schedule
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านตารางงานเพื่อส่งออกได้"})
		return
	}

	content, err := buildWeeklyStaffScheduleWorkbook(month, monthEnd, gridRows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
		return
	}
	filename := fmt.Sprintf("ตารางงานพนักงาน-สาขา%s-%s.xlsx", safeScheduleExportBranchName(branchName), strings.ReplaceAll(thaiScheduleMonthYear(month), " ", "-"))
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+url.PathEscape(filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content.Bytes())
}

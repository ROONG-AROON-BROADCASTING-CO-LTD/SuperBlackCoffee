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

type staffScheduleExportHoliday struct {
	date time.Time
	name string
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
			return fmt.Sprintf("%s\n%s", shift.startsAt[:5], shift.endsAt[:5])
		}
		return fmt.Sprintf("%s\n%s", shift.startsAt, shift.endsAt)
	case "day_off":
		if strings.HasPrefix(shift.leaveType, "วันหยุดชดเชยวันนักขัตฤกษ์:") {
			return "หยุดชดเชย"
		}
		return "หยุด"
	default:
		if shift.leaveType != "" {
			return shift.leaveType
		}
		return "ลา"
	}
}

func buildMonthlyStaffScheduleWorkbook(month, monthEnd time.Time, branchName string, holidays map[string]bool, holidayDetails []staffScheduleExportHoliday, gridRows []staffScheduleExportGridRow) (*bytes.Buffer, error) {
	workbook := excelize.NewFile()
	defer func() { _ = workbook.Close() }()
	const sheet = "ตารางงาน"
	const lastDayColumn = "AG"
	workbook.SetSheetName(workbook.GetSheetName(0), sheet)

	// Use a familiar Thai system font and larger type throughout. The schedule is
	// normally viewed from a short distance or printed, so legibility matters more
	// than fitting the most rows possible on screen.
	const scheduleFont = "Tahoma"
	border := []excelize.Border{{Type: "left", Color: "D6CEC8", Style: 1}, {Type: "right", Color: "D6CEC8", Style: 1}, {Type: "top", Color: "D6CEC8", Style: 1}, {Type: "bottom", Color: "D6CEC8", Style: 1}}
	cellStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Size: 12, Color: "201A17"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    border,
	})
	nameStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 12, Color: "201A17"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    border,
	})
	noteCellStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Size: 11, Color: "473931"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	titleStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 18, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"3C2D24"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
	})
	noteStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Size: 11, Color: "332923"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FBF5E9"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
	})
	workingTimeStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 12, Color: "155724"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"E4F4E7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	dayOffStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 12, Color: "8A1C1C"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FBE6E4"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	compensatoryDayOffStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 12, Color: "1A4D76"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"DDEEFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	leaveStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 12, Color: "6A3510"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFF0D9"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	headerStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 13, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"3C2D24"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	holidayHeaderStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 12, Color: "3C2D24"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F4D77C"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    border,
	})
	holidayDetailStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Family: scheduleFont, Size: 12, Color: "3C2D24"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFF5D6"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
		Border:    border,
	})
	weekdayFills := map[time.Weekday]string{
		time.Monday: "D9E9FF", time.Tuesday: "FCE8CC", time.Wednesday: "DDF2E3", time.Thursday: "E9DFFC", time.Friday: "FFF0B8", time.Saturday: "FFD6B0", time.Sunday: "F4B4B4",
	}
	weekdayStyles := map[time.Weekday]int{}
	for weekday, fill := range weekdayFills {
		style, _ := workbook.NewStyle(&excelize.Style{
			Font:      &excelize.Font{Family: scheduleFont, Bold: true, Size: 12, Color: "201A17"},
			Fill:      excelize.Fill{Type: "pattern", Color: []string{fill}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
			Border:    border,
		})
		weekdayStyles[weekday] = style
	}

	_ = workbook.SetColWidth(sheet, "A", "A", 28)
	_ = workbook.SetColWidth(sheet, "B", "B", 18)
	_ = workbook.SetColWidth(sheet, "C", lastDayColumn, 14)
	hideGridLines := false
	_ = workbook.SetSheetView(sheet, 0, &excelize.ViewOptions{ShowGridLines: &hideGridLines})
	_ = workbook.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      2,
		YSplit:      4,
		TopLeftCell: "C5",
		ActivePane:  "bottomRight",
		Selection: []excelize.Selection{
			{SQRef: "C5", ActiveCell: "C5", Pane: "bottomRight"},
		},
	})
	workbook.MergeCell(sheet, "A1", lastDayColumn+"1")
	workbook.SetCellValue(sheet, "A1", fmt.Sprintf("ตารางการทำงานประจำเดือน %s", thaiScheduleMonthYear(month)))
	workbook.SetCellStyle(sheet, "A1", lastDayColumn+"1", titleStyle)
	workbook.SetRowHeight(sheet, 1, 34)
	workbook.MergeCell(sheet, "A2", lastDayColumn+"2")
	workbook.SetCellValue(sheet, "A2", fmt.Sprintf("สาขา: %s  |  หมายเหตุ: เวลาในแต่ละช่องแสดง เข้างาน (บรรทัดแรก) และ ออกงาน (บรรทัดที่สอง) | หยุด = วันหยุด | ลา = ลางาน | PH = วันหยุดนักขัตฤกษ์", branchName))
	workbook.SetCellStyle(sheet, "A2", lastDayColumn+"2", noteStyle)
	workbook.SetRowHeight(sheet, 2, 30)
	for column, label := range []string{"พนักงาน", "เวลาทำงาน"} {
		cell, _ := excelize.CoordinatesToCellName(column+1, 3)
		workbook.SetCellValue(sheet, cell, label)
		workbook.SetCellStyle(sheet, cell, cell, headerStyle)
	}
	for day := 1; day <= monthEnd.AddDate(0, 0, -1).Day(); day++ {
		date := month.AddDate(0, 0, day-1)
		column, _ := excelize.ColumnNumberToName(day + 2)
		style := weekdayStyles[date.Weekday()]
		weekdayLabel := thaiScheduleWeekday(date)
		if holidays[date.Format("2006-01-02")] {
			style = holidayHeaderStyle
			weekdayLabel = "PH"
		}
		workbook.SetCellValue(sheet, fmt.Sprintf("%s3", column), day)
		workbook.SetCellStyle(sheet, fmt.Sprintf("%s3", column), fmt.Sprintf("%s3", column), style)
		workbook.SetCellValue(sheet, fmt.Sprintf("%s4", column), weekdayLabel)
		workbook.SetCellStyle(sheet, fmt.Sprintf("%s4", column), fmt.Sprintf("%s4", column), style)
	}
	workbook.SetRowHeight(sheet, 3, 27)
	workbook.SetRowHeight(sheet, 4, 24)

	for index, item := range gridRows {
		staffRow := 5 + index
		workbook.SetCellValue(sheet, fmt.Sprintf("A%d", staffRow), item.name)
		workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", staffRow), fmt.Sprintf("A%d", staffRow), nameStyle)
		workbook.SetCellValue(sheet, fmt.Sprintf("B%d", staffRow), fmt.Sprintf("%s–%s น.", item.startsAt[:5], item.endsAt[:5]))
		workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", staffRow), fmt.Sprintf("B%d", staffRow), cellStyle)
		workbook.SetCellStyle(sheet, fmt.Sprintf("C%d", staffRow), fmt.Sprintf("%s%d", lastDayColumn, staffRow), cellStyle)
		for day := 1; day <= monthEnd.AddDate(0, 0, -1).Day(); day++ {
			date := month.AddDate(0, 0, day-1)
			shift, exists := item.shifts[date.Format("2006-01-02")]
			if !exists {
				continue
			}
			column, _ := excelize.ColumnNumberToName(day + 2)
			cell := fmt.Sprintf("%s%d", column, staffRow)
			workbook.SetCellValue(sheet, cell, staffScheduleWeeklyGridValue(shift))
			switch shift.status {
			case "scheduled", "compensatory_work":
				workbook.SetCellStyle(sheet, cell, cell, workingTimeStyle)
			case "day_off":
				if strings.HasPrefix(shift.leaveType, "วันหยุดชดเชยวันนักขัตฤกษ์:") {
					workbook.SetCellStyle(sheet, cell, cell, compensatoryDayOffStyle)
				} else {
					workbook.SetCellStyle(sheet, cell, cell, dayOffStyle)
				}
			default:
				workbook.SetCellStyle(sheet, cell, cell, leaveStyle)
			}
		}
		workbook.SetRowHeight(sheet, staffRow, 44)
	}
	if len(gridRows) == 0 {
		workbook.MergeCell(sheet, "A5", lastDayColumn+"5")
		workbook.SetCellValue(sheet, "A5", "ยังไม่มีตารางงานสำหรับเดือนนี้")
		workbook.SetCellStyle(sheet, "A5", lastDayColumn+"5", noteCellStyle)
	}

	legendRow := 7 + len(gridRows)
	workbook.SetCellValue(sheet, fmt.Sprintf("A%d", legendRow), "สัญลักษณ์")
	workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", legendRow), fmt.Sprintf("A%d", legendRow), headerStyle)
	workbook.MergeCell(sheet, fmt.Sprintf("B%d", legendRow), fmt.Sprintf("%s%d", lastDayColumn, legendRow))
	workbook.SetCellValue(sheet, fmt.Sprintf("B%d", legendRow), "ความหมาย")
	workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", legendRow), fmt.Sprintf("%s%d", lastDayColumn, legendRow), headerStyle)
	legend := []struct {
		label, description string
		style              int
	}{
		{"เวลาเข้า–ออก", "ทำงานตามกะ", workingTimeStyle},
		{"หยุด", "วันหยุด", dayOffStyle},
		{"หยุดชดเชย", "วันหยุดแทนวันนักขัตฤกษ์", compensatoryDayOffStyle},
		{"ลา", "ลางาน", leaveStyle},
		{"PH", "วันหยุดนักขัตฤกษ์", holidayHeaderStyle},
	}
	for index, item := range legend {
		row := legendRow + 1 + index
		workbook.SetCellValue(sheet, fmt.Sprintf("A%d", row), item.label)
		workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), item.style)
		workbook.MergeCell(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s%d", lastDayColumn, row))
		workbook.SetCellValue(sheet, fmt.Sprintf("B%d", row), item.description)
		workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s%d", lastDayColumn, row), item.style)
		workbook.SetRowHeight(sheet, row, 28)
	}
	workbook.SetRowHeight(sheet, legendRow, 26)

	holidayTitleRow := legendRow + len(legend) + 2
	workbook.MergeCell(sheet, fmt.Sprintf("A%d", holidayTitleRow), fmt.Sprintf("%s%d", lastDayColumn, holidayTitleRow))
	workbook.SetCellValue(sheet, fmt.Sprintf("A%d", holidayTitleRow), fmt.Sprintf("วันนักขัตฤกษ์ประจำเดือน %s", thaiScheduleMonthYear(month)))
	workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", holidayTitleRow), fmt.Sprintf("%s%d", lastDayColumn, holidayTitleRow), holidayHeaderStyle)
	workbook.SetRowHeight(sheet, holidayTitleRow, 28)
	for index, holiday := range holidayDetails {
		row := holidayTitleRow + 1 + index
		workbook.SetCellValue(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("%d %s", holiday.date.Day(), thaiScheduleMonthYear(holiday.date)))
		workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), holidayHeaderStyle)
		workbook.MergeCell(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s%d", lastDayColumn, row))
		workbook.SetCellValue(sheet, fmt.Sprintf("B%d", row), holiday.name)
		workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("%s%d", lastDayColumn, row), holidayDetailStyle)
		workbook.SetRowHeight(sheet, row, 28)
	}
	if len(holidayDetails) == 0 {
		row := holidayTitleRow + 1
		workbook.MergeCell(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("%s%d", lastDayColumn, row))
		workbook.SetCellValue(sheet, fmt.Sprintf("A%d", row), "ไม่มีวันนักขัตฤกษ์ในเดือนนี้")
		workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("%s%d", lastDayColumn, row), holidayDetailStyle)
		workbook.SetRowHeight(sheet, row, 28)
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
	holidayRows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT holiday_date,name
		FROM public_holidays
		WHERE holiday_date >= $1::date AND holiday_date < $2::date
		ORDER BY holiday_date,name
	`, month, monthEnd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์เพื่อส่งออกได้"})
		return
	}
	holidayDates := map[string]bool{}
	holidayDetails := []staffScheduleExportHoliday{}
	for holidayRows.Next() {
		var holidayDate time.Time
		var holidayName string
		if err := holidayRows.Scan(&holidayDate, &holidayName); err != nil {
			holidayRows.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์เพื่อส่งออกได้"})
			return
		}
		holidayDates[holidayDate.Format("2006-01-02")] = true
		holidayDetails = append(holidayDetails, staffScheduleExportHoliday{date: holidayDate, name: holidayName})
	}
	if err := holidayRows.Err(); err != nil {
		holidayRows.Close()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์เพื่อส่งออกได้"})
		return
	}
	holidayRows.Close()
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

	content, err := buildMonthlyStaffScheduleWorkbook(month, monthEnd, branchName, holidayDates, holidayDetails, gridRows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
		return
	}
	filename := fmt.Sprintf("ตารางงานพนักงาน-สาขา%s-%s.xlsx", safeScheduleExportBranchName(branchName), strings.ReplaceAll(thaiScheduleMonthYear(month), " ", "-"))
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+url.PathEscape(filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content.Bytes())
}

package handler

import (
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
	date        time.Time
	holidayName string
	userID      int64
	name        string
	status      string
	startsAt    string
	endsAt      string
	leaveType   string
}

type staffScheduleExportGridRow struct {
	userID   int64
	name     string
	startsAt string
	endsAt   string
	shifts   map[string]staffScheduleExportRow
}

func thaiScheduleDate(date time.Time) string {
	months := [...]string{"", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."}
	return fmt.Sprintf("%d %s %d", date.Day(), months[date.Month()], date.Year()+543)
}

func thaiScheduleMonthYear(date time.Time) string {
	months := [...]string{"", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"}
	return fmt.Sprintf("%s %d", months[date.Month()], date.Year()+543)
}

func safeScheduleExportBranchName(branchName string) string {
	return strings.TrimSpace(strings.NewReplacer("/", "-", "\\", "-").Replace(branchName))
}

func thaiScheduleWeekdayShort(date time.Time) string {
	weekdays := [...]string{"อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."}
	return weekdays[date.Weekday()]
}

func staffScheduleGridValue(status string) string {
	switch status {
	case "scheduled", "compensatory_work":
		return "O"
	case "day_off":
		return "หยุด"
	default:
		return "ลา"
	}
}

func staffScheduleTimeRange(startsAt, endsAt string) string {
	if len(startsAt) >= 5 && len(endsAt) >= 5 {
		return fmt.Sprintf("%s–%s น.", startsAt[:5], endsAt[:5])
	}
	return fmt.Sprintf("%s–%s น.", startsAt, endsAt)
}

// ExportStaffSchedulesXLSX provides a real spreadsheet so branch managers can
// filter, sort, and share the roster without printing a PDF.
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
			COALESCE(holiday.name,''),
			staff.id,
			staff.name,
			schedule.status,
			schedule.starts_at::text,
			schedule.ends_at::text,
			COALESCE(schedule.leave_type,'')
		FROM staff_shifts schedule
		JOIN users staff ON staff.id=schedule.user_id
		LEFT JOIN public_holidays holiday ON holiday.holiday_date=schedule.shift_date
		WHERE schedule.branch_id=$1 AND schedule.shift_date >= $2::date AND schedule.shift_date < $3::date
		ORDER BY staff.name,schedule.starts_at,schedule.shift_date
	`, branchID, month, monthEnd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านตารางงานเพื่อส่งออกได้"})
		return
	}
	defer rows.Close()
	reportRows := []staffScheduleExportRow{}
	for rows.Next() {
		var row staffScheduleExportRow
		if err := rows.Scan(&row.date, &row.holidayName, &row.userID, &row.name, &row.status, &row.startsAt, &row.endsAt, &row.leaveType); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านตารางงานเพื่อส่งออกได้"})
			return
		}
		reportRows = append(reportRows, row)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านตารางงานเพื่อส่งออกได้"})
		return
	}

	holidayRows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT holiday_date,name
		FROM public_holidays
		WHERE holiday_date >= $1::date AND holiday_date < $2::date
		ORDER BY holiday_date
	`, month, monthEnd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์เพื่อส่งออกได้"})
		return
	}
	defer holidayRows.Close()
	holidays := map[string]string{}
	for holidayRows.Next() {
		var date time.Time
		var name string
		if err := holidayRows.Scan(&date, &name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์เพื่อส่งออกได้"})
			return
		}
		holidays[date.Format("2006-01-02")] = name
	}
	if err := holidayRows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านวันนักขัตฤกษ์เพื่อส่งออกได้"})
		return
	}

	gridRows := []staffScheduleExportGridRow{}
	gridRowsByKey := map[string]int{}
	for _, reportRow := range reportRows {
		key := fmt.Sprintf("%d|%s|%s", reportRow.userID, reportRow.startsAt, reportRow.endsAt)
		index, exists := gridRowsByKey[key]
		if !exists {
			index = len(gridRows)
			gridRowsByKey[key] = index
			gridRows = append(gridRows, staffScheduleExportGridRow{
				userID:   reportRow.userID,
				name:     reportRow.name,
				startsAt: reportRow.startsAt,
				endsAt:   reportRow.endsAt,
				shifts:   map[string]staffScheduleExportRow{},
			})
		}
		gridRows[index].shifts[reportRow.date.Format("2006-01-02")] = reportRow
	}

	workbook := excelize.NewFile()
	defer func() { _ = workbook.Close() }()
	const sheet = "ตารางงาน"
	defaultSheet := workbook.GetSheetName(0)
	workbook.SetSheetName(defaultSheet, sheet)
	daysInMonth := int(monthEnd.AddDate(0, 0, -1).Day())
	lastColumn, _ := excelize.ColumnNumberToName(daysInMonth + 3)
	lastTitleCell := fmt.Sprintf("%s1", lastColumn)
	if err := workbook.MergeCell(sheet, "A1", lastTitleCell); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
		return
	}
	titleStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 16, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"211B18"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	noteStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Color: "60493B"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FBF5E9"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
	})
	fixedHeaderStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"3C2D24"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "FFFFFF", Style: 1},
			{Type: "right", Color: "FFFFFF", Style: 1},
			{Type: "top", Color: "FFFFFF", Style: 1},
			{Type: "bottom", Color: "FFFFFF", Style: 1},
		},
	})
	weekdayHeaderColors := [...]string{"F4B4B4", "D9E9FF", "FCE8CC", "DDF2E3", "E9DFFC", "FFF0B8", "FFD6B0"}
	dayHeaderStyles := [7]int{}
	for weekday, color := range weekdayHeaderColors {
		dayHeaderStyles[weekday], _ = workbook.NewStyle(&excelize.Style{
			Font:      &excelize.Font{Bold: true, Color: "332923"},
			Fill:      excelize.Fill{Type: "pattern", Color: []string{color}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
			Border:    []excelize.Border{{Type: "left", Color: "FFFFFF", Style: 1}, {Type: "right", Color: "FFFFFF", Style: 1}, {Type: "top", Color: "FFFFFF", Style: 1}, {Type: "bottom", Color: "FFFFFF", Style: 1}},
		})
	}
	holidayHeaderStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "3C2D24"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"D7B46A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    []excelize.Border{{Type: "left", Color: "FFFFFF", Style: 1}, {Type: "right", Color: "FFFFFF", Style: 1}, {Type: "top", Color: "FFFFFF", Style: 1}, {Type: "bottom", Color: "FFFFFF", Style: 1}},
	})
	gridStyle, _ := workbook.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "D9D0C8", Style: 1},
			{Type: "right", Color: "D9D0C8", Style: 1},
			{Type: "top", Color: "D9D0C8", Style: 1},
			{Type: "bottom", Color: "D9D0C8", Style: 1},
		},
	})
	nameStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "332923"},
		Alignment: &excelize.Alignment{Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "D9D0C8", Style: 1}, {Type: "right", Color: "D9D0C8", Style: 1}, {Type: "top", Color: "D9D0C8", Style: 1}, {Type: "bottom", Color: "D9D0C8", Style: 1}},
	})
	scheduledStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "00A651"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "D9D0C8", Style: 1}, {Type: "right", Color: "D9D0C8", Style: 1}, {Type: "top", Color: "D9D0C8", Style: 1}, {Type: "bottom", Color: "D9D0C8", Style: 1}},
	})
	offStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "D6392F"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFF1F0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "D9D0C8", Style: 1}, {Type: "right", Color: "D9D0C8", Style: 1}, {Type: "top", Color: "D9D0C8", Style: 1}, {Type: "bottom", Color: "D9D0C8", Style: 1}},
	})
	leaveStyle, _ := workbook.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "A85F00"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFF7D9"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    []excelize.Border{{Type: "left", Color: "D9D0C8", Style: 1}, {Type: "right", Color: "D9D0C8", Style: 1}, {Type: "top", Color: "D9D0C8", Style: 1}, {Type: "bottom", Color: "D9D0C8", Style: 1}},
	})

	workbook.SetCellValue(sheet, "A1", fmt.Sprintf("ตารางการทำงานประจำเดือน %s", thaiScheduleMonthYear(month)))
	workbook.SetCellStyle(sheet, "A1", lastTitleCell, titleStyle)
	workbook.SetRowHeight(sheet, 1, 28)
	lastNoteCell := fmt.Sprintf("%s2", lastColumn)
	if err := workbook.MergeCell(sheet, "A2", lastNoteCell); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
		return
	}
	workbook.SetCellValue(sheet, "A2", fmt.Sprintf("สาขา: %s  |  วันนักขัตฤกษ์จัดกะปกติ — หากต้องหยุด ให้แก้ไขค่าในช่องวันเป็น “หยุด” (การแก้ไขมีผลในไฟล์ Excel นี้เท่านั้น)", branchName))
	workbook.SetCellStyle(sheet, "A2", lastNoteCell, noteStyle)
	workbook.SetRowHeight(sheet, 2, 26)
	for index, header := range []string{"พนักงาน", "เวลาทำงาน", "หมายเหตุ"} {
		column, _ := excelize.CoordinatesToCellName(index+1, 3)
		endColumn, _ := excelize.CoordinatesToCellName(index+1, 4)
		if err := workbook.MergeCell(sheet, column, endColumn); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
			return
		}
		workbook.SetCellValue(sheet, column, header)
		workbook.SetCellStyle(sheet, column, endColumn, fixedHeaderStyle)
	}
	for dayOffset := 0; dayOffset < daysInMonth; dayOffset++ {
		date := month.AddDate(0, 0, dayOffset)
		column, _ := excelize.CoordinatesToCellName(dayOffset+4, 3)
		dateCell, _ := excelize.CoordinatesToCellName(dayOffset+4, 4)
		dateKey := date.Format("2006-01-02")
		workbook.SetCellValue(sheet, column, date.Day())
		if holidayName := holidays[dateKey]; holidayName != "" {
			workbook.SetCellValue(sheet, dateCell, "PH")
			_ = workbook.AddComment(sheet, excelize.Comment{Cell: column, Author: "Super Black Coffee", Paragraph: []excelize.RichTextRun{{Text: holidayName}}})
			_ = workbook.AddComment(sheet, excelize.Comment{Cell: dateCell, Author: "Super Black Coffee", Paragraph: []excelize.RichTextRun{{Text: holidayName}}})
			workbook.SetCellStyle(sheet, column, dateCell, holidayHeaderStyle)
		} else {
			workbook.SetCellValue(sheet, dateCell, thaiScheduleWeekdayShort(date))
			workbook.SetCellStyle(sheet, column, dateCell, dayHeaderStyles[date.Weekday()])
		}
	}
	workbook.SetRowHeight(sheet, 3, 23)
	workbook.SetRowHeight(sheet, 4, 23)

	dataStartRow := 5
	for index, item := range gridRows {
		row := dataStartRow + index
		workbook.SetCellValue(sheet, fmt.Sprintf("A%d", row), item.name)
		workbook.SetCellValue(sheet, fmt.Sprintf("B%d", row), staffScheduleTimeRange(item.startsAt, item.endsAt))
		if index == 0 || gridRows[index-1].userID != item.userID {
			workbook.SetCellValue(sheet, fmt.Sprintf("C%d", row), "แก้ไข O เป็น หยุด/ลา ได้")
		}
		workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), nameStyle)
		workbook.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("C%d", row), gridStyle)
		for dayOffset := 0; dayOffset < daysInMonth; dayOffset++ {
			dateKey := month.AddDate(0, 0, dayOffset).Format("2006-01-02")
			cell, _ := excelize.CoordinatesToCellName(dayOffset+4, row)
			workbook.SetCellStyle(sheet, cell, cell, gridStyle)
			shift, exists := item.shifts[dateKey]
			if !exists {
				continue
			}
			value := staffScheduleGridValue(shift.status)
			workbook.SetCellValue(sheet, cell, value)
			switch value {
			case "O":
				workbook.SetCellStyle(sheet, cell, cell, scheduledStyle)
			case "หยุด":
				workbook.SetCellStyle(sheet, cell, cell, offStyle)
			default:
				workbook.SetCellStyle(sheet, cell, cell, leaveStyle)
			}
		}
		workbook.SetRowHeight(sheet, row, 24)
	}
	lastDataRow := dataStartRow + len(gridRows) - 1
	if len(gridRows) == 0 {
		workbook.SetCellValue(sheet, "A5", "ยังไม่มีตารางงานสำหรับเดือนนี้")
		workbook.SetCellStyle(sheet, "A5", fmt.Sprintf("%s5", lastColumn), gridStyle)
		lastDataRow = 5
	}
	legendRow := lastDataRow + 2
	legendEndCell := fmt.Sprintf("%s%d", lastColumn, legendRow)
	if err := workbook.MergeCell(sheet, fmt.Sprintf("A%d", legendRow), legendEndCell); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
		return
	}
	workbook.SetCellValue(sheet, fmt.Sprintf("A%d", legendRow), "คำอธิบาย: O = ทำงานตามกะ  |  หยุด = วันหยุด  |  ลา = ลางาน  |  แก้ไขค่าในช่องวันได้ตามต้องการ โดยไม่เปลี่ยนข้อมูลในระบบ")
	workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", legendRow), legendEndCell, noteStyle)
	if len(holidays) > 0 {
		holidayNotes := []string{}
		for dayOffset := 0; dayOffset < daysInMonth; dayOffset++ {
			date := month.AddDate(0, 0, dayOffset)
			if holidayName := holidays[date.Format("2006-01-02")]; holidayName != "" {
				holidayNotes = append(holidayNotes, fmt.Sprintf("%s %s", thaiScheduleDate(date), holidayName))
			}
		}
		holidayEndCell := fmt.Sprintf("%s%d", lastColumn, legendRow+1)
		if err := workbook.MergeCell(sheet, fmt.Sprintf("A%d", legendRow+1), holidayEndCell); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
			return
		}
		workbook.SetCellValue(sheet, fmt.Sprintf("A%d", legendRow+1), "วันนักขัตฤกษ์: "+strings.Join(holidayNotes, " | "))
		workbook.SetCellStyle(sheet, fmt.Sprintf("A%d", legendRow+1), holidayEndCell, noteStyle)
	}
	_ = workbook.SetPanes(sheet, &excelize.Panes{Freeze: true, XSplit: 3, YSplit: 4, TopLeftCell: "D5", ActivePane: "bottomRight"})
	for column, width := range map[string]float64{"A": 26, "B": 17, "C": 25} {
		_ = workbook.SetColWidth(sheet, column, column, width)
	}
	for dayOffset := 0; dayOffset < daysInMonth; dayOffset++ {
		column, _ := excelize.CoordinatesToCellName(dayOffset+4, 1)
		_ = workbook.SetColWidth(sheet, column, column, 7)
	}
	hideGridLines := false
	workbook.SetSheetView(sheet, 0, &excelize.ViewOptions{ShowGridLines: &hideGridLines})

	content, err := workbook.WriteToBuffer()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถสร้างไฟล์ Excel ได้"})
		return
	}
	filename := fmt.Sprintf("ตารางงานพนักงาน-สาขา%s-%s.xlsx", safeScheduleExportBranchName(branchName), strings.ReplaceAll(thaiScheduleMonthYear(month), " ", "-"))
	c.Header("Content-Disposition", "attachment; filename*=UTF-8''"+url.PathEscape(filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content.Bytes())
}

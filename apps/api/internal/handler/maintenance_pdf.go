package handler

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	pdfkit "y/internal/pdfkit"
)

type maintenancePDFData struct {
	ID             int64
	BranchCode     string
	BranchName     string
	Title          string
	Description    string
	Priority       string
	Status         string
	TechnicianName string
	DueAt          *time.Time
	CreatedAt      time.Time
}

func maintenancePDF(data maintenancePDFData) ([]byte, error) {
	const (
		pageWidth  = 595.28
		pageHeight = 841.89
		left       = 40.0
		right      = 555.28
	)

	doc := pdfkit.New(pdfkit.WithPageSize(pdfkit.A4), pdfkit.WithMargins(0), pdfkit.WithInfo(pdfkit.Info{
		Title: "ใบงานซ่อมบำรุงประจำสาขา", Author: "Super Black Coffee",
	}))
	if err := doc.RegisterFont("THSarabunNew", leaveRequestTHSarabunFont, 0); err != nil {
		return nil, fmt.Errorf("register THSarabun New: %w", err)
	}
	if _, err := doc.RegisterImage("maintenance-logo", inspectionPDFLogo); err != nil {
		return nil, fmt.Errorf("register maintenance logo: %w", err)
	}

	ink := pdfkit.HexColor("#302319")
	muted := pdfkit.HexColor("#78695C")
	border := pdfkit.HexColor("#755B48")
	headerFill := pdfkit.HexColor("#EEE7DF")
	rowFill := pdfkit.HexColor("#FCF9F6")

	doc.AddPage(pdfkit.A4)
	doc.StrokeColor(pdfkit.HexColor("#DCD2C8")).LineWidth(0.5).MoveTo(left, 26).LineTo(right, 26).Stroke()
	doc.Font("THSarabunNew").FontSize(9).FillColor(muted).Text(
		"ใบงานซ่อมบำรุงประจำสาขา  |  สำหรับทีมช่าง",
		pdfkit.TextOptions{X: 355, Y: 12, Width: 200, Align: pdfkit.AlignRight},
	)
	doc.Image("maintenance-logo", (pageWidth-58)/2, pageHeight-96, 58, 58)
	doc.Font("THSarabunNew").FontSize(16).FillColor(ink).Text(
		"ใบงานซ่อมบำรุงประจำสาขา",
		pdfkit.TextOptions{X: left, Y: pageHeight - 124, Width: right - left, Align: pdfkit.AlignCenter},
	)

	technician := strings.TrimSpace(data.TechnicianName)
	if technician == "" {
		technician = "รอมอบหมายช่าง"
	}
	assignment := fmt.Sprintf("เลขที่งาน: #%d  |  สาขา: %s (%s)  |  ช่างผู้รับงาน: %s", data.ID, data.BranchName, data.BranchCode, technician)
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text(
		assignment,
		pdfkit.TextOptions{X: left, Y: pageHeight - 149, Width: right - left, Align: pdfkit.AlignCenter},
	)
	doc.StrokeColor(border).LineWidth(0.7).MoveTo(left+10, pageHeight-170).LineTo(right-10, pageHeight-170).Stroke()

	y := pageHeight - 195
	drawSection := func(title string) {
		doc.FillColor(headerFill).Rect(left, y-19, right-left, 19).Fill()
		doc.Font("THSarabunNew").FontSize(12).FillColor(ink).Text(
			title,
			pdfkit.TextOptions{X: left + 5, Y: y - 14, Width: right - left - 10},
		)
		y -= 25
	}
	drawInfo := func(label, value string, x, width float64) {
		doc.Font("THSarabunNew").FontSize(10).FillColor(muted).Text(label, pdfkit.TextOptions{X: x, Y: y})
		doc.Font("THSarabunNew").FontSize(11).FillColor(ink).Text(value, pdfkit.TextOptions{X: x, Y: y - 13, Width: width})
	}
	drawCheckbox := func(x float64, label string) {
		doc.StrokeColor(border).LineWidth(0.6).Rect(x, y-3, 10, 10).Stroke()
		doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text(label, pdfkit.TextOptions{X: x + 16, Y: y - 1})
	}

	drawSection("ข้อมูลการแจ้งซ่อม")
	drawInfo("วันที่แจ้ง", data.CreatedAt.Format("02/01/2006"), left+5, 220)
	dueAt := "ไม่ระบุ"
	if data.DueAt != nil {
		dueAt = data.DueAt.Format("02/01/2006")
	}
	drawInfo("กำหนดดำเนินการ", dueAt, left+270, 220)
	y -= 33
	drawInfo("ระดับความเร่งด่วน", maintenancePriorityLabel(data.Priority), left+5, 220)
	drawInfo("สถานะปัจจุบัน", maintenanceStatusLabel(data.Status), left+270, 220)
	y -= 36
	doc.FillColor(rowFill).Rect(left, y-58, right-left, 58).Fill()
	doc.Font("THSarabunNew").FontSize(10).FillColor(muted).Text("อาการ/งานที่แจ้ง", pdfkit.TextOptions{X: left + 5, Y: y - 13})
	doc.Font("THSarabunNew").FontSize(12).FillColor(ink).Text(strings.TrimSpace(data.Title), pdfkit.TextOptions{X: left + 5, Y: y - 27, Width: right - left - 10})
	detail := strings.TrimSpace(data.Description)
	if detail == "" {
		detail = "-"
	}
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text(trimMaintenancePDFText(detail, 240), pdfkit.TextOptions{X: left + 5, Y: y - 43, Width: right - left - 10})
	doc.StrokeColor(border).LineWidth(0.45).Rect(left, y-58, right-left, 58).Stroke()
	y -= 72

	drawSection("รายการให้ช่างตรวจและดำเนินการ")
	tasks := []string{
		"ตรวจสอบอาการและหาสาเหตุที่จุดเกิดปัญหา",
		"ตรวจความปลอดภัยของอุปกรณ์ สายไฟ ระบบน้ำ และพื้นที่ที่เกี่ยวข้อง",
		"ประเมินการซ่อม พร้อมระบุอะไหล่หรืออุปกรณ์ที่ต้องใช้",
		"ดำเนินการซ่อม ทดสอบการใช้งาน และคืนพื้นที่ให้พร้อมใช้งาน",
		"บันทึกผลการซ่อม ข้อเสนอแนะ และงานที่ต้องติดตามต่อ",
	}
	for index, task := range tasks {
		if index%2 == 0 {
			doc.FillColor(rowFill).Rect(left, y-18, right-left, 18).Fill()
		}
		doc.StrokeColor(border).LineWidth(0.55).Rect(left+5, y-13, 9, 9).Stroke()
		doc.Font("THSarabunNew").FontSize(10.5).FillColor(ink).Text(
			fmt.Sprintf("%d. %s", index+1, task),
			pdfkit.TextOptions{X: left + 22, Y: y - 11, Width: right - left - 28},
		)
		y -= 20
	}
	y -= 4

	drawSection("ผลการซ่อมและการส่งมอบ")
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text("สถานะงาน:", pdfkit.TextOptions{X: left + 5, Y: y - 1})
	drawCheckbox(left+72, "ซ่อมแล้ว")
	drawCheckbox(left+220, "รออะไหล่")
	drawCheckbox(left+368, "ต้องติดตามต่อ")
	y -= 26
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text("ผลการตรวจ/การซ่อม:", pdfkit.TextOptions{X: left + 5, Y: y})
	doc.StrokeColor(border).LineWidth(0.45).MoveTo(left+105, y).LineTo(right, y).Stroke()
	doc.StrokeColor(border).LineWidth(0.45).MoveTo(left, y-20).LineTo(right, y-20).Stroke()
	doc.StrokeColor(border).LineWidth(0.45).MoveTo(left, y-40).LineTo(right, y-40).Stroke()
	y -= 59
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text("อะไหล่/ค่าใช้จ่าย/หมายเหตุ:", pdfkit.TextOptions{X: left + 5, Y: y})
	doc.StrokeColor(border).LineWidth(0.45).MoveTo(left+142, y).LineTo(right, y).Stroke()
	doc.StrokeColor(border).LineWidth(0.45).MoveTo(left, y-20).LineTo(right, y-20).Stroke()
	y -= 42
	doc.StrokeColor(border).LineWidth(0.6).Rect(left, y-48, (right-left-12)/2, 48).Stroke()
	doc.StrokeColor(border).LineWidth(0.6).Rect(left+(right-left+12)/2, y-48, (right-left-12)/2, 48).Stroke()
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text("ช่างผู้ดำเนินการ: ........................................\nวันที่: ........................................", pdfkit.TextOptions{X: left + 8, Y: y - 15, Width: 230, LineGap: 3})
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text("ผู้รับมอบ/ผู้แจ้ง: ........................................\nวันที่: ........................................", pdfkit.TextOptions{X: left + (right-left+12)/2 + 8, Y: y - 15, Width: 230, LineGap: 3})

	var output bytes.Buffer
	if err := doc.Save(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func maintenancePriorityLabel(value string) string {
	switch value {
	case "urgent":
		return "เร่งด่วน"
	case "low":
		return "ทั่วไป"
	default:
		return "ควรดำเนินการ"
	}
}

func maintenanceStatusLabel(value string) string {
	switch value {
	case "assigned":
		return "มอบหมายแล้ว"
	case "waiting_parts":
		return "รออะไหล่"
	case "completed":
		return "เสร็จสิ้น"
	default:
		return "รอรับงาน"
	}
}

func trimMaintenancePDFText(value string, max int) string {
	characters := []rune(value)
	if len(characters) <= max {
		return value
	}
	return string(characters[:max]) + "..."
}

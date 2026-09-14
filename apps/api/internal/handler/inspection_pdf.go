package handler

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/phpdave11/gofpdf"
	pdfkit "y/internal/pdfkit"
)

//go:embed assets/superblack-logo.png
var inspectionPDFLogo []byte

type inspectionPDFData struct {
	ID            int64
	BranchCode    string
	BranchName    string
	InspectorName string
	Status        string
	Score         *float64
	DueAt         *time.Time
	Checklist     []string
	Findings      string
}

// inspectionPDF uses a shaping-aware renderer because Thai combining marks
// require OpenType positioning. gofpdf embeds the font but does not shape Thai,
// which makes some vowels and tone marks appear detached in PDF viewers.
func inspectionPDF(data inspectionPDFData) ([]byte, error) {
	return inspectionPDFWithShaping(data)
}

func inspectionPDFWithShaping(data inspectionPDFData) ([]byte, error) {
	const (
		pageWidth  = 595.28
		pageHeight = 841.89
		left       = 40.0
		right      = 555.28
		bottom     = 42.0
	)

	documentTitle := inspectionPDFTitle(data.Checklist)
	assigneeLabel := "ช่างผู้รับงาน"
	guidanceTitle := "คำแนะนำสำหรับช่าง"
	guidanceText := "ทำเครื่องหมายสถานะของแต่ละรายการ และบันทึกอาการหรือรายการซ่อมในระบบหลังตรวจเสร็จ"
	if inspectionTypeFromChecklist(data.Checklist) == "ingredients" {
		assigneeLabel = "ผู้รับงานตรวจ"
		guidanceTitle = "คำแนะนำสำหรับผู้ตรวจ"
		guidanceText = "ทำเครื่องหมายสถานะของแต่ละรายการ และบันทึกสิ่งที่พบหรือรายการที่ต้องแก้ไขในระบบหลังตรวจเสร็จ"
	}
	doc := pdfkit.New(pdfkit.WithPageSize(pdfkit.A4), pdfkit.WithMargins(0), pdfkit.WithInfo(pdfkit.Info{
		Title: documentTitle, Author: "Super Black Coffee",
	}))
	if err := doc.RegisterFont("THSarabunNew", leaveRequestTHSarabunFont, 0); err != nil {
		return nil, fmt.Errorf("register THSarabun New: %w", err)
	}
	if _, err := doc.RegisterImage("inspection-logo", inspectionPDFLogo); err != nil {
		return nil, fmt.Errorf("register inspection logo: %w", err)
	}

	ink := pdfkit.HexColor("#302319")
	muted := pdfkit.HexColor("#78695C")
	border := pdfkit.HexColor("#755B48")
	headerFill := pdfkit.HexColor("#EEE7DF")
	rowFill := pdfkit.HexColor("#FCF9F6")

	pageNumber := 0
	var y float64
	addPage := func(first bool) {
		doc.AddPage(pdfkit.A4)
		pageNumber++
		doc.StrokeColor(pdfkit.HexColor("#DCD2C8")).LineWidth(0.5).MoveTo(left, 26).LineTo(right, 26).Stroke()
		doc.Font("THSarabunNew").FontSize(9).FillColor(muted).Text(
			fmt.Sprintf("%s  |  หน้า %d", documentTitle, pageNumber),
			pdfkit.TextOptions{X: 355, Y: 12, Width: 200, Align: pdfkit.AlignRight},
		)
		if !first {
			y = pageHeight - 50
			return
		}
		// A larger centered mark gives the formal header a clear identity without
		// crowding the document title and branch details below it.
		doc.Image("inspection-logo", (pageWidth-54)/2, pageHeight-94, 54, 54)
		doc.Font("THSarabunNew").FontSize(16).FillColor(ink).Text(documentTitle, pdfkit.TextOptions{X: left, Y: pageHeight - 120, Width: right - left, Align: pdfkit.AlignCenter})
		// Keep the three key assignment facts on one scan-friendly line, with
		// consistent separators rather than a tall stack of short lines.
		assignment := fmt.Sprintf("เลขที่งาน: #%d  |  สาขา: %s (%s)  |  %s: %s", data.ID, data.BranchName, data.BranchCode, assigneeLabel, data.InspectorName)
		doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text(assignment, pdfkit.TextOptions{X: left, Y: pageHeight - 147, Width: right - left, Align: pdfkit.AlignCenter})
		dividerY := pageHeight - 169
		if data.DueAt != nil {
			doc.Text("กำหนดตรวจ: "+data.DueAt.Format("02/01/2006"), pdfkit.TextOptions{X: left, Y: pageHeight - 165, Width: right - left, Align: pdfkit.AlignCenter})
			dividerY = pageHeight - 187
		}
		doc.StrokeColor(border).LineWidth(0.7).MoveTo(left+10, dividerY).LineTo(right-10, dividerY).Stroke()
		y = dividerY - 20
	}
	addPage(true)

	ensureSpace := func(height float64) bool {
		if y-height >= bottom {
			return false
		}
		addPage(false)
		return true
	}
	drawSection := func(title string) {
		doc.FillColor(headerFill).Rect(left, y-20, right-left, 20).Fill()
		doc.Font("THSarabunNew").FontSize(13).FillColor(ink).Text(title, pdfkit.TextOptions{X: left + 4, Y: y - 15, Width: right - left - 8})
		y -= 20
	}
	statusNeedsAction, statusUnavailable, noteLabel, noteLineX := "ต้องซ่อม", "ใช้งานไม่ได้", "หมายเหตุ/อาการ:", left+78
	if inspectionTypeFromChecklist(data.Checklist) == "ingredients" {
		statusNeedsAction, statusUnavailable, noteLabel, noteLineX = "ต้องแก้ไข", "ห้ามใช้", "หมายเหตุ/สิ่งที่พบ:", left+94
	}
	drawCheckbox := func(x, baseline float64, label string) {
		doc.StrokeColor(border).LineWidth(0.6).Rect(x, baseline-3, 10, 10).Stroke()
		doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text(label, pdfkit.TextOptions{X: x + 16, Y: baseline - 1})
	}
	drawRow := func(number int, item string, shaded bool) {
		if shaded {
			doc.FillColor(rowFill).Rect(left, y-19, right-left, 19).Fill()
		}
		doc.Font("THSarabunNew").FontSize(12).FillColor(ink).Text(fmt.Sprintf("%d. %s", number, item), pdfkit.TextOptions{X: left + 4, Y: y - 15, Width: right - left - 8})
		statusY := y - 39
		doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text("สถานะ:", pdfkit.TextOptions{X: left + 4, Y: statusY - 1})
		// Keep each status choice on an equal-width column so the tick boxes
		// remain visually balanced regardless of the Thai label length.
		drawCheckbox(left+64, statusY, "ปกติ")
		drawCheckbox(left+228, statusY, statusNeedsAction)
		drawCheckbox(left+392, statusY, statusUnavailable)
		// Leave a clear handwritten gap beneath the status controls before the
		// note field, so the two parts of the row do not visually run together.
		noteY := y - 64
		doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text(noteLabel, pdfkit.TextOptions{X: left + 4, Y: noteY})
		// Keep the writing line on the same row as its label, with only a
		// small gap so the field reads as one continuous instruction.
		doc.StrokeColor(border).LineWidth(0.45).MoveTo(noteLineX, noteY).LineTo(right, noteY).Stroke()
		doc.StrokeColor(border).LineWidth(0.45).MoveTo(left, y-78).LineTo(right, y-78).Stroke()
		y -= 87
	}

	groups := []struct{ title, prefix string }{
		{"ร้านคาเฟ่", "ร้านคาเฟ่:"},
		{"ตู้ชาร์จรถ EV", "ตู้ชาร์จรถ EV:"},
		{"ห้องน้ำ", "ห้องน้ำ:"},
		{"วัตถุดิบและการจัดเก็บ", "วัตถุดิบ:"},
	}
	grouped := groupInspectionChecklist(data.Checklist)
	for _, group := range groups {
		items := grouped[group.prefix]
		if len(items) == 0 {
			continue
		}
		if ensureSpace(100) {
			drawSection(group.title + " (ต่อ)")
		} else {
			drawSection(group.title)
		}
		for index, item := range items {
			// A checklist row consumes 87pt including the status and note lines.
			// Reserve a small extra margin so no row title is separated from its
			// checkboxes when it reaches a page boundary.
			if ensureSpace(92) {
				drawSection(group.title + " (ต่อ)")
			}
			drawRow(index+1, item, index%2 == 0)
		}
		y -= 8
	}
	if ensureSpace(45) {
		doc.FillColor(headerFill).Rect(left, y-18, right-left, 18).Fill()
	}
	doc.FillColor(pdfkit.HexColor("#F8F5F1")).Rect(left, y-18, right-left, 18).Fill()
	doc.Font("THSarabunNew").FontSize(12).FillColor(ink).Text(guidanceTitle, pdfkit.TextOptions{X: left + 4, Y: y - 14})
	doc.Font("THSarabunNew").FontSize(10).FillColor(ink).Text(guidanceText, pdfkit.TextOptions{X: left + 4, Y: y - 31, Width: right - left - 8})
	doc.StrokeColor(border).LineWidth(0.6).Rect(left, y-39, right-left, 39).Stroke()

	var output bytes.Buffer
	if err := doc.Save(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func inspectionPDFTitle(checklist []string) string {
	if inspectionTypeFromChecklist(checklist) == "ingredients" {
		return "ใบงานสุ่มตรวจวัตถุดิบ"
	}
	return "ใบงานตรวจช่างประจำสาขา"
}

func legacyInspectionPDF(data inspectionPDFData) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(16, 15, 16)
	pdf.SetAutoPageBreak(true, 16)
	pdf.AddUTF8FontFromBytes("THSarabun", "", leaveRequestTHSarabunFont)
	pdf.SetFooterFunc(func() {
		pdf.SetY(-12)
		pdf.SetDrawColor(220, 210, 200)
		pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
		pdf.SetY(-9)
		pdf.SetTextColor(120, 105, 92)
		pdf.SetFont("THSarabun", "", 9)
		pdf.CellFormat(0, 5, fmt.Sprintf("ใบงานตรวจช่างประจำสาขา  |  หน้า %d", pdf.PageNo()), "", 0, "R", false, 0, "")
	})
	pdf.AddPage()
	pdf.RegisterImageOptionsReader("inspection-logo", gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}, bytes.NewReader(inspectionPDFLogo))
	pdf.ImageOptions("inspection-logo", 94, 14, 22, 22, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}, 0, "")
	pdf.SetY(39)
	pdf.SetTextColor(48, 35, 25)
	pdf.SetFont("THSarabun", "", 16)
	pdf.CellFormat(0, 11, "ใบงานตรวจช่างประจำสาขา", "", 1, "C", false, 0, "")
	pdf.SetFont("THSarabun", "", 11)
	pdf.CellFormat(0, 7, fmt.Sprintf("เลขที่งาน: #%d", data.ID), "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 7, "สาขา: "+data.BranchName+" ("+data.BranchCode+")", "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 7, "ช่างผู้รับงาน: "+data.InspectorName, "", 1, "C", false, 0, "")
	if data.DueAt != nil {
		pdf.CellFormat(0, 7, "กำหนดตรวจ: "+data.DueAt.Format("02/01/2006"), "", 1, "C", false, 0, "")
	}
	pdf.Ln(3)
	pdf.SetDrawColor(117, 91, 72)
	pdf.Line(20, pdf.GetY(), 190, pdf.GetY())
	pdf.Ln(5)

	groups := []struct {
		title  string
		prefix string
	}{
		{"ร้านคาเฟ่", "ร้านคาเฟ่:"},
		{"ตู้ชาร์จรถ EV", "ตู้ชาร์จรถ EV:"},
		{"ห้องน้ำ", "ห้องน้ำ:"},
		{"วัตถุดิบและการจัดเก็บ", "วัตถุดิบ:"},
	}
	grouped := groupInspectionChecklist(data.Checklist)
	for _, group := range groups {
		items := grouped[group.prefix]
		if len(items) == 0 {
			continue
		}
		ensureInspectionPDFSpace(pdf, 9+inspectionChecklistRowHeight(pdf, 1, items[0]))
		renderInspectionSectionHeader(pdf, group.title)
		for index, item := range items {
			if ensureInspectionPDFSpace(pdf, inspectionChecklistRowHeight(pdf, index+1, item)) {
				renderInspectionSectionHeader(pdf, group.title+" (ต่อ)")
			}
			renderInspectionChecklistRow(pdf, index+1, item, index%2 == 0)
		}
		pdf.Ln(4)
	}
	pdf.SetFillColor(248, 245, 241)
	pdf.SetFont("THSarabun", "", 12)
	pdf.CellFormat(0, 9, "คำแนะนำสำหรับช่าง", "", 1, "L", true, 0, "")
	pdf.SetFont("THSarabun", "", 10)
	pdf.MultiCell(0, 6, "ทำเครื่องหมายสถานะของแต่ละรายการ และบันทึกอาการหรือรายการซ่อมในระบบหลังตรวจเสร็จ", "1", "L", false)
	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func renderInspectionSectionHeader(pdf *gofpdf.Fpdf, title string) {
	pdf.SetX(16)
	y := pdf.GetY()
	pdf.SetFillColor(238, 231, 223)
	pdf.Rect(pdf.GetX(), y-1, 178, 12, "F")
	pdf.SetFont("THSarabun", "", 13)
	pdf.CellFormat(0, 10, title, "", 1, "L", false, 0, "")
	pdf.SetY(y + 10)
	pdf.SetX(16)
}

func ensureInspectionPDFSpace(pdf *gofpdf.Fpdf, requiredHeight float64) bool {
	_, pageHeight := pdf.GetPageSize()
	const bottomMargin = 16
	const topMargin = 15
	if requiredHeight > pageHeight-bottomMargin-topMargin {
		return false
	}
	if pdf.GetY()+requiredHeight <= pageHeight-bottomMargin {
		return false
	}
	pdf.AddPage()
	pdf.SetY(topMargin)
	pdf.SetX(16)
	return true
}

func inspectionChecklistRowHeight(pdf *gofpdf.Fpdf, number int, item string) float64 {
	// The standard technician checklist is intentionally kept to one text line.
	// SplitText overestimates the width of Thai combining characters, causing
	// premature page breaks, so keep this in sync with the three rendered lines.
	_ = pdf
	_ = number
	_ = item
	return 34
}

func renderInspectionChecklistRow(pdf *gofpdf.Fpdf, number int, item string, shaded bool) {
	pdf.SetX(16)
	if shaded {
		pdf.SetFillColor(252, 249, 246)
	} else {
		pdf.SetFillColor(255, 255, 255)
	}
	pdf.SetFont("THSarabun", "", 12)
	pdf.CellFormat(0, 7, fmt.Sprintf("%d. %s", number, item), "", 1, "L", true, 0, "")
	pdf.Ln(2)
	pdf.SetX(16)
	renderInspectionCheckbox(pdf, "สถานะ:", 19)
	renderInspectionCheckbox(pdf, "ปกติ", 29)
	renderInspectionCheckbox(pdf, "ต้องซ่อม", 35)
	renderInspectionCheckbox(pdf, "ใช้งานไม่ได้", 0)
	pdf.Ln(7)
	pdf.SetX(16)
	pdf.SetFont("THSarabun", "", 10)
	pdf.CellFormat(0, 6, "หมายเหตุ/อาการ:  ..............................................................................................................", "B", 1, "L", false, 0, "")
	pdf.Ln(4)
}

func renderInspectionCheckbox(pdf *gofpdf.Fpdf, label string, width float64) {
	x, y := pdf.GetX(), pdf.GetY()
	if label == "สถานะ:" {
		pdf.SetFont("THSarabun", "", 10)
		pdf.CellFormat(width, 6, label, "", 0, "L", false, 0, "")
		return
	}
	pdf.Rect(x, y+1.4, 3, 3, "D")
	pdf.SetFont("THSarabun", "", 10)
	pdf.SetX(x + 4.8)
	if width == 0 {
		pdf.CellFormat(0, 6, label, "", 0, "L", false, 0, "")
		return
	}
	pdf.CellFormat(width-4.8, 6, label, "", 0, "L", false, 0, "")
}

func groupInspectionChecklist(checklist []string) map[string][]string {
	groups := map[string][]string{
		"ร้านคาเฟ่:":     {},
		"ตู้ชาร์จรถ EV:": {},
		"ห้องน้ำ:":       {},
		"วัตถุดิบ:":      {},
	}
	for _, item := range checklist {
		matched := false
		for prefix := range groups {
			if strings.HasPrefix(item, prefix) {
				groups[prefix] = append(groups[prefix], strings.TrimSpace(strings.TrimPrefix(item, prefix)))
				matched = true
				break
			}
		}
		if !matched {
			// Older work orders were a cafe checklist without category prefixes.
			groups["ร้านคาเฟ่:"] = append(groups["ร้านคาเฟ่:"], item)
		}
	}
	return groups
}

func inspectionTypeFromChecklist(checklist []string) string {
	if len(checklist) == 0 {
		return "technician"
	}
	for _, item := range checklist {
		if !strings.HasPrefix(strings.TrimSpace(item), "วัตถุดิบ:") {
			return "technician"
		}
	}
	return "ingredients"
}

func parseInspectionChecklist(value []byte) []string {
	items := []string{}
	_ = json.Unmarshal(value, &items)
	return items
}

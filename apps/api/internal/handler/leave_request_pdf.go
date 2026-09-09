package handler

import (
	"bytes"
	_ "embed"
	"fmt"
	"time"

	"github.com/phpdave11/gofpdf"
)

//go:embed assets/THSarabunNew.ttf
var leaveRequestTHSarabunFont []byte

//go:embed assets/checkmark.svg
var leaveRequestCheckmarkSVG []byte

//go:embed assets/leave-template-background.png
var leaveRequestTemplateBackground []byte

type leaveRequestPDFData struct {
	ID                int64
	SubmittedAt       time.Time
	Name              string
	EmployeeCode      string
	Position          string
	BranchName        string
	LeaveType         string
	LeaveDate         time.Time
	LeaveEndDate      time.Time
	ContactPhone      string
	Reason            string
	AdditionalDetails string
	Status            string
}

type leaveRequestPDFAttachment struct {
	Name        string
	ContentType string
	Content     []byte
}

func roleLabel(value string) string {
	if value == "branch_manager" {
		return "ผู้จัดการสาขา"
	}
	return "แคชเชียร์"
}

func thaiMonthAbbreviation(month time.Month) string {
	return []string{"ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."}[int(month)-1]
}

func leaveRequestPDF(data leaveRequestPDFData, attachments ...leaveRequestPDFAttachment) ([]byte, error) {
	if len(leaveRequestTemplateBackground) == 0 {
		return nil, fmt.Errorf("leave request template is missing")
	}

	// This image is a lossless 300-DPI rendering of the supplied PDF. It keeps
	// the source form's logo, typography, lines and table geometry fixed while
	// only typed values are placed on blank fields.
	pdf := gofpdf.NewCustom(&gofpdf.InitType{OrientationStr: "P", UnitStr: "mm", Size: gofpdf.SizeType{Wd: 200.067, Ht: 279.4}})
	pdf.SetMargins(0, 0, 0)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddUTF8FontFromBytes("THSarabun", "", leaveRequestTHSarabunFont)
	checkmarkSVG, err := gofpdf.SVGBasicParse(leaveRequestCheckmarkSVG)
	if err != nil {
		return nil, fmt.Errorf("parse leave-request checkmark SVG: %w", err)
	}
	pdf.RegisterImageOptionsReader("leave-template-background", gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}, bytes.NewReader(leaveRequestTemplateBackground))
	pdf.AddPage()
	pdf.ImageOptions("leave-template-background", 0, 0, 200.067, 279.4, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}, 0, "")

	write := func(x, y, width float64, value string) {
		fontSize := 10.0
		for fontSize > 6 {
			pdf.SetFont("THSarabun", "", fontSize)
			if pdf.GetStringWidth(value) <= width {
				break
			}
			fontSize--
		}
		pdf.Text(x, y, value)
	}
	writeDate := func(xDay, xMonth, xYear, y float64, value time.Time) {
		writeCentered := func(centerX, width float64, text string) {
			fontSize := 10.0
			for fontSize > 6 {
				pdf.SetFont("THSarabun", "", fontSize)
				if pdf.GetStringWidth(text) <= width {
					break
				}
				fontSize--
			}
			pdf.Text(centerX-pdf.GetStringWidth(text)/2, y, text)
		}

		writeCentered(xDay, 10, fmt.Sprintf("%02d", value.Day()))
		writeCentered(xMonth, 10, thaiMonthAbbreviation(value.Month()))
		writeCentered(xYear, 18, fmt.Sprintf("%d", value.Year()+543))
	}

	writeDate(144.2, 159, 175.5, 94.1, data.SubmittedAt)
	write(42, 106.9, 66, data.Name)
	write(145, 106.9, 41, data.EmployeeCode)
	write(42, 116.1, 66, roleLabel(data.Position))
	write(145, 116.1, 41, data.BranchName)

	// These coordinates are measured from the source template at 300 DPI.
	checkboxCenterX := map[string]float64{"sick": 40.0049, "personal": 60.0709, "vacation": 78.0202, "other": 102.7428}
	const checkboxCenterY = 123.6978
	if centerX, ok := checkboxCenterX[data.LeaveType]; ok {
		const iconScale = 0.23
		pdf.SetDrawColor(0, 0, 0)
		pdf.SetLineCapStyle("round")
		pdf.SetLineWidth(0.65)
		pdf.SetXY(centerX-checkmarkSVG.Wd*iconScale/2, checkboxCenterY-checkmarkSVG.Ht*iconScale/2)
		pdf.SVGBasicWrite(&checkmarkSVG, iconScale)
	}
	writeDate(59, 74, 95, 133.7, data.LeaveDate)
	writeDate(147, 164.5, 180, 133.7, data.LeaveEndDate)
	write(43, 142.8, 22, fmt.Sprintf("%d", int(data.LeaveEndDate.Sub(data.LeaveDate).Hours()/24)+1))
	write(151, 142.8, 39, data.ContactPhone)
	write(43, 151.7, 112, data.Reason)
	write(18, 173.2, 150, data.AdditionalDetails)

	// The applicant-signature values are centered independently inside the
	// source template's parentheses and three date rules.
	pdf.SetFont("THSarabun", "", 10)
	signatureNameWidth := pdf.GetStringWidth(data.Name)
	pdf.Text(37-signatureNameWidth/2, 208.8, data.Name)
	pdf.Text(37-signatureNameWidth/2, 216.2, data.Name)
	writeDate(24.34, 41.02, 57.62, 225, data.SubmittedAt)

	// Images supplied with the leave request are included after the completed
	// leave form so managers receive one PDF containing the form and evidence.
	for index, attachment := range attachments {
		imageType := ""
		switch attachment.ContentType {
		case "image/jpeg":
			imageType = "JPG"
		case "image/png":
			imageType = "PNG"
		default:
			continue
		}
		imageName := fmt.Sprintf("leave-request-attachment-%d", index)
		info := pdf.RegisterImageOptionsReader(imageName, gofpdf.ImageOptions{ImageType: imageType, ReadDpi: false}, bytes.NewReader(attachment.Content))
		if info == nil || pdf.Err() {
			return nil, fmt.Errorf("read leave-request attachment %q: %w", attachment.Name, pdf.Error())
		}
		pdf.AddPage()
		pdf.SetFont("THSarabun", "", 14)
		pdf.Text(10, 12, "เอกสารแนบ: "+attachment.Name)
		maxWidth, maxHeight := 180.0, 245.0
		width, height := maxWidth, maxHeight
		if info.Width()/info.Height() > maxWidth/maxHeight {
			height = maxWidth * info.Height() / info.Width()
		} else {
			width = maxHeight * info.Width() / info.Height()
		}
		pdf.ImageOptions(imageName, (200.067-width)/2, 20+(245-height)/2, width, height, false, gofpdf.ImageOptions{ImageType: imageType, ReadDpi: false}, 0, "")
	}

	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

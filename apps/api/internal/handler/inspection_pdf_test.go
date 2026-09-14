package handler

import (
	"bytes"
	"os"
	"strings"
	"testing"
	"time"
)

func TestInspectionPDFCreatesThaiChecklistPDF(t *testing.T) {
	pdf, err := inspectionPDF(inspectionPDFData{
		ID: 1, BranchCode: "SBC-001", BranchName: "สาขาทดสอบ", InspectorName: "ช่างทดสอบ", Status: "scheduled",
		Checklist: technicianInspectionChecklist,
	})
	if err != nil || !bytes.HasPrefix(pdf, []byte("%PDF-")) {
		t.Fatalf("inspectionPDF() error=%v bytes=%d", err, len(pdf))
	}
	if !bytes.Contains(pdf, []byte("/Creator (pdfkit-go)")) {
		t.Fatal("inspectionPDF() must use the Thai text-shaping renderer")
	}
	if outputPath := os.Getenv("SBC_INSPECTION_PDF_PREVIEW"); outputPath != "" {
		if err := os.WriteFile(outputPath, pdf, 0o600); err != nil {
			t.Fatalf("write inspection PDF preview: %v", err)
		}
	}
}

func TestIngredientInspectionPDFCreatesSeparateWorkOrder(t *testing.T) {
	pdf, err := inspectionPDF(inspectionPDFData{
		ID: 2, BranchCode: "SBC-ING-001", BranchName: "สาขาทดสอบ", InspectorName: "ผู้ตรวจทดสอบ", Status: "scheduled",
		Checklist: ingredientInspectionChecklist,
	})
	if err != nil || !bytes.HasPrefix(pdf, []byte("%PDF-")) {
		t.Fatalf("ingredient inspectionPDF() error=%v bytes=%d", err, len(pdf))
	}
	if outputPath := os.Getenv("SBC_INGREDIENT_INSPECTION_PDF_PREVIEW"); outputPath != "" {
		if err := os.WriteFile(outputPath, pdf, 0o600); err != nil {
			t.Fatalf("write ingredient inspection PDF preview: %v", err)
		}
	}
}

func TestInspectionPDFDownloadFilenameIncludesWorkAndBranchIdentity(t *testing.T) {
	got := inspectionPDFDownloadFilename(inspectionPDFData{
		ID:         17,
		BranchName: "พิษณุโลก",
		BranchCode: "SBC-PLK-001",
	})
	const want = "ใบงานตรวจช่าง_งานที่-17_สาขา-พิษณุโลก_SBC-PLK-001.pdf"
	if got != want {
		t.Fatalf("filename = %q, want %q", got, want)
	}
}

func TestMaintenancePDFCreatesThaiRepairWorkOrder(t *testing.T) {
	pdf, err := maintenancePDF(maintenancePDFData{
		ID:             9,
		BranchCode:     "SBC-AYT-001",
		BranchName:     "อยุธยา",
		Title:          "เครื่องชงกาแฟมีน้ำรั่ว",
		Description:    "มีน้ำหยดใต้หัวชง",
		Priority:       "urgent",
		Status:         "open",
		TechnicianName: "ช่างทดสอบ",
		CreatedAt:      time.Now(),
	})
	if err != nil || !bytes.HasPrefix(pdf, []byte("%PDF-")) {
		t.Fatalf("maintenancePDF() error=%v bytes=%d", err, len(pdf))
	}
	if !bytes.Contains(pdf, []byte("/Creator (pdfkit-go)")) {
		t.Fatal("maintenancePDF() must use the Thai text-shaping renderer")
	}
	if outputPath := os.Getenv("SBC_MAINTENANCE_PDF_PREVIEW"); outputPath != "" {
		if err := os.WriteFile(outputPath, pdf, 0o600); err != nil {
			t.Fatalf("write maintenance PDF preview: %v", err)
		}
	}
}

func TestMaintenancePDFDownloadFilenameIncludesWorkAndBranchIdentity(t *testing.T) {
	got := maintenancePDFDownloadFilename(maintenancePDFData{
		ID:         9,
		BranchName: "อยุธยา",
		BranchCode: "SBC-AYT-001",
	})
	const want = "ใบงานแจ้งซ่อม_งานที่-9_สาขา-อยุธยา_SBC-AYT-001.pdf"
	if got != want {
		t.Fatalf("filename = %q, want %q", got, want)
	}
}

func TestTechnicianInspectionChecklistCoversAllServiceAreas(t *testing.T) {
	items := strings.Join(technicianInspectionChecklist, "\n")
	for _, area := range []string{"ร้านคาเฟ่:", "ตู้ชาร์จรถ EV:", "ห้องน้ำ:"} {
		if !strings.Contains(items, area) {
			t.Fatalf("technician checklist must include %q", area)
		}
	}
}

func TestTechnicianInspectionChecklistIncludesActionableChecks(t *testing.T) {
	groups := groupInspectionChecklist(technicianInspectionChecklist)
	minimumItems := map[string]int{
		"ร้านคาเฟ่:":     15,
		"ตู้ชาร์จรถ EV:": 10,
		"ห้องน้ำ:":       9,
	}
	for area, minimum := range minimumItems {
		if len(groups[area]) < minimum {
			t.Fatalf("%s must contain at least %d actionable checks, got %d", area, minimum, len(groups[area]))
		}
	}

	items := strings.Join(technicianInspectionChecklist, "\n")
	for _, expected := range []string{"ป้องกันไฟรั่ว", "ปุ่มหยุดฉุกเฉิน", "ระบบกดชำระล้าง", "ระบบรับชำระเงิน", "จุดเสี่ยงลื่นล้ม"} {
		if !strings.Contains(items, expected) {
			t.Fatalf("technician checklist must include %q", expected)
		}
	}
}

func TestGroupInspectionChecklistPlacesLegacyItemsInCafeSection(t *testing.T) {
	groups := groupInspectionChecklist([]string{
		"ความสะอาดพื้นที่บริการและหลังร้าน",
		"ตู้ชาร์จรถ EV: หัวชาร์จและสายชาร์จ",
	})
	if len(groups["ร้านคาเฟ่:"]) != 1 || groups["ร้านคาเฟ่:"][0] != "ความสะอาดพื้นที่บริการและหลังร้าน" {
		t.Fatalf("legacy item should be rendered under cafe: %#v", groups["ร้านคาเฟ่:"])
	}
	if len(groups["ตู้ชาร์จรถ EV:"]) != 1 {
		t.Fatalf("EV item should remain in EV section: %#v", groups["ตู้ชาร์จรถ EV:"])
	}
	if got := inspectionTypeFromChecklist(technicianInspectionChecklist); got != "technician" {
		t.Fatalf("technician checklist type = %q", got)
	}
}

func TestIngredientInspectionChecklistIsSeparateAndActionable(t *testing.T) {
	groups := groupInspectionChecklist(ingredientInspectionChecklist)
	if len(groups["วัตถุดิบ:"]) < 14 {
		t.Fatalf("ingredient checklist must contain at least 14 checks, got %d", len(groups["วัตถุดิบ:"]))
	}
	items := strings.Join(ingredientInspectionChecklist, "\n")
	for _, expected := range []string{"FIFO หรือ FEFO", "วัตถุดิบหมดอายุ", "อุณหภูมิตามมาตรฐาน", "สารเคมี"} {
		if !strings.Contains(items, expected) {
			t.Fatalf("ingredient checklist must include %q", expected)
		}
	}
	if got := inspectionTypeFromChecklist(ingredientInspectionChecklist); got != "ingredients" {
		t.Fatalf("ingredient checklist type = %q", got)
	}
	if got := inspectionPDFTitle(ingredientInspectionChecklist); got != "ใบงานสุ่มตรวจวัตถุดิบ" {
		t.Fatalf("ingredient PDF title = %q", got)
	}
}

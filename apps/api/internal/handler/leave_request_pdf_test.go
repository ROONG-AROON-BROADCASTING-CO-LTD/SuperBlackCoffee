package handler

import (
	"bytes"
	"testing"
	"time"
)

func TestLeaveRequestPDFCreatesPDFWithEmbeddedThaiFont(t *testing.T) {
	pdf, err := leaveRequestPDF(leaveRequestPDFData{
		ID:           7,
		SubmittedAt:  time.Date(2026, time.September, 9, 0, 0, 0, 0, thailandLocation),
		Name:         "พิมพ์ชนก แสงทอง",
		EmployeeCode: "staff-7",
		Position:     "cashier",
		BranchName:   "อยุธยา",
		LeaveType:    "vacation",
		LeaveDate:    time.Date(2026, time.September, 10, 0, 0, 0, 0, thailandLocation),
		LeaveEndDate: time.Date(2026, time.September, 12, 0, 0, 0, 0, thailandLocation),
		ContactPhone: "0812345678",
		Reason:       "พักผ่อน",
		Status:       "pending",
	})
	if err != nil {
		t.Fatalf("leaveRequestPDF() error = %v", err)
	}
	if !bytes.HasPrefix(pdf, []byte("%PDF-")) || len(pdf) < 10_000 {
		t.Fatalf("leaveRequestPDF() returned an invalid PDF (%d bytes)", len(pdf))
	}
}

func TestLeaveRequestPDFAppendsImageAttachments(t *testing.T) {
	pdf, err := leaveRequestPDF(leaveRequestPDFData{
		SubmittedAt: time.Date(2026, time.September, 9, 0, 0, 0, 0, thailandLocation),
		Name:        "พิมพ์ชนก แสงทอง", LeaveType: "sick",
		LeaveDate:    time.Date(2026, time.September, 10, 0, 0, 0, 0, thailandLocation),
		LeaveEndDate: time.Date(2026, time.September, 10, 0, 0, 0, 0, thailandLocation),
	}, leaveRequestPDFAttachment{Name: "evidence.png", ContentType: "image/png", Content: leaveRequestTemplateBackground})
	if err != nil {
		t.Fatalf("leaveRequestPDF() error = %v", err)
	}
	if pages := bytes.Count(pdf, []byte("/Type /Page")); pages < 2 {
		t.Fatalf("leaveRequestPDF() pages = %d, want at least 2", pages)
	}
}

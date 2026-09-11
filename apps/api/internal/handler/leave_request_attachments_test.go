package handler

import (
	"bytes"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReadLeaveRequestAttachmentsValidatesUploadBoundaries(t *testing.T) {
	validPDF := uploadHeader(t, "../../medical-note.pdf", []byte("%PDF-1.4\nleave evidence"))
	plainText := uploadHeader(t, "note.txt", []byte("not an approved attachment"))
	oversized := uploadHeader(t, "large.pdf", []byte("%PDF-1.4\nsmall content"))
	oversized.Size = 5<<20 + 1

	tests := []struct {
		name    string
		headers []*multipart.FileHeader
		wantErr string
	}{
		{
			name:    "accepts a PDF and stores only its base file name",
			headers: []*multipart.FileHeader{validPDF},
		},
		{
			name:    "rejects unsupported content even when a file is present",
			headers: []*multipart.FileHeader{plainText},
			wantErr: "รองรับเฉพาะไฟล์ JPG, PNG, WEBP และ PDF",
		},
		{
			name:    "rejects more than five attachments",
			headers: []*multipart.FileHeader{validPDF, validPDF, validPDF, validPDF, validPDF, validPDF},
			wantErr: "แนบเอกสารได้สูงสุด 5 ไฟล์",
		},
		{
			name:    "rejects an attachment larger than five megabytes",
			headers: []*multipart.FileHeader{oversized},
			wantErr: "ไฟล์แนบแต่ละไฟล์ต้องมีขนาดไม่เกิน 5 MB",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			attachments, err := readLeaveRequestAttachments(test.headers)
			if test.wantErr != "" {
				if err == nil || err.Error() != test.wantErr {
					t.Fatalf("error = %v, want %q", err, test.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("read attachments: %v", err)
			}
			if len(attachments) != 1 || attachments[0].name != "medical-note.pdf" || attachments[0].contentType != "application/pdf" {
				t.Fatalf("attachments = %#v, want sanitized PDF attachment", attachments)
			}
		})
	}
}

func uploadHeader(t *testing.T, name string, content []byte) *multipart.FileHeader {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("attachments", name)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close form: %v", err)
	}
	request := httptest.NewRequest("POST", "/", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	if err := request.ParseMultipartForm(int64(body.Len()) + 1); err != nil {
		t.Fatalf("parse form: %v", err)
	}
	headers := request.MultipartForm.File["attachments"]
	if len(headers) != 1 {
		t.Fatalf("attachment headers = %d, want 1", len(headers))
	}
	if strings.TrimSpace(headers[0].Filename) == "" {
		t.Fatal("attachment filename is missing")
	}
	return headers[0]
}

package handler

import (
	"bytes"
	"context"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type fakeCatalogImageStore struct {
	called      bool
	contentType string
	err         error
}

func (store *fakeCatalogImageStore) PutCatalogImage(_ context.Context, _ []byte, contentType string) (string, error) {
	store.called = true
	store.contentType = contentType
	return "https://images.example.test/catalog/coffee.jpg", store.err
}

func TestCatalogImageAuditHandlesStorageFailureAndUploadSizeBoundaries(t *testing.T) {
	for _, tc := range []struct {
		name          string
		size          int
		storeError    error
		missingStore  bool
		want          int
		wantStoreCall bool
	}{
		{name: "unconfigured object storage", size: 6, missingStore: true, want: 503},
		{name: "empty file rejected", want: 400},
		{name: "exact maximum accepted", size: maxCatalogImageSize, want: 201, wantStoreCall: true},
		{name: "one byte over maximum rejected before storage", size: maxCatalogImageSize + 1, want: 413},
		{name: "storage failure is not reported as uploaded", size: 6, storeError: errors.New("object storage unavailable"), want: 502, wantStoreCall: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			store := &fakeCatalogImageStore{err: tc.storeError}
			h := &PlatformHandler{images: store}
			if tc.missingStore {
				h.images = nil
			}
			content := make([]byte, tc.size)
			copy(content, []byte{0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43})
			res := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(res)
			c.Request = multipartImageRequest(t, "image", "audit.jpg", content)
			h.UploadCatalogImage(c)
			if res.Code != tc.want || store.called != tc.wantStoreCall {
				t.Fatalf("status=%d called=%v want=%d,%v: %s", res.Code, store.called, tc.want, tc.wantStoreCall, res.Body.String())
			}
			if tc.want == 201 && !bytes.Contains(res.Body.Bytes(), []byte("https://images.example.test/catalog/coffee.jpg")) {
				t.Fatal("missing uploaded URL")
			}
			if tc.want != 201 && bytes.Contains(res.Body.Bytes(), []byte(`"success":true`)) {
				t.Fatal("failure reported success")
			}
		})
	}
}

func TestUploadCatalogImageStoresSupportedImage(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := &fakeCatalogImageStore{}
	handler := &PlatformHandler{images: store}
	request := multipartImageRequest(t, "image", "coffee.jpg", []byte{0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43})
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request

	handler.UploadCatalogImage(context)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if !store.called || store.contentType != "image/jpeg" {
		t.Fatalf("store called=%t content type=%q", store.called, store.contentType)
	}
}

func TestUploadCatalogImageRejectsUnsupportedFile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := &fakeCatalogImageStore{}
	handler := &PlatformHandler{images: store}
	request := multipartImageRequest(t, "image", "notes.txt", []byte("not an image"))
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request

	handler.UploadCatalogImage(context)

	if recorder.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if store.called {
		t.Fatal("unsupported file must not reach object storage")
	}
}

func multipartImageRequest(t *testing.T, fieldName, fileName string, content []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/catalog-images", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	return request
}

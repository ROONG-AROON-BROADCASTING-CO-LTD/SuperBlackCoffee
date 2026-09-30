package handler

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type fakeCatalogImageStore struct {
	called      bool
	contentType string
}

func (store *fakeCatalogImageStore) PutCatalogImage(_ context.Context, _ []byte, contentType string) (string, error) {
	store.called = true
	store.contentType = contentType
	return "https://images.example.test/catalog/coffee.jpg", nil
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

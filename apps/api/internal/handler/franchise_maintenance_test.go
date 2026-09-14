package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestFranchiseMaintenanceScopeRequiresSessionBranchAndFranchise(t *testing.T) {
	gin.SetMode(gin.TestMode)
	branchID, franchiseID := int64(12), int64(4)
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request
	context.Set("claims", &middleware.Claims{
		Role:         "franchise_owner",
		BranchID:     &branchID,
		FranchiseeID: &franchiseID,
	})

	gotBranchID, gotFranchiseID, ok := (&PlatformHandler{}).franchiseMaintenanceScope(context)
	if !ok || gotBranchID != branchID || gotFranchiseID != franchiseID {
		t.Fatalf("scope = (%d, %d, %t), want (%d, %d, true)", gotBranchID, gotFranchiseID, ok, branchID, franchiseID)
	}
}

func TestCreateFranchiseMaintenanceTicketRejectsInvalidDueDate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(
		http.MethodPost,
		"/franchise/maintenance-tickets",
		bytes.NewBufferString(`{"title":"ตู้เย็นไม่เย็น","priority":"normal","dueAt":"tomorrow"}`),
	)
	context.Request.Header.Set("Content-Type", "application/json")

	(&PlatformHandler{}).CreateFranchiseMaintenanceTicket(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestDownloadMaintenancePDFRejectsInvalidWorkOrderID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/maintenance-tickets/nope/pdf", nil)
	context.Params = gin.Params{{Key: "id", Value: "nope"}}

	(&PlatformHandler{}).DownloadMaintenancePDF(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestFranchiseMaintenanceScopeRejectsIncompleteSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	context.Set("claims", &middleware.Claims{Role: "franchise_owner"})

	_, _, ok := (&PlatformHandler{}).franchiseMaintenanceScope(context)
	if ok {
		t.Fatal("scope unexpectedly accepted a session without branch ownership")
	}
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusForbidden)
	}
}

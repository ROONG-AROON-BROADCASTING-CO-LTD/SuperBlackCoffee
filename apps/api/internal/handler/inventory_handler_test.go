package handler

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"y/internal/dto"
	"y/internal/model"
)

func TestInventoryInputPreservesSharedCatalogMetadata(t *testing.T) {
	expiryDate := time.Date(2026, time.December, 31, 0, 0, 0, 0, time.UTC)
	item := inventoryItemFromInput(dto.InventoryRequest{
		Name:          "เมล็ดกาแฟ",
		Category:      "coffee",
		Kind:          "stock",
		StockCategory: "postal_equipment",
		Quantity:      3,
		Unit:          "ถุง",
		ReorderLevel:  1,
		UnitCost:      120,
		ImageURL:      "data:image/png;base64,test-image",
	}, &expiryDate)

	if item.Kind != model.InventoryKindStock || item.StockCategory != "postal_equipment" {
		t.Fatalf("stock metadata = kind %q, category %q", item.Kind, item.StockCategory)
	}
	if item.ImageURL != "data:image/png;base64,test-image" {
		t.Fatalf("image URL was lost: %q", item.ImageURL)
	}
	if item.ExpiryDate == nil || !item.ExpiryDate.Equal(expiryDate) {
		t.Fatalf("expiry date = %v, want %v", item.ExpiryDate, expiryDate)
	}
}

func TestInventoryDeleteErrorExplainsReferencedItems(t *testing.T) {
	status, message := inventoryDeleteError(&pgconn.PgError{Code: "23503"})
	if status != http.StatusConflict {
		t.Fatalf("status = %d, want %d", status, http.StatusConflict)
	}
	if message != "ลบไม่ได้ เพราะวัตถุดิบนี้ถูกใช้งานอยู่ในสูตรหรือประวัติสต๊อก" {
		t.Fatalf("message = %q", message)
	}

	status, message = inventoryDeleteError(errors.New("connection failed"))
	if status != http.StatusInternalServerError || message != "ไม่สามารถลบรายการสต๊อกได้" {
		t.Fatalf("unexpected generic error result: %d, %q", status, message)
	}
}

func TestInventoryInputDefaultsAndValidatesExpiryDate(t *testing.T) {
	item := inventoryItemFromInput(dto.InventoryRequest{
		Name: "นมสด",
		Unit: "ml.",
	}, nil)
	if item.Kind != model.InventoryKindIngredient || item.StockCategory != "" {
		t.Fatalf("ingredient defaults = kind %q, category %q", item.Kind, item.StockCategory)
	}

	emptyDate := "  "
	if got, err := expiryDateFromInput(dto.InventoryRequest{ExpiryDate: &emptyDate}); err != nil || got != nil {
		t.Fatalf("blank expiry date = %v, %v; want nil, nil", got, err)
	}
	invalidDate := "2026/12/31"
	if _, err := expiryDateFromInput(dto.InventoryRequest{ExpiryDate: &invalidDate}); err == nil {
		t.Fatal("invalid expiry date was accepted")
	}
}

func TestInventoryInputPreservesExplicitCostOnlyTracking(t *testing.T) {
	trackStock := false
	expiryDate := time.Date(2026, time.December, 31, 0, 0, 0, 0, time.UTC)
	item := inventoryItemFromInput(dto.InventoryRequest{
		Name:       "น้ำสกัดกาแฟ",
		Unit:       "ml",
		TrackStock: &trackStock,
	}, &expiryDate)

	if item.IsStockTracked() {
		t.Fatal("explicit cost-only input must not be treated as stock-tracked")
	}
	if item.TrackStock == nil || *item.TrackStock {
		t.Fatalf("trackStock = %#v, want false", item.TrackStock)
	}
}

func TestApplyCatalogTrackingClearsBranchStockStateForCostOnlyItems(t *testing.T) {
	expiryDate := time.Date(2026, time.December, 31, 0, 0, 0, 0, time.UTC)
	item := model.InventoryItem{
		Quantity:     2400,
		ReorderLevel: 500,
		ExpiryDate:   &expiryDate,
	}

	applyCatalogTracking(&item, false)

	if item.Quantity != 0 || item.ReorderLevel != 0 || item.ExpiryDate != nil {
		t.Fatalf("cost-only item kept stock state: %#v", item)
	}
}

func TestApplyCatalogTrackingKeepsTrackedBranchStockState(t *testing.T) {
	expiryDate := time.Date(2026, time.December, 31, 0, 0, 0, 0, time.UTC)
	item := model.InventoryItem{
		Quantity:     2400,
		ReorderLevel: 500,
		ExpiryDate:   &expiryDate,
	}

	applyCatalogTracking(&item, true)

	if item.Quantity != 2400 || item.ReorderLevel != 500 || item.ExpiryDate == nil {
		t.Fatalf("tracked item lost stock state: %#v", item)
	}
}

package handler

import (
	"testing"
	"time"

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

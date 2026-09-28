package handler

import (
	"testing"
	"time"

	"y/internal/dto"
)

func dateString(value string) *string {
	return &value
}

func TestStockAdjustmentDatesUsesNewDatesAndRejectsInvalidOrder(t *testing.T) {
	currentManufacturedAt := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	currentExpiryDate := time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC)

	manufacturedAt, expiryDate, provided, err := stockAdjustmentDates(
		&currentManufacturedAt,
		&currentExpiryDate,
		dto.StockAdjustmentRequest{
			ManufacturedAt: dateString("2026-09-10"),
			ExpiryDate:     dateString("2026-10-10"),
		},
	)
	if err != nil || !provided {
		t.Fatalf("valid dates = (%v, %v), want no error and provided", err, provided)
	}
	if manufacturedAt == nil || manufacturedAt.Format("2006-01-02") != "2026-09-10" {
		t.Fatalf("manufactured date = %v", manufacturedAt)
	}
	if expiryDate == nil || expiryDate.Format("2006-01-02") != "2026-10-10" {
		t.Fatalf("expiry date = %v", expiryDate)
	}

	_, _, _, err = stockAdjustmentDates(nil, nil, dto.StockAdjustmentRequest{
		ManufacturedAt: dateString("2026-10-10"),
		ExpiryDate:     dateString("2026-09-10"),
	})
	if err == nil {
		t.Fatal("accepted an expiry date before its production date")
	}
}

func TestStockAdjustmentDatesSupportsClearingOnlyTheProvidedDate(t *testing.T) {
	currentManufacturedAt := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	currentExpiryDate := time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC)
	blank := " "

	manufacturedAt, expiryDate, provided, err := stockAdjustmentDates(
		&currentManufacturedAt,
		&currentExpiryDate,
		dto.StockAdjustmentRequest{ExpiryDate: &blank},
	)
	if err != nil || !provided {
		t.Fatalf("clearing an expiry date = (%v, %v), want no error and provided", err, provided)
	}
	if manufacturedAt == nil || !manufacturedAt.Equal(currentManufacturedAt) {
		t.Fatalf("manufactured date = %v, want existing value", manufacturedAt)
	}
	if expiryDate != nil {
		t.Fatalf("expiry date = %v, want nil", expiryDate)
	}
}

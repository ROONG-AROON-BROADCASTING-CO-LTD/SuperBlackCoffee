package repository

import (
	"testing"
	"time"
)

func TestInventoryExpiryStatusBoundaries(t *testing.T) {
	now := time.Date(2026, time.September, 12, 15, 30, 0, 0, time.FixedZone("Asia/Bangkok", 7*60*60))

	tests := []struct {
		name       string
		expiryDate *time.Time
		want       string
	}{
		{name: "missing expiry date", expiryDate: nil, want: "none"},
		{name: "date before today is expired", expiryDate: datePointer(time.Date(2026, time.September, 11, 23, 59, 0, 0, time.UTC)), want: "expired"},
		{name: "today is expiring soon", expiryDate: datePointer(time.Date(2026, time.September, 12, 23, 59, 0, 0, time.UTC)), want: "expiring_soon"},
		{name: "seven days away is expiring soon", expiryDate: datePointer(time.Date(2026, time.September, 19, 0, 0, 0, 0, time.UTC)), want: "expiring_soon"},
		{name: "more than seven days away is not expiring soon", expiryDate: datePointer(time.Date(2026, time.September, 20, 0, 0, 0, 0, time.UTC)), want: "none"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := inventoryExpiryStatus(test.expiryDate, now); got != test.want {
				t.Fatalf("inventoryExpiryStatus() = %q, want %q", got, test.want)
			}
		})
	}
}

func datePointer(value time.Time) *time.Time { return &value }

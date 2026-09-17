package handler

import (
	"testing"
	"time"
)

func TestFreshLotExpiryStatusBoundaries(t *testing.T) {
	now := time.Date(2026, time.September, 17, 18, 30, 0, 0, time.FixedZone("ICT", 7*60*60))

	tests := []struct {
		name       string
		expiryDate time.Time
		want       string
	}{
		{"expired before today", time.Date(2026, time.September, 16, 0, 0, 0, 0, time.UTC), "expired"},
		{"expires today", time.Date(2026, time.September, 17, 0, 0, 0, 0, time.UTC), "expiring_soon"},
		{"three-day warning boundary", time.Date(2026, time.September, 20, 0, 0, 0, 0, time.UTC), "expiring_soon"},
		{"after warning window", time.Date(2026, time.September, 21, 0, 0, 0, 0, time.UTC), "ready"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := freshLotExpiryStatus(tt.expiryDate, now); got != tt.want {
				t.Fatalf("freshLotExpiryStatus(%s) = %q, want %q", tt.expiryDate, got, tt.want)
			}
		})
	}
}

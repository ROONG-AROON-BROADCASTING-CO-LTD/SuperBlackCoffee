package handler

import (
	"testing"
	"time"
)

func TestExpiryStatusForConfiguredWarningDays(t *testing.T) {
	now := time.Date(2026, time.September, 17, 18, 30, 0, 0, time.FixedZone("ICT", 7*60*60))

	tests := []struct {
		name        string
		expiryDate  time.Time
		warningDays int
		want        string
	}{
		{"expired", time.Date(2026, time.September, 16, 0, 0, 0, 0, time.UTC), 60, "expired"},
		{"default warning boundary", time.Date(2026, time.November, 16, 0, 0, 0, 0, time.UTC), 60, "expiring_soon"},
		{"after default warning boundary", time.Date(2026, time.November, 17, 0, 0, 0, 0, time.UTC), 60, "ready"},
		{"custom warning boundary", time.Date(2026, time.October, 1, 0, 0, 0, 0, time.UTC), 14, "expiring_soon"},
		{"after custom warning boundary", time.Date(2026, time.October, 2, 0, 0, 0, 0, time.UTC), 14, "ready"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := expiryStatusForDays(tt.expiryDate, now, tt.warningDays); got != tt.want {
				t.Fatalf("expiryStatusForDays(%s, %d) = %q, want %q", tt.expiryDate, tt.warningDays, got, tt.want)
			}
		})
	}
}

func TestNormalizeExpiryWarningDays(t *testing.T) {
	if got := normalizeExpiryWarningDays(0); got != defaultExpiryWarningDays {
		t.Fatalf("normalizeExpiryWarningDays(0) = %d, want %d", got, defaultExpiryWarningDays)
	}
	if got := normalizeExpiryWarningDays(45); got != 45 {
		t.Fatalf("normalizeExpiryWarningDays(45) = %d, want 45", got)
	}
}

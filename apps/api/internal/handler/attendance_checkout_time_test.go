package handler

import (
	"testing"
	"time"
)

func TestScheduledCheckoutAt(t *testing.T) {
	tests := []struct {
		name      string
		workDate  string
		startsAt  string
		endsAt    string
		expected  time.Time
		wantError bool
	}{
		{
			name:     "same-day shift",
			workDate: "2026-09-29",
			startsAt: "09:00",
			endsAt:   "18:00",
			expected: time.Date(2026, 9, 29, 18, 0, 0, 0, thailandLocation),
		},
		{
			name:     "overnight shift",
			workDate: "2026-09-29",
			startsAt: "22:00",
			endsAt:   "06:00",
			expected: time.Date(2026, 9, 30, 6, 0, 0, 0, thailandLocation),
		},
		{
			name:      "invalid schedule time",
			workDate:  "2026-09-29",
			startsAt:  "09:00",
			endsAt:    "invalid",
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual, err := scheduledCheckoutAt(tt.workDate, tt.startsAt, tt.endsAt)
			if tt.wantError {
				if err == nil {
					t.Fatal("expected an error")
				}
				return
			}
			if err != nil {
				t.Fatalf("scheduledCheckoutAt returned error: %v", err)
			}
			if !actual.Equal(tt.expected) {
				t.Fatalf("checkout time = %s, want %s", actual, tt.expected)
			}
		})
	}
}

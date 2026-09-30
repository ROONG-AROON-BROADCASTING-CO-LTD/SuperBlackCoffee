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
			name:     "equal start and end clocks finish next day",
			workDate: "2026-12-31",
			startsAt: "00:00",
			endsAt:   "00:00",
			expected: time.Date(2027, 1, 1, 0, 0, 0, 0, thailandLocation),
		},
		{
			name:     "overnight shift crosses month boundary with seconds",
			workDate: "2028-02-29",
			startsAt: "23:59:59",
			endsAt:   "00:00:01",
			expected: time.Date(2028, 3, 1, 0, 0, 1, 0, thailandLocation),
		},
		{
			name:     "later second in the same minute is same-day checkout",
			workDate: "2026-09-29",
			startsAt: "09:00:20",
			endsAt:   "09:00:30",
			expected: time.Date(2026, 9, 29, 9, 0, 30, 0, thailandLocation),
		},
		{
			name:      "invalid work date",
			workDate:  "2026-02-30",
			startsAt:  "09:00",
			endsAt:    "18:00",
			wantError: true,
		},
		{
			name:      "invalid start clock",
			workDate:  "2026-09-29",
			startsAt:  "24:00",
			endsAt:    "06:00",
			wantError: true,
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

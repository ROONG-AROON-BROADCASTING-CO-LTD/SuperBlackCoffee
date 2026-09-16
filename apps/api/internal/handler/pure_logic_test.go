package handler

import "testing"

func TestCanRecordAttendance(t *testing.T) {
	tests := []struct {
		name        string
		shiftStatus string
		want        bool
	}{
		{name: "scheduled shift can record", shiftStatus: "scheduled", want: true},
		{name: "compensatory work shift can record", shiftStatus: "compensatory_work", want: true},
		{name: "day off cannot record", shiftStatus: "day_off", want: false},
		{name: "leave cannot record", shiftStatus: "leave", want: false},
		{name: "missing shift cannot record", shiftStatus: "", want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := canRecordAttendance(test.shiftStatus); got != test.want {
				t.Fatalf("canRecordAttendance(%q) = %v, want %v", test.shiftStatus, got, test.want)
			}
		})
	}
}

func TestSecondShiftDayValidationAndFormatting(t *testing.T) {
	tests := []struct {
		name      string
		days      []int
		wantValid bool
		wantValue string
	}{
		{name: "no second shift days is valid", days: nil, wantValid: true, wantValue: "{}"},
		{name: "one valid weekday", days: []int{1}, wantValid: true, wantValue: "{1}"},
		{name: "multiple valid weekdays preserve order", days: []int{7, 3, 5}, wantValid: true, wantValue: "{7,3,5}"},
		{name: "zero is outside ISO weekday range", days: []int{0}, wantValid: false, wantValue: "{0}"},
		{name: "eight is outside ISO weekday range", days: []int{8}, wantValid: false, wantValue: "{8}"},
		{name: "duplicate weekdays are invalid", days: []int{2, 2}, wantValid: false, wantValue: "{2,2}"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := validSecondShiftDays(test.days); got != test.wantValid {
				t.Fatalf("validSecondShiftDays(%v) = %v, want %v", test.days, got, test.wantValid)
			}
			if got := secondShiftDaysValue(test.days); got != test.wantValue {
				t.Fatalf("secondShiftDaysValue(%v) = %q, want %q", test.days, got, test.wantValue)
			}
		})
	}
}

func TestFreshLotDateRequiresCalendarDate(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "accepts leap day", input: "2028-02-29", want: "2028-02-29"},
		{name: "trims whitespace", input: " 2026-09-16 ", want: "2026-09-16"},
		{name: "rejects impossible leap day", input: "2027-02-29", wantErr: true},
		{name: "rejects timestamp instead of date", input: "2026-09-16T08:00:00Z", wantErr: true},
		{name: "rejects empty value", input: "", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := freshLotDate(test.input)
			if test.wantErr {
				if err == nil {
					t.Fatalf("freshLotDate(%q) succeeded, want error", test.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("freshLotDate(%q) returned error: %v", test.input, err)
			}
			if value := got.Format("2006-01-02"); value != test.want {
				t.Fatalf("freshLotDate(%q) = %q, want %q", test.input, value, test.want)
			}
		})
	}
}

func TestMenuAllowedForPlan(t *testing.T) {
	tests := []struct {
		name     string
		plan     string
		category string
		want     bool
	}{
		{name: "size S allows beverages", plan: franchisePlanS, category: "เมนูกาแฟเย็น", want: true},
		{name: "size S blocks Thai food", plan: franchisePlanS, category: " อาหาร ", want: false},
		{name: "size S blocks English food", plan: franchisePlanS, category: "FoOd", want: false},
		{name: "size S blocks English bakery", plan: franchisePlanS, category: "BAKERY", want: false},
		{name: "size M allows food", plan: franchisePlanM, category: "อาหาร", want: true},
		{name: "size L allows bakery", plan: franchisePlanL, category: "เบเกอรี่", want: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := menuAllowedForPlan(test.plan, test.category); got != test.want {
				t.Fatalf("menuAllowedForPlan(%q, %q) = %v, want %v", test.plan, test.category, got, test.want)
			}
		})
	}
}

func TestDashboardTrendConfigSupportsOnlyKnownPeriods(t *testing.T) {
	tests := []struct {
		period      string
		wantOK      bool
		wantBuckets int
		wantUnit    string
	}{
		{period: "day", wantOK: true, wantBuckets: 7, wantUnit: "day"},
		{period: "month", wantOK: true, wantBuckets: 12, wantUnit: "month"},
		{period: "year", wantOK: true, wantBuckets: 5, wantUnit: "year"},
		{period: "week", wantOK: false},
		{period: "", wantOK: false},
	}

	for _, test := range tests {
		t.Run(test.period, func(t *testing.T) {
			got, ok := dashboardTrendConfig(test.period)
			if ok != test.wantOK {
				t.Fatalf("dashboardTrendConfig(%q) ok = %v, want %v", test.period, ok, test.wantOK)
			}
			if !ok {
				return
			}
			if got.buckets != test.wantBuckets || got.unit != test.wantUnit {
				t.Fatalf("dashboardTrendConfig(%q) = (%d buckets, %q), want (%d buckets, %q)", test.period, got.buckets, got.unit, test.wantBuckets, test.wantUnit)
			}
		})
	}
}

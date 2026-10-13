package handler

import "testing"

func TestCustomDaysOffRejectsInvalidDatesAndDuplicates(t *testing.T) {
	tests := []struct {
		name  string
		days  []string
		want  string
		valid bool
	}{
		{"no explicit days", nil, "{}", true},
		{"leap day and year boundary", []string{"2024-02-29", "2026-12-31", "2027-01-01"}, "{2024-02-29,2026-12-31,2027-01-01}", true},
		{"non leap year", []string{"2026-02-29"}, "", false},
		{"duplicate day", []string{"2026-12-31", "2026-12-31"}, "", false},
		{"invalid month day", []string{"2026-04-31"}, "", false},
		{"noncanonical date", []string{"2026-1-01"}, "", false},
		{"date with whitespace", []string{" 2026-01-01"}, "", false},
		{"SQL array injection", []string{"2026-01-01},bad"}, "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, valid := customDaysOffValue(tt.days)
			if valid != tt.valid || got != tt.want {
				t.Fatalf("days=%v got=%q valid=%v; want %q valid=%v", tt.days, got, valid, tt.want, tt.valid)
			}
		})
	}
}

func TestStaffPolicyAndDepartmentAllowOnlySupportedBusinessValues(t *testing.T) {
	for _, policy := range []string{"automatic", "home_branch", "work_branch", "custom"} {
		got, valid := normalizedDayOffPolicy(policy)
		if !valid || got != policy {
			t.Fatalf("valid policy %q rejected", policy)
		}
	}
	if got, ok := normalizedDayOffPolicy(""); !ok || got != "automatic" {
		t.Fatalf("default policy %q %v", got, ok)
	}
	for _, policy := range []string{"CUSTOM", "invalid", " custom "} {
		if _, ok := normalizedDayOffPolicy(policy); ok {
			t.Fatalf("invalid policy %q accepted", policy)
		}
	}
	for _, department := range []string{"cafe", "postal"} {
		got, valid := normalizedStaffDepartment(department)
		if !valid || got != department {
			t.Fatalf("valid department %q rejected", department)
		}
	}
	if got, ok := normalizedStaffDepartment(""); !ok || got != "cafe" {
		t.Fatalf("default department %q %v", got, ok)
	}
	if _, ok := normalizedStaffDepartment("finance"); ok {
		t.Fatal("unsupported department accepted")
	}
}
